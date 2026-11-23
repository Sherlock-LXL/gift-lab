import { afterEach, describe, expect, it, vi } from 'vitest';
import { bank, choose, giftById, makePlan, newSession, pairById, progress, rate, STORAGE_KEY, summarize } from '../src/engine';
import { exportJSON, loadSession, saveSession, shareFile, validateSession } from '../src/storage';
import { completedFixture } from './fixtures';

afterEach(() => vi.unstubAllGlobals());

describe('question design and frozen sampling', () => {
  it('has 112 concrete candidates, 16 per original category', () => {
    const candidates = bank.gifts.filter(g => g.role === 'rating');
    expect(candidates).toHaveLength(112);
    expect(new Set(bank.gifts.map(g => g.id)).size).toBe(bank.gifts.length);
    for (const c of bank.categories) expect(candidates.filter(g => g.category === c)).toHaveLength(16);
    for (const g of bank.gifts) {
      expect(g.description.length).toBeGreaterThan(5);
      expect(g.price_cny[0]).toBeLessThanOrEqual(g.price_cny[1]);
      expect(g.family_id).toBeTruthy();
    }
  });

  it('preserves all sampling and family constraints over 500 seeds', () => {
    let originalLeft = 0;
    for (let seed = 0; seed < 500; seed++) {
      const plan = makePlan(seed, '2026-01-01T00:00:00.000Z');
      const gifts = plan.ratings.map(r => giftById.get(r.gift_id)!);
      const held = plan.ratings.filter(r => r.split === 'holdout').map(r => giftById.get(r.gift_id)!);
      const heldFamilies = new Set(held.map(g => g.family_id));
      expect(new Set(gifts.map(g => g.id)).size).toBe(24);
      expect(held).toHaveLength(4);
      expect(new Set(held.map(g => g.category)).size).toBe(4);
      expect(gifts.filter(g => g.audience === 'general')).toHaveLength(19);
      expect(gifts.filter(g => g.audience === 'personalized')).toHaveLength(5);
      for (const c of bank.categories) {
        expect(gifts.filter(g => g.category === c).length).toBeGreaterThanOrEqual(3);
        expect(gifts.filter(g => g.category === c).length).toBeLessThanOrEqual(4);
      }
      expect(gifts.some(g => g.function_tags.includes('纪念'))).toBe(true);
      expect(gifts.some(g => (g.price_cny[0]+g.price_cny[1])/2 >= 300)).toBe(true);
      expect(gifts.some(g => (g.price_cny[0]+g.price_cny[1])/2 <= 60)).toBe(true);
      expect(new Set(gifts.map(g => g.use_frequency)).size).toBe(2);
      for (let i = 1; i < gifts.length; i++) expect(gifts[i].category).not.toBe(gifts[i - 1].category);
      const pairs = plan.pairs.map(p => pairById.get(p.pair_id)!);
      expect(new Set(pairs.map(p => p.id)).size).toBe(30);
      expect(pairs.filter(p => p.comparison_type === 'controlled')).toHaveLength(18);
      expect(pairs.filter(p => p.comparison_type === 'tradeoff')).toHaveLength(8);
      expect(pairs.filter(p => p.comparison_type === 'consistency')).toHaveLength(4);
      expect(pairs.filter(p => p.audience === 'personalized')).toHaveLength(6);
      for (const [i, p] of pairs.entries()) {
        if (p.consistency_of) expect(i - pairs.findIndex(a => a.id === p.consistency_of)).toBeGreaterThanOrEqual(4);
        for (const id of p.gift_ids) expect(heldFamilies.has(giftById.get(id)!.family_id)).toBe(false);
      }
      for (const r of plan.ratings.filter(r => r.split === 'train'))
        expect(heldFamilies.has(giftById.get(r.gift_id)!.family_id)).toBe(false);
      originalLeft += plan.pairs.filter(p => p.left_gift_id === pairById.get(p.pair_id)!.gift_ids[0]).length;
    }
    expect(originalLeft / 15000).toBeGreaterThan(.47);
    expect(originalLeft / 15000).toBeLessThan(.53);
  });

  it('controls price/category/use and documents confounds in each control', () => {
    for (const p of bank.pairs) {
      const [a, b] = p.gift_ids.map(id => giftById.get(id)!);
      expect(p.tested_factors.length).toBeGreaterThan(0);
      expect(p.changed_variables).toEqual(expect.arrayContaining(p.tested_factors));
      if (p.comparison_type === 'controlled') {
        expect(a.category).toBe(b.category);
        expect(a.price_cny).toEqual(b.price_cny);
        expect(a.function_tags).toEqual(b.function_tags);
      }
      if (p.comparison_type === 'tradeoff') expect(p.confounds.length).toBeGreaterThan(0);
    }
  });

});

describe('raw answers and isolation', () => {
  it('starts unanswered and keeps zero distinct from all null statuses', () => {
    let s = newSession(42);
    expect(s.gift_ratings).toEqual([]);
    expect(progress(s)).toBe(0);
    s = rate(s, 0, 0, 'rated');
    s = rate(s, 1, null, 'uncertain');
    s = rate(s, 2, null, 'unfamiliar');
    s = rate(s, 3, null, 'skipped');
    expect(s.gift_ratings.map(a => [a.rating, a.skipped])).toEqual([[0, false], [null, false], [null, false], [null, true]]);
    expect(() => validateSession(s)).not.toThrow();
    expect(progress(s)).toBe(10); // only four actual answered slots, no invented completion
  });

  it('revises without duplicating answers, and preserves all 61 answers in JSON', () => {
    let s = completedFixture();
    s = rate(s, 0, 10, 'rated', ['useful']);
    s = choose(s, 0, 'right');
    const restored = JSON.parse(exportJSON(s));
    expect(restored).toEqual(s);
    expect(s.gift_ratings).toHaveLength(24);
    expect(s.pairwise_choices).toHaveLength(30);
    expect(s.gift_ratings[0].rating).toBe(10);
    expect(s.gift_ratings[0].reason_tags).toEqual(['useful']);
    expect(s.pairwise_choices[0].chosen).toBe('right');
    expect(progress(s)).toBe(100);
  });

  it('changing holdout labels never changes the profile or frozen plan', () => {
    const original = completedFixture(7);
    const changed = structuredClone(original);
    changed.gift_ratings.filter(r => r.split === 'holdout').forEach(r => {
      r.rating = r.rating === 10 ? 0 : 10; r.status = 'rated'; r.skipped = false; r.reason_tags = ['cute'];
    });
    expect(summarize(changed)).toEqual(summarize(original));
    expect(changed.plan).toEqual(original.plan);
    expect(JSON.parse(exportJSON(changed)).gift_ratings.filter((r: {split: string}) => r.split === 'holdout')).toHaveLength(4);
  });

  it.each(['split', 'score', 'order', 'metadata', 'missing', 'duplicate', 'factor', 'preference'])('rejects tampered %s', kind => {
    const s = completedFixture();
    switch (kind) {
      case 'split': s.gift_ratings[0].split = s.gift_ratings[0].split === 'train' ? 'holdout' : 'train'; break;
      case 'score': s.gift_ratings[0].rating = 11; break;
      case 'order': s.pairwise_choices[0].actual_display_order.reverse(); break;
      case 'metadata': s.gift_metadata[0].name = 'replaced'; break;
      case 'missing': s.gift_ratings.pop(); break;
      case 'duplicate': s.gift_ratings[1] = s.gift_ratings[0]; break;
      case 'factor': s.pairwise_choices[0].tested_factors = ['made_up']; break;
      case 'preference': s.preferences.styles.positive = ['可可爱爱']; break;
    }
    expect(() => validateSession(s)).toThrow();
  });
});

describe('local persistence and native share', () => {
  it('resumes and reports corrupt/unavailable storage without deleting answers', () => {
    const items = new Map<string, string>();
    vi.stubGlobal('localStorage', {getItem: (k: string) => items.get(k) || null, setItem: (k: string, v: string) => items.set(k, v)});
    const s = completedFixture();
    expect(saveSession(s)).toBe(true);
    expect(loadSession().session).toEqual(s);
    items.set(STORAGE_KEY, 'broken');
    expect(loadSession().error).toBeTruthy();
    expect(items.get(STORAGE_KEY)).toBe('broken');
    vi.stubGlobal('localStorage', {getItem: () => {throw Error('denied');}, setItem: () => {throw Error('quota');}});
    expect(saveSession(s)).toBe(false);
    expect(loadSession().error).toBeTruthy();
  });

  it('shares exactly the JSON file only when supported, with cancellation distinguished', async () => {
    const s = completedFixture();
    const share = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', {canShare: () => true, share});
    expect(await shareFile(s)).toBe('shared');
    const file = share.mock.calls[0][0].files[0] as File;
    expect(JSON.parse(await file.text())).toEqual(s);
    vi.stubGlobal('navigator', {canShare: () => false, share});
    expect(await shareFile(s)).toBe('fallback');
    expect(share).toHaveBeenCalledTimes(1);
    vi.stubGlobal('navigator', {canShare: () => true, share: () => Promise.reject(new DOMException('cancel', 'AbortError'))});
    expect(await shareFile(s)).toBe('cancelled');
  });
});
