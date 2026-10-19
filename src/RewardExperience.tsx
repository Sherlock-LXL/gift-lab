import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { Camera, Cat, RotateCcw, Sparkles } from 'lucide-react';
import {
  loadReward, newReward, remainingChances, resumeReward, rewardKey, saveReward, script, sectors,
  settleSpin, startSpin, type PendingSpin, type RewardState,
} from './rewardMachine';
import './reward.css';

export function GrandPrizeCard({compact = false}: {compact?: boolean}) {
  return <section className={`grand-coupon ${compact ? 'coupon-compact' : ''}`} aria-label="超级大奖兑换券">
    <div className="coupon-top"><span>礼物偏好研究所</span><span>一份小小的心意 ♡</span></div>
    <div className="coupon-heading">🎉 恭喜通关！</div>
    <p className="coupon-subtitle">幸运小猫获得了隐藏超级大奖！</p>
    <div className="coupon-art" aria-hidden="true"><span>✧</span><span className="coupon-headphones">🎧</span><span>✦</span></div>
    <h2>一起听歌的耳机 <span>× 1</span></h2>
    <div className="coupon-story">
      <p>以后听喜欢的歌，<br/>就不用等耳机充好电啦～</p>
      <p>希望我们还能一起听好多好多好听的歌！<br/>谢谢你陪我完成这场小小的礼物冒险 ♡</p>
    </div>
    <div className="coupon-perforation" aria-hidden="true"/>
    <div className="coupon-redeem">
      <span className="gold-seal" aria-label="超级大奖金色印章">✦<br/>超级大奖</span>
      <h3>🎟️ 超级大奖兑换券</h3>
      <p>请凭本页面截图，前往寻找<br/><strong>李湘伦</strong><br/>领取你的专属耳机礼物！</p>
      <div className="coupon-password"><span>兑换暗号</span><b>「老师！我的耳机大奖呢！」</b></div>
    </div>
    <small>恭喜幸运小猫！本次奖励由李老师友情赞助 🎁</small>
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
const titles = ['开始抽奖', '继续抽奖！✨', '免费再抽一次！', '最后一抽！🎁'];
const messages = [
  {face: '🐱', title: '嘘，小猫藏了一个惊喜…', text: '通关专属的 3 次机会，准备好了吗？', hint: '最后会为你保留三次里最棒的奖励。'},
  {face: '😸', title: '哇！第一发就有收获！', text: '恭喜获得吃饭基金 × 1！', hint: '还有两次机会，说不定有更厉害的哦～'},
  {face: '🙀', title: '诶诶诶？触发隐藏加抽机会！', text: '这次不消耗正式抽奖次数，再来一次！', hint: '吃饭基金已收好，免费转动的结果将记入第二次。'},
  {face: '🥺', title: '啊啊啊！怎么这样！！', text: '没关系！最后一次机会还在！！', hint: '吃饭基金还在。说不定真正的惊喜在最后呢？'},
  {face: '😻', title: '？？？！！！等等等等——', text: '居然抽到了隐藏超级大奖！！🎉', hint: '看来幸运小猫今天被偏爱了呢！！'},
];
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
  const grand = state.settled_spins === 4;
  return <div className={`wheel-stage ${pending ? 'is-spinning' : ''} ${grand ? 'is-grand' : ''}`}>
    <div className="wheel-halo" aria-hidden="true"/>
    <div className="wheel-pointer" aria-label="固定顶部指针"><span>♥</span></div>
    <div className="wheel-rim">
      <div className="wheel-disc" ref={disc} style={{transform: `rotate(${pending?.to ?? state.rotation}deg)`}}
        data-outcome={pending ? 'spinning' : state.settled_spins ? script[state.settled_spins - 1].outcome : 'ready'}>
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
      <button className="wheel-hub" disabled={!!pending || grand} onClick={onStart}
        aria-label={grand ? '超级大奖已揭晓' : pending ? '转盘旋转中' : titles[state.settled_spins]}>
        <Cat size={30} strokeWidth={1.5}/><span>{grand ? '好耶！' : pending ? '许个愿' : 'GO'}</span>
      </button>
    </div>
    {!pending && (state.settled_spins === 1 || grand) && <Celebration key={state.settled_spins} grand={grand}/>}
    <span className="wheel-twinkle one" aria-hidden="true">✧</span><span className="wheel-twinkle two" aria-hidden="true">✦</span>
  </div>;
}

export default function RewardExperience({sessionId, onCapture}: {sessionId: string; onCapture: () => void}) {
  const [initial] = useState(() => loadReward(sessionId));
  const [state, setState] = useState(initial.state), [error, setError] = useState(initial.error);
  const [replay, setReplay] = useState(false);
  const view = useRef(state), saved = useRef(state), replaying = useRef(false), unlockAt = useRef(0);
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
    const next = startSpin(current, Date.now(), window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    if (next !== current) publish(next);
  }
  function watchAgain() {
    replaying.current = true; setReplay(true);
    publish(newReward(sessionId)); unlockAt.current = 0;
    root.current?.scrollIntoView({behavior: 'instant', block: 'start'});
  }
  function leaveReplay() {
    replaying.current = false; setReplay(false);
    const next = resumeReward(latest(), Date.now());
    view.current = next; setState(next);
  }
  const message = messages[state.settled_spins], spinning = !!state.pending, done = state.settled_spins === 4;
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
      <h3>{spinning ? state.settled_spins === 3 ? '最后一抽…小猫屏住呼吸！' : '咕噜咕噜，好运转动中…' : message.title}</h3>
      <p>{spinning ? '让惊喜再飞一小会儿～' : message.text}</p>
      <small>{spinning ? state.settled_spins === 2 ? '这是免费加抽，最后一次正式机会还在。' : '指针停下，就揭晓答案。' : message.hint}</small>
      {spinning && state.settled_spins === 3 && <span className="last-spin-suspense">等等…好像有什么在发光 ✧</span>}
    </div>
    {!done && <button className="primary wheel-start" disabled={spinning} onClick={start}>{spinning ? '惊喜正在路上…' : titles[state.settled_spins]}</button>}
    {done && <div className="prize-reveal">
      <GrandPrizeCard/>
      <div className="prize-actions"><button className="primary" onClick={onCapture}><Camera size={18}/>保存中奖截图</button>
        <button className="secondary" onClick={replay ? leaveReplay : watchAgain}><RotateCcw size={17}/>{replay ? '返回我的大奖' : '重新观看惊喜'}</button></div>
      <section className="draw-history" aria-label="本次抽奖记录"><h3>本次抽奖记录</h3>
        <ol><li><span>第一次</span>🍚 吃饭基金</li><li><span>第二次</span>🥺 未中奖 <small>（触发过额外抽奖）</small></li><li><span>第三次</span>🎧 一起听歌的耳机！</li></ol>
        <p>系统已自动为你保留最棒的奖励！<br/><small>本次兑换：耳机 × 1，三次结果不叠加。</small></p>
      </section>
    </div>}
    <p className="wheel-footnote">这是感谢你通关的小惊喜，无论是否分享数据，都可以领取。</p>
  </section>;
}
