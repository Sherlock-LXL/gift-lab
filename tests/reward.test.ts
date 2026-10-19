import { afterEach, expect, it, vi } from 'vitest';
import {
  bestPrize, clearRewards, loadReward, newReward, outcomeAtPointer, parseReward, randomOutcome,
  remainingChances, resumeReward, rewardKey, saveReward, sectors, settleSpin, startSpin, targetRotation,
  type Outcome,
} from '../src/rewardMachine';
import { exportJSON } from '../src/storage';
import { completedFixture } from './fixtures';

afterEach(() => vi.unstubAllGlobals());

const randomFor = (outcome: Outcome) => {
  const sector = sectors.find(s => s.id === outcome)!;
  return Math.floor((((sector.start + sector.end) / 2) / 360) * 0x100000000);
};
function spin(state: ReturnType<typeof newReward>, outcome: Outcome, now: number, reduced = false) {
  const started = startSpin(state, now, reduced, () => randomFor(outcome));
  return settleSpin(started, started.pending!.step, now + started.pending!.duration);
}

it('maps secure random values to the visible sector geometry, including uint32 edges', () => {
  expect(randomOutcome(() => 0)).toBe('milk_tea_fund');
  expect(randomOutcome(() => 0xffffffff)).toBe('earbuds_grand_prize');
  for (const sector of sectors) expect(randomOutcome(() => randomFor(sector.id))).toBe(sector.id);
  expect(() => randomOutcome(() => -1)).toThrow();
  expect(() => randomOutcome(() => 0x100000000)).toThrow();
  expect(() => randomOutcome(() => 1.5)).toThrow();
});

it('finishes three formal draws while repeated extra spins consume no formal chance', () => {
  let state = newReward('random');
  const sequence: Outcome[] = ['extra_spin', 'extra_spin', 'milk_tea_fund', 'no_prize', 'earbuds_grand_prize'];
  const remaining = [3, 3, 2, 1, 0];
  for (const [i, outcome] of sequence.entries()) {
    state = spin(state, outcome, 10000 + i * 10000);
    expect(outcomeAtPointer(state.rotation)).toBe(outcome);
    expect(remainingChances(state)).toBe(remaining[i]);
  }
  expect(state.spin_history).toEqual(sequence);
  expect(state.formal_results).toEqual(['milk_tea_fund', 'no_prize', 'earbuds_grand_prize']);
  expect(state.final_prize).toBe('earbuds_grand_prize');
  expect(state.completed_at).toBeTruthy();
  expect(startSpin(state, 999999, false, () => randomFor('meal_fund'))).toBe(state);
});

it('can legitimately finish with no prize and still has a stable final result', () => {
  let state = newReward('none');
  for (let i = 0; i < 3; i++) state = spin(state, 'no_prize', 10000 + i * 10000);
  expect(state.formal_results).toEqual(['no_prize', 'no_prize', 'no_prize']);
  expect(state.final_prize).toBe('no_prize');
  expect(remainingChances(state)).toBe(0);
  expect(parseReward(JSON.stringify(state), 'none')).toEqual(state);
});

it('selects only the highest of the three formal results', () => {
  expect(bestPrize([])).toBeNull();
  expect(bestPrize(['no_prize', 'milk_tea_fund', 'no_prize'])).toBe('milk_tea_fund');
  expect(bestPrize(['meal_fund', 'milk_tea_fund', 'no_prize'])).toBe('meal_fund');
  expect(bestPrize(['meal_fund', 'earbuds_grand_prize', 'milk_tea_fund'])).toBe('earbuds_grand_prize');
});

it('selects once before animation, survives refresh, and never rerolls an existing pending spin', () => {
  let calls = 0;
  const state = startSpin(newReward('resume'), 10000, false, () => {calls++; return randomFor('meal_fund');});
  expect(calls).toBe(1);
  expect(state.pending?.outcome).toBe('meal_fund');
  expect(startSpin(state, 10001, false, () => {calls++; return randomFor('earbuds_grand_prize');})).toBe(state);
  expect(calls).toBe(1);
  const restored = parseReward(JSON.stringify(state), 'resume');
  expect(resumeReward(restored, 11000)).toBe(restored);
  const settled = resumeReward(restored, 15000);
  expect(calls).toBe(1);
  expect(settled.formal_results).toEqual(['meal_fund']);
  expect(outcomeAtPointer(settled.rotation)).toBe('meal_fund');
});

it('rejects premature, stale, and repeated animation settlement', () => {
  const state = startSpin(newReward('test'), 10000, false, () => randomFor('milk_tea_fund'));
  expect(settleSpin(state, 0, 14199)).toBe(state);
  expect(settleSpin(state, 1, 99999)).toBe(state);
  const done = settleSpin(state, 0, 14200);
  expect(settleSpin(done, 0, 99999)).toBe(done);
});

it('covers the disc once and every selected prize lands at the exact sector center', () => {
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

it('reduced motion preserves random results, bonus accounting, and highest prize', () => {
  let state = newReward('reduce');
  for (const [i, outcome] of (['extra_spin', 'meal_fund', 'milk_tea_fund', 'no_prize'] as Outcome[]).entries()) {
    const pending = startSpin(state, 10000 + i * 1000, true, () => randomFor(outcome));
    expect(pending.pending!.duration).toBe(160);
    state = resumeReward(pending, pending.pending!.started_at + 160);
  }
  expect(state.formal_results).toEqual(['meal_fund', 'milk_tea_fund', 'no_prize']);
  expect(state.final_prize).toBe('meal_fund');
});

it('rejects corrupt history, altered landing, result substitution, and session mismatch', () => {
  const pending = startSpin(newReward('test'), 10000, false, () => randomFor('meal_fund'));
  const settled = settleSpin(pending, 0, 14200);
  for (const altered of [
    {...pending, session_id: 'other'}, {...pending, spin_history: ['earbuds_grand_prize']},
    {...pending, pending: {...pending.pending!, outcome: 'earbuds_grand_prize'}},
    {...pending, pending: {...pending.pending!, to: 360}},
    {...settled, rotation: 1}, {...settled, formal_results: ['earbuds_grand_prize']},
    {...settled, final_prize: 'meal_fund'}, {...settled, completed_at: 123},
  ]) expect(() => parseReward(JSON.stringify(altered), 'test')).toThrow();
});

it('keeps random rewards outside preference JSON and uses a separate v2 storage namespace', () => {
  const storage: Record<string, unknown> = {
    getItem(key: string) {return typeof this[key] === 'string' ? this[key] : null;},
    setItem(key: string, value: string) {this[key] = value;},
    removeItem(key: string) {delete this[key];},
    'gift-lab.reward.v1:old-script': 'old',
    'unrelated-key': 'keep',
  };
  vi.stubGlobal('localStorage', storage);
  const session = completedFixture(), json = exportJSON(session);
  let state = newReward(session.session_id);
  for (const [i, outcome] of (['milk_tea_fund', 'meal_fund', 'earbuds_grand_prize'] as Outcome[]).entries()) {
    state = startSpin(state, 10000 + i * 10000, false, () => randomFor(outcome));
    expect(saveReward(state)).toBe(true);
    state = resumeReward(loadReward(session.session_id).state, 16000 + i * 10000);
    saveReward(state);
  }
  expect(rewardKey(session.session_id)).toContain('gift-lab.reward.random.v2:');
  expect(loadReward(session.session_id).state.final_prize).toBe('earbuds_grand_prize');
  expect(exportJSON(session)).toBe(json);
  expect(JSON.parse(json)).not.toHaveProperty('final_prize');
  clearRewards();
  expect(storage[rewardKey(session.session_id)]).toBeUndefined();
  expect(storage['gift-lab.reward.v1:old-script']).toBeUndefined();
  expect(storage['unrelated-key']).toBe('keep');
});

it('reports blocked storage without preventing the in-memory random draw', () => {
  vi.stubGlobal('localStorage', {getItem() {throw Error('denied');}, setItem() {throw Error('denied');}});
  expect(loadReward('blocked').error).toBeTruthy();
  expect(saveReward(startSpin(newReward('blocked'), 10000, false, () => randomFor('meal_fund')))).toBe(false);
});
