import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { Camera, Cat, RotateCcw, Sparkles } from 'lucide-react';
import {
  loadReward, newReward, remainingChances, resumeReward, rewardKey, saveReward, sectors,
  settleSpin, startSpin, type Outcome, type PendingSpin, type Prize, type RewardState,
} from './rewardMachine';
import './reward.css';

const prizeInfo: Record<Prize, {icon: string; name: string; subtitle: string; story: string; password: string; grand?: boolean}> = {
  milk_tea_fund: {icon: '🧋', name: '奶茶基金', subtitle: '幸运小猫抽中了甜甜的小奖励！', story: '挑一杯今天最想喝的，给这场礼物冒险加一点甜～', password: '老师！我的奶茶基金呢！'},
  meal_fund: {icon: '🍚', name: '吃饭基金', subtitle: '幸运小猫抽中了香香的小奖励！', story: '找个喜欢的时间，去吃一顿让人开心的饭吧～', password: '老师！我的吃饭基金呢！'},
  no_prize: {icon: '🥺', name: '本次未中奖', subtitle: '小猫把好运先存起来啦', story: '没有抽中奖品也没关系，谢谢你认真玩完这场礼物冒险 ♡', password: ''},
  earbuds_grand_prize: {icon: '🎧', name: '一起听歌的耳机', subtitle: '幸运小猫获得了隐藏超级大奖！', story: '以后听喜欢的歌，就不用等耳机充好电啦～', password: '老师！我的耳机大奖呢！', grand: true},
};
const labels: Record<Prize, string> = {milk_tea_fund: '🧋 奶茶基金', meal_fund: '🍚 吃饭基金', no_prize: '🥺 未中奖', earbuds_grand_prize: '🎧 一起听歌的耳机！'};

export function PrizeCard({prize, compact = false}: {prize: Prize; compact?: boolean}) {
  const info = prizeInfo[prize], won = prize !== 'no_prize';
  return <section className={`grand-coupon ${compact ? 'coupon-compact' : ''} ${won ? '' : 'coupon-empty'}`} aria-label={won ? '礼物奖励兑换券' : '抽奖结果卡'}>
    <div className="coupon-top"><span>礼物偏好研究所</span><span>一份小小的心意 ♡</span></div>
    <div className="coupon-heading">{won ? '🎉 恭喜通关！' : '抽奖完成啦！'}</div>
    <p className="coupon-subtitle">{info.subtitle}</p>
    <div className="coupon-art" aria-hidden="true"><span>✧</span><span className="coupon-headphones">{info.icon}</span><span>✦</span></div>
    <h2>{info.name} {won && <span>× 1</span>}</h2>
    <div className="coupon-story">
      <p>{info.story}</p>
      {info.grand && <p>希望我们还能一起听好多好多好听的歌！<br/>谢谢你陪我完成这场小小的礼物冒险 ♡</p>}
    </div>
    {won && <><div className="coupon-perforation" aria-hidden="true"/>
      <div className="coupon-redeem">
        <span className="gold-seal" aria-label={info.grand ? '超级大奖金色印章' : '幸运礼物金色印章'}>✦<br/>{info.grand ? '超级大奖' : '幸运礼物'}</span>
        <h3>🎟️ {info.grand ? '超级大奖' : '幸运礼物'}兑换券</h3>
        <p>请凭本页面截图，前往寻找<br/><strong>李湘伦</strong><br/>领取你的专属礼物！</p>
        <div className="coupon-password"><span>兑换暗号</span><b>「{info.password}」</b></div>
      </div></>}
    <small>{won ? '恭喜幸运小猫！本次奖励由李老师友情赞助 🎁' : '谢谢幸运小猫陪我完成这场小小的礼物冒险 ♡'}</small>
  </section>;
}

function point(angle: number, radius: number) {
  const rad = angle * Math.PI / 180;
  return {x: 180 + radius * Math.sin(rad), y: 180 - radius * Math.cos(rad)};
}
function wedge(start: number, end: number) {
  const a = point(start, 168), b = point(end, 168);
  return `M180 180 L${a.x} ${a.y} A168 168 0 ${end - start > 180 ? 1 : 0} 1 ${b.x} ${b.y} Z`;
}
const initialMessage = {face: '🐱', title: '嘘，小猫藏了一个惊喜…', text: '通关专属的 3 次机会，准备好了吗？', hint: '每次都由转盘决定，最后为你保留最棒的奖励。'};
const revealMessages: Record<Outcome, {face: string; title: string; text: string; hint: string}> = {
  milk_tea_fund: {face: '😸', title: '甜甜的好运来啦！', text: '恭喜获得奶茶基金 × 1！', hint: '先替你收好，继续看看还有什么惊喜～'},
  meal_fund: {face: '😸', title: '哇！转到好吃的啦！', text: '恭喜获得吃饭基金 × 1！', hint: '先替你收好，继续看看还有什么惊喜～'},
  extra_spin: {face: '🙀', title: '诶诶诶？触发隐藏加抽机会！', text: '这次不消耗正式抽奖次数，再来一次！', hint: '免费加抽可以继续遇到免费加抽，直到揭晓本次结果。'},
  no_prize: {face: '🥺', title: '啊啊啊！差一点点！！', text: '这一抽暂时没有奖品～', hint: '没关系，剩下的机会还可能藏着惊喜！'},
  earbuds_grand_prize: {face: '😻', title: '？？？！！！等等等等——', text: '居然抽到了隐藏超级大奖！！🎉', hint: '看来幸运小猫今天被偏爱了呢！！'},
};
function buttonTitle(state: RewardState) {
  if (state.bonus_active) return '免费再抽一次！';
  return state.formal_results.length === 0 ? '开始抽奖' : state.formal_results.length === 2 ? '最后一抽！🎁' : '继续抽奖！✨';
}
function formalDraws(history: Outcome[]) {
  const draws: {prize: Prize; extras: number}[] = [];
  let extras = 0;
  for (const outcome of history) {
    if (outcome === 'extra_spin') extras++;
    else {draws.push({prize: outcome, extras}); extras = 0;}
  }
  return draws;
}
function randomForOutcome(outcome: Outcome) {
  const sector = sectors.find(s => s.id === outcome)!;
  return Math.floor((((sector.start + sector.end) / 2) / 360) * 0x100000000);
}
function Celebration({grand = false}: {grand?: boolean}) {
  return <div className={`wheel-confetti ${grand ? 'grand-confetti' : ''}`} aria-hidden="true">
    {Array.from({length: grand ? 28 : 10}, (_, i) =>
      <span key={i} style={{
        '--x': `${(i * 37) % 100}%`, '--drift': `${(i % 2 ? 1 : -1) * (18 + i % 5 * 7)}px`,
        '--delay': `${i % 7 * 0.09}s`, '--color': ['#d999af', '#d9b455', '#b7a0ca', '#a8c6b2'][i % 4],
      } as CSSProperties}>{i % 3 ? '✦' : '●'}</span>)}
  </div>;
}
function Wheel({state, onStart, onFinish}: {
  state: RewardState; onStart: () => void; onFinish: (spin: PendingSpin) => void;
}) {
  const disc = useRef<HTMLDivElement>(null);
  const pending = state.pending;
  useEffect(() => {
    if (!pending || !disc.current) return;
    const elapsed = Math.max(0, Date.now() - pending.started_at);
    let animation: Animation | undefined;
    if (elapsed < pending.duration) {
      // One transform, one easing curve; no per-frame React renders.
      animation = disc.current.animate?.([
        {transform: `rotate(${pending.from}deg)`}, {transform: `rotate(${pending.to}deg)`},
      ], {duration: pending.duration, easing: 'cubic-bezier(.12,.72,.12,1)', fill: 'forwards'});
      if (animation) animation.currentTime = elapsed;
    }
    const finish = () => onFinish(pending);
    const timer = window.setTimeout(finish, Math.max(0, pending.duration - elapsed) + 32);
    const resume = () => {if (document.visibilityState === 'visible') finish();};
    // Timers can be suspended by mobile browsers; wall-clock state is authoritative.
    document.addEventListener('visibilitychange', resume);
    window.addEventListener('pageshow', finish);
    return () => {
      window.clearTimeout(timer); animation?.cancel();
      document.removeEventListener('visibilitychange', resume); window.removeEventListener('pageshow', finish);
    };
  }, [pending, onFinish]);
  const done = state.formal_results.length === 3, grand = done && state.final_prize === 'earbuds_grand_prize';
  const lastOutcome = state.spin_history.at(-1);
  return <div className={`wheel-stage ${pending ? 'is-spinning' : ''} ${grand ? 'is-grand' : ''}`}>
    <div className="wheel-halo" aria-hidden="true"/>
    <div className="wheel-pointer" aria-label="固定顶部指针"><span>♥</span></div>
    <div className="wheel-rim">
      <div className="wheel-disc" ref={disc} style={{transform: `rotate(${pending?.to ?? state.rotation}deg)`}}
        data-outcome={pending ? 'spinning' : lastOutcome || 'ready'}>
        <svg viewBox="0 0 360 360" role="img" aria-label="幸运礼物转盘：奶茶基金、吃饭基金、再抽一次、未中奖、一起听歌的耳机">
          <circle cx="180" cy="180" r="178" fill="#fffaf2"/>
          {sectors.map(s => {
            const middle = (s.start + s.end) / 2;
            const pos = point(middle, 118), rare = s.id === 'earbuds_grand_prize';
            return <g key={s.id} data-sector={s.id} data-start={s.start} data-end={s.end}>
              <path d={wedge(s.start, s.end)} fill={s.color} stroke="#fffaf2" strokeWidth="2"/>
              <g transform={`translate(${pos.x} ${pos.y}) rotate(${middle})`} textAnchor="middle">
                <text y={rare ? -10 : -4} fontSize={rare ? 25 : 30}>{s.icon}</text>
                {s.lines.map((line, i) => <text key={line} y={17 + i * 14} fontSize={rare ? 11 : 13} fontWeight="650" fill="#594550">{line}</text>)}
                {rare && <text y="-36" fontSize="13" fill="#926b20">✧</text>}
              </g>
            </g>;
          })}
          <circle cx="180" cy="180" r="172" fill="none" stroke="#d6b78f" strokeWidth=".8" strokeDasharray="2 8"/>
        </svg>
      </div>
      <button className="wheel-hub" disabled={!!pending || done} onClick={onStart}
        aria-label={done ? '抽奖结果已揭晓' : pending ? '转盘旋转中' : buttonTitle(state)}>
        <Cat size={30} strokeWidth={1.5}/><span>{done ? '好耶！' : pending ? '许个愿' : 'GO'}</span>
      </button>
    </div>
    {!pending && lastOutcome && !['extra_spin', 'no_prize'].includes(lastOutcome) && <Celebration key={state.settled_spins} grand={grand}/>}
    <span className="wheel-twinkle one" aria-hidden="true">✧</span><span className="wheel-twinkle two" aria-hidden="true">✦</span>
  </div>;
}

export default function RewardExperience({sessionId, onCapture}: {sessionId: string; onCapture: (prize: Prize) => void}) {
  const [initial] = useState(() => loadReward(sessionId));
  const [state, setState] = useState(initial.state), [error, setError] = useState(initial.error);
  const [replay, setReplay] = useState(false);
  const view = useRef(state), saved = useRef(state), replaying = useRef(false), unlockAt = useRef(0);
  const replayPlan = useRef<Outcome[]>([]);
  const root = useRef<HTMLElement>(null);
  const publish = useCallback((next: RewardState) => {
    view.current = next; setState(next);
    if (!replaying.current) {
      saved.current = next;
      setError(saveReward(next) ? null : '浏览器暂时存不了奖励进度。请留在本页完成，再截图保存兑换券。');
    }
  }, []);
  const latest = useCallback(() => {
    if (replaying.current) return view.current;
    const fresh = loadReward(sessionId);
    // Never let an unavailable/older local save roll back in-memory progress.
    if (fresh.error || fresh.state.settled_spins < saved.current.settled_spins ||
      (fresh.state.settled_spins === saved.current.settled_spins && saved.current.pending && !fresh.state.pending)) return saved.current;
    return fresh.state;
  }, [sessionId]);
  const finish = useCallback((spin: PendingSpin) => {
    const current = latest();
    if (current.pending?.step !== spin.step || current.pending.started_at !== spin.started_at) return;
    const next = settleSpin(current, spin.step, Date.now());
    if (next !== current) {unlockAt.current = Date.now() + 350; publish(next);}
  }, [latest, publish]);
  useEffect(() => {
    const sync = (event: StorageEvent) => {
      if (event.key !== rewardKey(sessionId) || replaying.current) return;
      const next = latest();
      saved.current = next; view.current = next; setState(next);
    };
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, [latest, sessionId]);
  function start() {
    if (Date.now() < unlockAt.current) return;
    const current = latest();
    try {
      const forced = replaying.current ? replayPlan.current[current.spin_history.length] : undefined;
      const next = startSpin(current, Date.now(), window.matchMedia('(prefers-reduced-motion: reduce)').matches,
        forced ? () => randomForOutcome(forced) : undefined);
      if (next !== current) publish(next);
    } catch {
      setError('浏览器暂时无法生成安全的随机结果，请换用 Safari 或 Chrome 后再试。');
    }
  }
  function watchAgain() {
    replayPlan.current = [...saved.current.spin_history];
    replaying.current = true; setReplay(true);
    publish(newReward(sessionId)); unlockAt.current = 0;
    root.current?.scrollIntoView({behavior: 'instant', block: 'start'});
  }
  function leaveReplay() {
    replaying.current = false; setReplay(false);
    const next = resumeReward(latest(), Date.now());
    view.current = next; setState(next);
  }
  const lastOutcome = state.spin_history.at(-1), message = lastOutcome ? revealMessages[lastOutcome] : initialMessage;
  const spinning = !!state.pending, done = state.formal_results.length === 3;
  const draws = formalDraws(state.spin_history);
  return <section ref={root} className="reward-experience" aria-label="通关幸运大转盘">
    <div className="wheel-heading"><span className="wheel-unlocked"><Sparkles size={14}/> 隐藏关卡 · 已解锁</span>
      <h2>幸运礼物大转盘</h2><p>小猫的好运，现在开始转动 ♡</p></div>
    {replay && <div className="replay-banner">正在重温惊喜 · 已有奖品保持不变<button onClick={leaveReplay}>返回我的大奖</button></div>}
    {error && <p className="reward-storage-error" role="alert">{error}</p>}
    <div className="wheel-chances" aria-live="polite">
      <span>{replay ? '惊喜回放' : '通关礼遇'}</span><strong>还剩 {remainingChances(state)} 次正式机会</strong>
      <span className="chance-dots" aria-hidden="true">{[0, 1, 2].map(i => <i key={i} className={i < remainingChances(state) ? 'available' : ''}>✦</i>)}</span>
    </div>
    <Wheel state={state} onStart={start} onFinish={finish}/>
    <div className={`spin-message ${spinning ? 'waiting' : `reveal result-${state.settled_spins}`}`} key={`${state.settled_spins}-${spinning}`} role="status" aria-live="polite">
      <span className="reaction-cat" aria-hidden="true">{spinning ? '🐱' : message.face}</span>
      <h3>{spinning ? !state.pending?.is_bonus && state.formal_results.length === 2 ? '最后一抽…小猫屏住呼吸！' : '咕噜咕噜，好运转动中…' : message.title}</h3>
      <p>{spinning ? '让惊喜再飞一小会儿～' : message.text}</p>
      <small>{spinning ? state.pending?.is_bonus ? '这是免费加抽，不消耗正式机会。' : '指针停下，就揭晓答案。' : message.hint}</small>
      {spinning && !state.pending?.is_bonus && state.formal_results.length === 2 && <span className="last-spin-suspense">最后一次机会，会停在哪里呢… ✧</span>}
    </div>
    {!done && <button className="primary wheel-start" disabled={spinning} onClick={start}>{spinning ? '惊喜正在路上…' : buttonTitle(state)}</button>}
    {done && <div className="prize-reveal">
      <PrizeCard prize={state.final_prize!}/>
      <div className="prize-actions"><button className="primary" onClick={() => onCapture(state.final_prize!)}><Camera size={18}/>{state.final_prize === 'no_prize' ? '保存抽奖结果' : '保存中奖截图'}</button>
        <button className="secondary" onClick={replay ? leaveReplay : watchAgain}><RotateCcw size={17}/>{replay ? '返回我的大奖' : '重新观看惊喜'}</button></div>
      <section className="draw-history" aria-label="本次抽奖记录"><h3>本次抽奖记录</h3>
        <ol>{draws.map((draw, i) => <li key={i}><span>第{'一二三'[i]}次</span>{labels[draw.prize]}{draw.extras > 0 && <small>（触发 {draw.extras} 次免费加抽）</small>}</li>)}</ol>
        <p>系统已自动为你保留最棒的奖励！<br/><small>{state.final_prize === 'no_prize' ? '这次没有可兑换奖品，下次好运一定来。' : `本次兑换：${prizeInfo[state.final_prize!].name} × 1，三次结果不叠加。`}</small></p>
      </section>
    </div>}
    <p className="wheel-footnote">这是感谢你通关的小惊喜，无论是否分享数据，都可以领取。</p>
  </section>;
}
