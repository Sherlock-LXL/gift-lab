import rawBank from './data/bank.json';
import { radar, reasonsFor, specialOptions } from './data/radar';
import type { Gift, Pair, Session, Rating, PairChoice, Preference, AnswerStatus, Choice } from './types';
export const bank = rawBank as unknown as {version:string; categories:string[]; gifts:Gift[]; pairs:Pair[]; known_interest_basis:string};
export const giftById = new Map(bank.gifts.map(g => [g.id, g]));
export const pairById = new Map(bank.pairs.map(p => [p.id, p]));
export const STORAGE_KEY = 'gift-lab.session.v1';
const now = () => new Date().toISOString();
export function random(seed: number) {
  let n = seed >>> 0;
  return () => { n += 0x6D2B79F5; let t = Math.imul(n ^ n >>> 15, 1 | n); t ^= t + Math.imul(t ^ t >>> 7, 61 | t); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
export function shuffle<T>(items: readonly T[], rng: () => number): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [copy[i], copy[j]] = [copy[j], copy[i]]; }
  return copy;
}
export function makePlan(seed: number, fixed_at = now()): Session['plan'] {
  const rng = random(seed), pool = bank.gifts.filter(g => g.role === 'rating');
  const pairFamilies = new Set(bank.gifts.filter(g => g.role === 'pair').map(g => g.family_id));
  const holdout = shuffle(bank.categories, rng).slice(0, 4).map(category =>
    shuffle(pool.filter(g => g.category === category && g.audience === 'general' && !pairFamilies.has(g.family_id)), rng)[0]);
  const excluded = new Set(holdout.map(g => g.family_id));
  const selected = [...holdout];
  const counts = () => Object.fromEntries(bank.categories.map(c => [c, selected.filter(g => g.category === c).length]));
  const addBalanced = (candidates: Gift[]) => {
    const count = counts();
    const sorted = shuffle(candidates, rng).sort((a,b) => count[a.category] - count[b.category]);
    if (!sorted[0]) throw Error('题库不足');
    selected.push(sorted[0]);
  };
  // Exactly five author-supplied interest probes, one per topic. Never uses a rating.
  for (const topic of shuffle(['猫咪','音乐','手工','美食','旅行'], rng))
    addBalanced(pool.filter(g => g.audience === 'personalized' && g.interest_tags.includes(topic) && !excluded.has(g.family_id) && !selected.includes(g)));
  // Probe price and commemorative uses, without trying to predict liking.
  const ensure = (predicate:(g:Gift)=>boolean) => {
    if (!selected.some(predicate))
      addBalanced(pool.filter(g => g.audience==='general' && !excluded.has(g.family_id) && !selected.includes(g) && predicate(g)));
  };
  ensure(g => g.function_tags.includes('纪念'));
  ensure(g => (g.price_cny[0]+g.price_cny[1])/2 >= 300);
  ensure(g => (g.price_cny[0]+g.price_cny[1])/2 <= 60);
  while (selected.length < 24)
    addBalanced(pool.filter(g => g.audience === 'general' && !excluded.has(g.family_id) && !selected.includes(g)));
  const remaining = shuffle(selected, rng), ordered: Gift[] = [];
  while (remaining.length) {
    // Consume the largest remaining category first, so the tail cannot clump.
    const count = Object.fromEntries(bank.categories.map(c => [c, remaining.filter(g => g.category === c).length]));
    remaining.sort((a,b) => count[b.category] - count[a.category]);
    const next = remaining.findIndex(g => g.category !== ordered.at(-1)?.category);
    ordered.push(remaining.splice(next < 0 ? 0 : next, 1)[0]);
  }
  const anchors = new Set(bank.pairs.map(p=>p.consistency_of).filter(Boolean));
  const controls = shuffle(bank.pairs.filter(p => p.comparison_type === 'controlled'), rng)
    .sort((a,b)=>Number(anchors.has(b.id))-Number(anchors.has(a.id)));
  const trades = shuffle(bank.pairs.filter(p => p.comparison_type === 'tradeoff'), rng);
  // Interleave control/tradeoff. Consistency checks stay at least four questions after anchors.
  const pairOrder: Pair[] = [];
  controls.forEach((p,i) => { pairOrder.push(p); if (i % 2 === 1 && trades.length) pairOrder.push(trades.shift()!); });
  pairOrder.push(...trades, ...shuffle(bank.pairs.filter(p => p.comparison_type === 'consistency'), rng));
  return {
    seed, fixed_at,
    ratings: ordered.map(g => ({gift_id:g.id, split:holdout.includes(g) ? 'holdout' : 'train'})),
    pairs:pairOrder.map(p => {
      const [left_gift_id,right_gift_id] = shuffle(p.gift_ids,rng);
      return {pair_id:p.id,left_gift_id,right_gift_id};
    }),
    personalization_basis:bank.known_interest_basis,
  };
}
export function newSession(seed = crypto.getRandomValues(new Uint32Array(1))[0]): Session {
  const created_at = now(), plan = makePlan(seed, created_at);
  const ids = new Set([...plan.ratings.map(g => g.gift_id), ...plan.pairs.flatMap(p => [p.left_gift_id,p.right_gift_id])]);
  return {
    schema_version:'1.0', question_bank_version:'1.0', session_id:crypto.randomUUID(),
    consent:true, created_at, completed_at:null, active_seconds:0, completed:false,
    preferences:{}, gift_ratings:[], pairwise_choices:[], plan,
    cursor:{stage:'radar',index:0}, gift_metadata:structuredClone(bank.gifts.filter(g => ids.has(g.id))),
  };
}
export function rate(s:Session, index:number, rating:number|null, status:AnswerStatus, reasons:string[]=[]): Session {
  const item = s.plan.ratings[index];
  const answer:Rating = {
    answer_id:`rating:${item.gift_id}`, ...item, rating, status, reason_tags:reasons,
    skipped:status === 'skipped', question_order:index+1, metadata_ref:`bank:1.0:${item.gift_id}`,
    answered_at:now(), source:'human',
  };
  return {...s, gift_ratings:[...s.gift_ratings.filter(a => a.gift_id !== item.gift_id),answer].sort((a,b) => a.question_order-b.question_order)};
}
export function choose(s:Session,index:number,chosen:Choice,skipped=false): Session {
  const item = s.plan.pairs[index], pair = pairById.get(item.pair_id)!;
  const answer:PairChoice = {
    answer_id:`pair:${pair.id}`, ...item, chosen, skipped,
    tested_factors:pair.tested_factors, comparison_type:pair.comparison_type,
    actual_display_order:[item.left_gift_id,item.right_gift_id], question_order:index+1, answered_at:now(), source:'human',
  };
  return {...s,pairwise_choices:[...s.pairwise_choices.filter(a => a.pair_id !== pair.id),answer].sort((a,b) => a.question_order-b.question_order)};
}
export function progress(s:Session):number {
  return Math.round(Object.keys(s.preferences).length/radar.length*10 + s.gift_ratings.length/24*60 + s.pairwise_choices.length/30*30);
}
export function validateSemantics(s:Session):string[] {
  const errors:string[] = [], fail=(ok:boolean,msg:string) => {if(!ok) errors.push(msg);};
  fail(s.consent === true,'缺少本地保存同意');
  const expected = makePlan(s.plan.seed,s.plan.fixed_at);
  fail(JSON.stringify(s.plan) === JSON.stringify(expected),'题目计划与固定种子不符');
  fail(s.plan.fixed_at === s.created_at,'题目计划必须在开始时固定');
  fail(!s.completed_at || s.completed_at >= s.created_at,'完成时间早于开始时间');
  const holdFamilies = new Set(s.plan.ratings.filter(g=>g.split==='holdout').map(g=>giftById.get(g.gift_id)?.family_id));
  for (const p of s.plan.pairs) {
    fail(![p.left_gift_id,p.right_gift_id].some(id=>holdFamilies.has(giftById.get(id)?.family_id)),'比较题包含测试礼物家族');
  }
  fail(new Set(s.gift_ratings.map(g=>g.gift_id)).size===s.gift_ratings.length,'重复礼物答案');
  fail(new Set(s.pairwise_choices.map(p=>p.pair_id)).size===s.pairwise_choices.length,'重复比较答案');
  for (const a of s.gift_ratings) {
    const item=s.plan.ratings[a.question_order-1];
    fail(!!item && item.gift_id===a.gift_id && item.split===a.split,'评分与计划不符');
    fail(a.metadata_ref===`bank:1.0:${a.gift_id}` && a.answer_id===`rating:${a.gift_id}`,'评分引用不符');
    fail(a.answered_at>=s.plan.fixed_at,'回答早于题目计划');
    fail((a.status==='rated') === (a.rating!==null) && (a.status==='skipped')===a.skipped,'评分状态冲突');
    fail(a.rating===null || (Number.isInteger(a.rating) && a.rating>=0 && a.rating<=10),'评分不在 0–10');
    const allowed = reasonsFor(giftById.get(a.gift_id)?.category || '').map(r=>r[0]);
    fail(a.reason_tags.every(r=>allowed.includes(r)),'未知原因标签');
  }
  for (const a of s.pairwise_choices) {
    const item=s.plan.pairs[a.question_order-1], pair=pairById.get(a.pair_id);
    fail(!!item && item.pair_id===a.pair_id && item.left_gift_id===a.left_gift_id && item.right_gift_id===a.right_gift_id,'比较显示顺序不符');
    fail(JSON.stringify(a.actual_display_order)===JSON.stringify([a.left_gift_id,a.right_gift_id]),'左右顺序不符');
    fail(a.answer_id===`pair:${a.pair_id}` && a.comparison_type===pair?.comparison_type && JSON.stringify(a.tested_factors)===JSON.stringify(pair?.tested_factors),'比较元数据不符');
    fail(!a.skipped || a.chosen==='unknown','跳过状态冲突');
    fail(a.answered_at>=s.plan.fixed_at,'回答早于题目计划');
  }
  for(const [id,a] of Object.entries(s.preferences)) {
    const q = radar.find(q=>q.id===id), ids=q?.options.map(o=>o[0]) as readonly string[]|undefined;
    fail(!!q && id===a.question_id,'未知雷达问题');
    fail([...a.positive,...a.negative,...a.uncertain].every(v=>ids?.includes(v)||specialOptions[id]?.includes(v)),'未知偏好选项');
    fail(new Set([...a.positive,...a.negative,...a.uncertain]).size===a.positive.length+a.negative.length+a.uncertain.length,'偏好状态冲突');
    fail(!a.skipped || a.positive.length+a.negative.length+a.uncertain.length===0,'跳过的偏好仍有选择');
  }
  const ids=new Set([...s.plan.ratings.map(g=>g.gift_id),...s.plan.pairs.flatMap(p=>[p.left_gift_id,p.right_gift_id])]);
  fail(s.gift_metadata.length===ids.size && new Set(s.gift_metadata.map(g=>g.id)).size===ids.size,'元数据数量不符');
  for(const g of s.gift_metadata) fail(ids.has(g.id) && JSON.stringify(g)===JSON.stringify(giftById.get(g.id)),'礼物元数据被更改');
  if(s.completed) fail(s.gift_ratings.length===24 && s.pairwise_choices.length===30 && Object.keys(s.preferences).length===7 && !!s.completed_at,'通关答案不完整');
  const limits={welcome:1,radar:7,rating:24,pair:30,result:1};
  fail(s.cursor.index>=0 && s.cursor.index<limits[s.cursor.stage],'当前题号无效');
  fail(s.cursor.stage!=='result'||s.completed,'未完成却进入结果页');
  return errors;
}
export function savePreference(s:Session, preference:Preference):Session {
  return {...s,preferences:{...s.preferences,[preference.question_id]:preference}};
}
// Exploratory summary uses training answers only; holdout never informs profile generation.
export function summarize(s:Session) {
  const best=s.gift_ratings.filter(r=>r.split==='train'&&r.rating!==null&&r.rating>=8).sort((a,b)=>b.rating!-a.rating!).slice(0,3);
  const styles=s.preferences.styles?.positive || [], colors=s.preferences.colors?.positive || [];
  const categories=s.preferences.categories?.positive || [];
  return {
    best:best.map(r=>({name:giftById.get(r.gift_id)!.name,rating:r.rating})),styles,colors,categories,
    title:styles.includes('可可爱爱')?'可爱收藏家':styles.includes('简简单单')?'简单快乐派':styles.includes('复古文艺')?'浪漫生活家':'自在探索家',
  };
}
