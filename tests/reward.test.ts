import { afterEach, expect, it, vi } from 'vitest';
import {
  bestPrize, clearRewards, loadReward, newReward, outcomeAtPointer, parseReward, remainingChances,
  resumeReward, rewardKey, saveReward, script, sectors, settleSpin, startSpin, targetRotation,
} from '../src/rewardMachine';
import { exportJSON } from '../src/storage';
import { completedFixture } from './fixtures';

afterEach(() => vi.unstubAllGlobals());

it('plays exactly four fixed outcomes, consuming three formal chances and keeping only the best', () => {
  const random = vi.spyOn(Math, 'random').mockImplementation(() => {throw Error('no random rewards');});
  try {
    let state = newReward('test');
    const outcomes = ['meal_fund', 'extra_spin', 'no_prize', 'earbuds_grand_prize'];
    expect(remainingChances(state)).toBe(3);
    for (let step = 0; step < 4; step++) {
      state = startSpin(state, 10000 + step * 10000);
      expect(remainingChances(state)).toBe([2, 1, 1, 0][step]);
      const pending = state.pending!;
      state = settleSpin(state, step, pending.started_at + pending.duration);
      expect(outcomeAtPointer(state.rotation)).toBe(outcomes[step]);
      expect(state.formal_results).toHaveLength([1, 1, 2, 3][step]);
      expect(remainingChances(state)).toBe([2, 1, 1, 0][step]);
      if (step === 2) expect(bestPrize(state.formal_results)).toBe('meal_fund');
    }
    expect(state.formal_results).toEqual(['meal_fund', 'no_prize', 'earbuds_grand_prize']);
    expect(state.final_prize).toBe('earbuds_grand_prize');
    expect(startSpin(state, 999999)).toBe(state);
    expect(resumeReward(state, 999999)).toBe(state);
  } finally { random.mockRestore(); }
});

it('rejects repeated starts, premature finishes, stale animation callbacks and repeated settlement', () => {
  const state = startSpin(newReward('test'), 10000);
  for (let i = 0; i < 100; i++) expect(startSpin(state, 10001 + i)).toBe(state);
  expect(settleSpin(state, 0, 14199)).toBe(state);
  expect(settleSpin(state, 1, 99999)).toBe(state);
  const done = settleSpin(state, 0, 14200);
  expect(settleSpin(done, 0, 99999)).toBe(done);
  const next = startSpin(done, 20000);
  expect(settleSpin(next, 0, 99999)).toBe(next);
});

it('covers the disc once and puts every landing at its sector center over arbitrary rotations', () => {
  expect(sectors[0].start).toBe(0);
  expect(sectors.at(-1)!.end).toBe(360);
  sectors.forEach((sector, i) => {
    if (i) expect(sector.start).toBe(sectors[i - 1].end);
    for (const from of [0, 42.5, 359.9, 98765]) {
      const to = targetRotation(from, sector.id);
      expect(to - from).toBeGreaterThanOrEqual(1800);
      expect(outcomeAtPointer(to)).toBe(sector.id);
      expect(((360 - to % 360) % 360)).toBeCloseTo((sector.start + sector.end) / 2);
    }
  });
  expect(sectors.at(-1)!.end - sectors.at(-1)!.start).toBeLessThan(40);
});

it('round-trips every pending and settled step, resumes by elapsed time and never rerolls', () => {
  let state = newReward('resume');
  for (let step = 0; step < 4; step++) {
    state = startSpin(state, 10000 + step * 10000);
    const copy = parseReward(JSON.stringify(state), 'resume');
    expect(resumeReward(copy, copy.pending!.started_at + 20)).toBe(copy);
    state = resumeReward(copy, copy.pending!.started_at + 6000);
    expect(state.settled_spins).toBe(step + 1);
    expect(parseReward(JSON.stringify(state), 'resume')).toEqual(state);
    expect(resumeReward(state, 999999)).toBe(state);
  }
});

it('reduced motion has the same exact prizes and chance accounting', () => {
  let state = newReward('reduce');
  script.forEach((_, step) => {
    state = startSpin(state, 10000 + step * 1000, true);
    expect(state.pending!.duration).toBe(160);
    state = resumeReward(state, state.pending!.started_at + 160);
  });
  expect(state.final_prize).toBe('earbuds_grand_prize');
  expect(remainingChances(state)).toBe(0);
});

it('rejects corrupt results, session mismatch, altered landing and noncanonical final awards', () => {
  const state = startSpin(newReward('test'), 10000);
  for (const altered of [
    {...state, session_id: 'other'}, {...state, settled_spins: 5}, {...state, formal_results: ['earbuds_grand_prize']},
    {...state, rotation: 1}, {...state, pending: {...state.pending, to: 360}},
    {...state, final_prize: 'meal_fund'}, {...state, completed_at: 123},
  ]) expect(() => parseReward(JSON.stringify(altered), 'test')).toThrow();
});

it('ranks redeemable prizes without stacking rewards', () => {
  expect(bestPrize([])).toBeNull();
  expect(bestPrize(['milk_tea_fund', 'no_prize'])).toBe('milk_tea_fund');
  expect(bestPrize(['meal_fund', 'milk_tea_fund', 'no_prize'])).toBe('meal_fund');
  expect(bestPrize(['earbuds_grand_prize', 'meal_fund'])).toBe('earbuds_grand_prize');
});

it('keeps rewards separate from preference JSON; clearing targets only reward keys', () => {
  const storage: Record<string, unknown> = {
    getItem(key: string) {return typeof this[key] === 'string' ? this[key] : null;},
    setItem(key: string, value: string) {this[key] = value;},
    removeItem(key: string) {delete this[key];},
    'unrelated-key': 'keep',
  };
  vi.stubGlobal('localStorage', storage);
  const session = completedFixture(), json = exportJSON(session);
  let state = newReward(session.session_id);
  for (let i = 0; i < 4; i++) {
    state = startSpin(state, 10000 + i * 10000);
    expect(saveReward(state)).toBe(true);
    state = resumeReward(loadReward(session.session_id).state, 16000 + i * 10000);
    saveReward(state);
  }
  expect(loadReward(session.session_id).state.final_prize).toBe('earbuds_grand_prize');
  expect(exportJSON(session)).toBe(json);
  expect(JSON.parse(json)).not.toHaveProperty('final_prize');
  clearRewards();
  expect(storage[rewardKey(session.session_id)]).toBeUndefined();
  expect(storage['unrelated-key']).toBe('keep');
});

it('reports blocked storage without claiming persistence or blocking in-memory play', () => {
  vi.stubGlobal('localStorage', {getItem() {throw Error('denied');}, setItem() {throw Error('denied');}});
  expect(loadReward('blocked').error).toBeTruthy();
  expect(saveReward(startSpin(newReward('blocked'), 10000))).toBe(false);
});
