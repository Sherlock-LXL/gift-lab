// The reward is a scripted epilogue. It never reads or writes preference data.
export type Prize = 'milk_tea_fund' | 'meal_fund' | 'no_prize' | 'earbuds_grand_prize';
export type Outcome = Prize | 'extra_spin';
export const REWARD_PREFIX = 'gift-lab.reward.v1:';
export const sectors: {id: Outcome; start: number; end: number; icon: string; lines: string[]; color: string}[] = [
  {id: 'milk_tea_fund', start: 0, end: 82, icon: '🧋', lines: ['奶茶基金！'], color: '#f6dce4'},
  {id: 'meal_fund', start: 82, end: 172, icon: '🍚', lines: ['吃饭基金！'], color: '#fae6c6'},
  {id: 'extra_spin', start: 172, end: 252, icon: '🔄', lines: ['再抽一次！'], color: '#dcece2'},
  {id: 'no_prize', start: 252, end: 332, icon: '🥺', lines: ['未中奖'], color: '#e6def2'},
  {id: 'earbuds_grand_prize', start: 332, end: 360, icon: '🎧', lines: ['一起听歌', '的耳机！'], color: '#f6d989'},
];
export const script = [
  {outcome: 'meal_fund', duration: 4200, turns: 5},
  {outcome: 'extra_spin', duration: 4200, turns: 5},
  {outcome: 'no_prize', duration: 3600, turns: 4},
  {outcome: 'earbuds_grand_prize', duration: 5600, turns: 7},
] as const;
export interface PendingSpin {
  step: number;
  from: number;
  to: number;
  started_at: number;
  duration: number;
}
export interface RewardState {
  version: 1;
  session_id: string;
  settled_spins: number;
  rotation: number;
  pending: PendingSpin | null;
  formal_results: Prize[];
  final_prize: Prize | null;
  completed_at: number | null;
}
export function newReward(sessionId: string): RewardState {
  return {version: 1, session_id: sessionId, settled_spins: 0, rotation: 0, pending: null, formal_results: [], final_prize: null, completed_at: null};
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
function formalResults(settled: number): Prize[] {
  return settled === 4 ? ['meal_fund', 'no_prize', 'earbuds_grand_prize'] : settled >= 3 ? ['meal_fund', 'no_prize'] : settled >= 1 ? ['meal_fund'] : [];
}
export function remainingChances(state: RewardState): number {
  const started = state.settled_spins + (state.pending ? 1 : 0);
  return [3, 2, 1, 1, 0][started];
}
export function startSpin(state: RewardState, now: number, reducedMotion = false): RewardState {
  if (state.pending || state.settled_spins === 4) return state;
  const step = script[state.settled_spins];
  return {...state, pending: {
    step: state.settled_spins, from: state.rotation,
    to: targetRotation(state.rotation, step.outcome, step.turns),
    started_at: now, duration: reducedMotion ? 160 : step.duration,
  }};
}
export function settleSpin(state: RewardState, step: number, now: number): RewardState {
  const spin = state.pending;
  if (!spin || spin.step !== step || now < spin.started_at + spin.duration) return state;
  const count = state.settled_spins + 1;
  const results = formalResults(count);
  return {...state, settled_spins: count, rotation: spin.to, pending: null, formal_results: results,
    final_prize: count === 4 ? bestPrize(results) : null, completed_at: count === 4 ? now : null};
}
export function resumeReward(state: RewardState, now: number): RewardState {
  return state.pending ? settleSpin(state, state.pending.step, now) : state;
}
export function rewardKey(sessionId: string) { return REWARD_PREFIX + sessionId; }

// Canonical validation prevents partial/corrupt saves from inventing prize records.
export function parseReward(raw: string, sessionId: string): RewardState {
  const s = JSON.parse(raw) as RewardState;
  if (!s || s.version !== 1 || s.session_id !== sessionId || !Number.isInteger(s.settled_spins) || s.settled_spins < 0 || s.settled_spins > 4) throw Error('reward format');
  let rotation = 0;
  for (const step of script.slice(0, s.settled_spins)) rotation = targetRotation(rotation, step.outcome, step.turns);
  if (s.rotation !== rotation || JSON.stringify(s.formal_results) !== JSON.stringify(formalResults(s.settled_spins))) throw Error('reward results');
  if (s.final_prize !== (s.settled_spins === 4 ? 'earbuds_grand_prize' : null) ||
    (s.settled_spins === 4 ? !Number.isFinite(s.completed_at) || s.completed_at! <= 0 : s.completed_at !== null)) throw Error('reward final');
  if (s.pending !== null) {
    const p = s.pending, step = script[s.settled_spins];
    if (!p || !step || p.step !== s.settled_spins || p.from !== rotation || p.to !== targetRotation(rotation, step.outcome, step.turns) ||
      !Number.isFinite(p.started_at) || p.started_at <= 0 || (p.duration !== step.duration && p.duration !== 160)) throw Error('reward pending');
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
  try { localStorage.setItem(rewardKey(state.session_id), JSON.stringify(state)); return true; }
  catch { return false; }
}
export function clearRewards(): void {
  for (const key of Object.keys(localStorage)) if (key.startsWith(REWARD_PREFIX)) localStorage.removeItem(key);
}
