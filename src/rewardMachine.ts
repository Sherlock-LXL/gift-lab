// Random reward state stays separate from preference data and the original scripted reward.
export type Prize = 'milk_tea_fund' | 'meal_fund' | 'no_prize' | 'earbuds_grand_prize';
export type Outcome = Prize | 'extra_spin';
export const REWARD_PREFIX = 'gift-lab.reward.random.v2:';
export const sectors: {id: Outcome; start: number; end: number; icon: string; lines: string[]; color: string}[] = [
  {id: 'milk_tea_fund', start: 0, end: 82, icon: '🧋', lines: ['奶茶基金！'], color: '#f6dce4'},
  {id: 'meal_fund', start: 82, end: 172, icon: '🍚', lines: ['吃饭基金！'], color: '#fae6c6'},
  {id: 'extra_spin', start: 172, end: 252, icon: '🔄', lines: ['再抽一次！'], color: '#dcece2'},
  {id: 'no_prize', start: 252, end: 332, icon: '🥺', lines: ['未中奖'], color: '#e6def2'},
  {id: 'earbuds_grand_prize', start: 332, end: 360, icon: '🎧', lines: ['一起听歌', '的耳机！'], color: '#f6d989'},
];
const OUTCOMES = new Set<Outcome>(sectors.map(s => s.id));
export interface PendingSpin {
  step: number;
  from: number;
  to: number;
  started_at: number;
  duration: number;
  outcome: Outcome;
  is_bonus: boolean;
}
export interface RewardState {
  version: 2;
  session_id: string;
  settled_spins: number;
  rotation: number;
  pending: PendingSpin | null;
  spin_history: Outcome[];
  bonus_active: boolean;
  formal_results: Prize[];
  final_prize: Prize | null;
  completed_at: number | null;
}
export type RandomUint32 = () => number;
export function newReward(sessionId: string): RewardState {
  return {version: 2, session_id: sessionId, settled_spins: 0, rotation: 0, pending: null, spin_history: [],
    bonus_active: false, formal_results: [], final_prize: null, completed_at: null};
}
const mod = (angle: number) => ((angle % 360) + 360) % 360;
export function targetRotation(from: number, outcome: Outcome, turns = 5): number {
  const sector = sectors.find(s => s.id === outcome)!;
  return from + turns * 360 + mod(-(sector.start + sector.end) / 2 - from);
}
export function outcomeAtPointer(rotation: number): Outcome {
  const angle = mod(-rotation);
  return sectors.find(s => angle >= s.start && angle < s.end)!.id;
}
export function bestPrize(results: Prize[]): Prize | null {
  const rank: Record<Prize, number> = {no_prize: 0, milk_tea_fund: 1, meal_fund: 2, earbuds_grand_prize: 3};
  return results.reduce<Prize | null>((best, prize) => best === null || rank[prize] > rank[best] ? prize : best, null);
}
export function randomOutcome(randomUint32: RandomUint32 = secureRandomUint32): Outcome {
  const value = randomUint32();
  if (!Number.isInteger(value) || value < 0 || value > 0xffffffff) throw Error('random source');
  const angle = ((value + .5) / 0x100000000) * 360;
  return sectors.find(s => angle >= s.start && angle < s.end)!.id;
}
function secureRandomUint32(): number {
  if (!globalThis.crypto?.getRandomValues) throw Error('secure random unavailable');
  return globalThis.crypto.getRandomValues(new Uint32Array(1))[0];
}
function spinTiming(state: RewardState) {
  const finalFormal = !state.bonus_active && state.formal_results.length === 2;
  return state.bonus_active ? {duration: 3600, turns: 4} : finalFormal ? {duration: 5200, turns: 6} : {duration: 4200, turns: 5};
}
function derive(history: Outcome[]) {
  const formalResults: Prize[] = [];
  let bonusActive = false;
  for (const outcome of history) {
    if (formalResults.length === 3) throw Error('reward history');
    if (outcome === 'extra_spin') bonusActive = true;
    else {
      formalResults.push(outcome);
      bonusActive = false;
    }
  }
  return {formalResults, bonusActive};
}
export function remainingChances(state: RewardState): number {
  const pendingFormal = state.pending && !state.pending.is_bonus ? 1 : 0;
  return Math.max(0, 3 - state.formal_results.length - pendingFormal);
}
export function startSpin(state: RewardState, now: number, reducedMotion = false, randomUint32?: RandomUint32): RewardState {
  if (state.pending || state.formal_results.length === 3) return state;
  const outcome = randomOutcome(randomUint32);
  const timing = spinTiming(state);
  return {...state, pending: {
    step: state.settled_spins, from: state.rotation, to: targetRotation(state.rotation, outcome, timing.turns),
    started_at: now, duration: reducedMotion ? 160 : timing.duration, outcome, is_bonus: state.bonus_active,
  }};
}
export function settleSpin(state: RewardState, step: number, now: number): RewardState {
  const spin = state.pending;
  if (!spin || spin.step !== step || now < spin.started_at + spin.duration) return state;
  const history = [...state.spin_history, spin.outcome];
  const {formalResults, bonusActive} = derive(history);
  const done = formalResults.length === 3;
  return {...state, settled_spins: state.settled_spins + 1, rotation: spin.to, pending: null, spin_history: history,
    bonus_active: bonusActive, formal_results: formalResults, final_prize: done ? bestPrize(formalResults) : null,
    completed_at: done ? now : null};
}
export function resumeReward(state: RewardState, now: number): RewardState {
  return state.pending ? settleSpin(state, state.pending.step, now) : state;
}
export function rewardKey(sessionId: string) { return REWARD_PREFIX + sessionId; }

// Validation ensures a refresh resumes the already-selected result instead of drawing again.
export function parseReward(raw: string, sessionId: string): RewardState {
  const s = JSON.parse(raw) as RewardState;
  if (!s || s.version !== 2 || s.session_id !== sessionId || !Number.isInteger(s.settled_spins) ||
    s.settled_spins < 0 || s.settled_spins > 64 || !Array.isArray(s.spin_history) ||
    s.spin_history.length !== s.settled_spins || s.spin_history.some(o => !OUTCOMES.has(o))) throw Error('reward format');
  const derived = derive(s.spin_history);
  if (JSON.stringify(s.formal_results) !== JSON.stringify(derived.formalResults) || s.bonus_active !== derived.bonusActive) throw Error('reward results');
  let rotation = 0, replay = newReward(sessionId);
  for (const outcome of s.spin_history) {
    const timing = spinTiming(replay);
    rotation = targetRotation(rotation, outcome, timing.turns);
    const history = [...replay.spin_history, outcome], next = derive(history);
    replay = {...replay, settled_spins: replay.settled_spins + 1, rotation, spin_history: history,
      formal_results: next.formalResults, bonus_active: next.bonusActive};
  }
  if (s.rotation !== rotation) throw Error('reward rotation');
  const done = derived.formalResults.length === 3;
  if (s.final_prize !== (done ? bestPrize(derived.formalResults) : null) ||
    (done ? !Number.isFinite(s.completed_at) || s.completed_at! <= 0 : s.completed_at !== null)) throw Error('reward final');
  if (s.pending !== null) {
    const p = s.pending, timing = spinTiming(replay);
    if (!p || p.step !== s.settled_spins || p.from !== rotation || !OUTCOMES.has(p.outcome) ||
      p.to !== targetRotation(rotation, p.outcome, timing.turns) || p.is_bonus !== s.bonus_active ||
      !Number.isFinite(p.started_at) || p.started_at <= 0 || (p.duration !== timing.duration && p.duration !== 160)) throw Error('reward pending');
  }
  return s;
}
export function loadReward(sessionId: string): {state: RewardState; error: string | null} {
  try {
    const raw = localStorage.getItem(rewardKey(sessionId));
    return {state: raw ? parseReward(raw, sessionId) : newReward(sessionId), error: null};
  } catch {
    return {state: newReward(sessionId), error: '奖励进度暂时无法读取，请留在本页完成并截图保存。'};
  }
}
export function saveReward(state: RewardState): boolean {
  try { localStorage.setItem(rewardKey(state.session_id), JSON.stringify(state)); return true;}
  catch { return false; }
}
export function clearRewards(): void {
  for (const key of Object.keys(localStorage)) if (key.startsWith('gift-lab.reward.')) localStorage.removeItem(key);
}
