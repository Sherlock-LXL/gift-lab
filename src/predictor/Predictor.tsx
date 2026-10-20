import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { ArrowLeft, ArrowRight, Cat, Check, Delete, Heart, LockKeyhole, RotateCcw, ShieldCheck, Sparkles } from 'lucide-react';
import { predict, type PredictionModel } from './model';
import { categories, features, feedback, scoreBand } from './rubric';
import { decryptModel, IncorrectPasscode, loadEncryptedModel } from './vault';
import './predictor.css';

const RETRY_KEY = 'gift-lab.predictor.retry.v1';
function readRetry() {
  try {
    const retry = JSON.parse(sessionStorage.getItem(RETRY_KEY) || '{}');
    return {failures: Number.isInteger(retry.failures) ? Math.max(0, Math.min(5, retry.failures)) : 0,
      until: Number.isFinite(retry.until) ? Math.min(retry.until, Date.now() + 30000) : 0};
  } catch { return {failures: 0, until: 0}; }
}

function Unlock({onUnlock, onExit}: {onUnlock: (model: PredictionModel) => void; onExit: () => void}) {
  const [pin, setPin] = useState(''), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const [retry, setRetry] = useState(readRetry), [now, setNow] = useState(Date.now());
  const input = useRef<HTMLInputElement>(null), pinRef = useRef(''), busyRef = useRef(false), request = useRef(0);
  const waiting = retry.until > now;
  useEffect(() => () => {request.current++; pinRef.current = '';}, []);
  useEffect(() => {
    if (!waiting) return;
    const timer = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(timer);
  }, [waiting]);
  const update = useCallback((value: string) => {
    if (busyRef.current || retry.until > Date.now()) return;
    const digits = value.replace(/\D/g, '').slice(0, 6);
    pinRef.current = digits; setPin(digits); setError('');
    if (digits.length !== 6) return;
    busyRef.current = true; setBusy(true);
    const id = ++request.current;
    void (async () => {
      try {
        const model = await decryptModel(digits, await loadEncryptedModel());
        if (request.current !== id) return;
        try {sessionStorage.removeItem(RETRY_KEY);} catch {/* Retry hints are optional. */}
        pinRef.current = ''; setPin(''); onUnlock(model);
      } catch (e) {
        if (request.current !== id) return;
        if (e instanceof IncorrectPasscode) {
          const failures = retry.until ? 1 : retry.failures + 1;
          const next = {failures, until: failures >= 5 ? Date.now() + 30000 : 0};
          setRetry(next); setNow(Date.now());
          try {sessionStorage.setItem(RETRY_KEY, JSON.stringify(next));} catch {/* In-memory protection still applies. */}
        }
        setError(e instanceof Error ? e.message : '暂时无法解锁，请重试。');
        pinRef.current = ''; setPin('');
      } finally {
        if (request.current === id) {
          busyRef.current = false; setBusy(false);
          input.current?.focus({preventScroll: true});
        }
      }
    })();
  }, [onUnlock, retry]);
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if (event.altKey || event.ctrlKey || event.metaKey || event.isComposing) return;
      if (/^\d$/.test(event.key)) {event.preventDefault(); update(pinRef.current + event.key);}
      if (event.key === 'Backspace' || event.key === 'Delete') {event.preventDefault(); update(pinRef.current.slice(0, -1));}
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [update]);
  return <main className="predictor-lock">
    <button className="text-button predictor-back" onClick={onExit}><ArrowLeft size={16}/>返回主页面</button>
    <section className="pin-panel" aria-labelledby="unlock-title">
      <div className="pin-mascot"><Cat size={36} strokeWidth={1.4}/><LockKeyhole size={16}/></div>
      <div className="eyebrow">留给你的，小小预测室</div>
      <h1 id="unlock-title">请输入六位密码</h1>
      <p>解锁之后，看看礼物会有多让人心动。</p>
      <div className={`pin-entry ${error ? 'pin-error' : ''}`} aria-busy={busy}>
        <div className="pin-dots" aria-hidden="true">{Array.from({length: 6}, (_, i) => <i key={i} className={i < pin.length ? 'filled' : ''}/>)}</div>
        <input ref={input} type="password" inputMode="none" autoComplete="off" autoFocus
          aria-label="六位数字密码" aria-describedby="pin-status" value={pin} disabled={busy || waiting}
          onChange={e => update(e.target.value)} onKeyDown={e => {
            if (e.key === 'Enter') e.preventDefault();
          }}/>
      </div>
      <p id="pin-status" className="pin-status" role="status">
        {waiting ? `先休息一下，${Math.ceil((retry.until - now) / 1000)} 秒后再试。` : busy ? '小猫正在为你开门…' : error || `已输入 ${pin.length} / 6 位 · 也可以直接用键盘输入`}
      </p>
      <div className="pin-keypad" role="group" aria-label="数字密码键盘">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => <button key={n} className="pin-key" disabled={busy || waiting}
          aria-label={`数字 ${n}`} onClick={() => update(pinRef.current + n)}>{n}</button>)}
        <span aria-hidden="true"/>
        <button className="pin-key" disabled={busy || waiting} aria-label="数字 0" onClick={() => update(pinRef.current + '0')}>0</button>
        <button className="pin-delete" disabled={busy || waiting || !pin} aria-label="删除一位" onClick={() => update(pinRef.current.slice(0, -1))}><Delete size={22}/></button>
      </div>
      <p className="pin-footer"><ShieldCheck size={14}/>退出或刷新后会重新锁定</p>
    </section>
  </main>;
}

function ParameterPanel({model, onLock, onExit}: {model: PredictionModel; onLock: () => void; onExit: () => void}) {
  const [scores, setScores] = useState<number[]>([5, 5, 5, 5, 5, 5, 5]);
  const [category, setCategory] = useState<number | null>(null);
  const [result, setResult] = useState<{score: number; scores: number[]; category: number} | null>(null);
  const [error, setError] = useState('');
  const resultRef = useRef<HTMLElement>(null);
  const dirty = !!result && (result.category !== category || result.scores.some((n, i) => n !== scores[i]));
  const band = result && scoreBand(result.score), advice = result && feedback(result.scores, result.category);
  const change = (index: number, value: number) => {
    setScores(current => current.map((n, i) => i === index ? Math.max(0, Math.min(10, value)) : n));
    setError('');
  };
  function calculate() {
    if (category === null) {setError('先选一个礼物类型，再来看看吧。'); return;}
    try {
      setResult({score: predict(model, scores, category).score, scores: [...scores], category}); setError('');
      if (window.innerWidth <= 760) window.requestAnimationFrame(() =>
        resultRef.current?.scrollIntoView({behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start'}));
    } catch (e) {setError((e as Error).message);}
  }
  return <main className="predictor-page">
    <div className="predictor-navigation">
      <button className="text-button" onClick={onExit}><ArrowLeft size={16}/>返回主页面</button>
      <button className="text-button" onClick={onLock}><LockKeyhole size={15}/>锁定并退出</button>
    </div>
    <header className="predictor-heading">
      <div className="eyebrow"><Sparkles size={14}/> 一份礼物，七点小小考量</div>
      <h1>礼物喜好预测 <span>✧</span></h1>
      <p>想好一份礼物，把你了解的情况轻轻滑给小猫。</p>
    </header>
    <div className="predictor-columns">
      <form className="predictor-controls" onSubmit={e => {e.preventDefault(); calculate();}}>
        <fieldset className="predictor-categories">
          <legend><span>01</span> 礼物属于哪一类？</legend>
          <div className="predictor-category-grid">{categories.map((item, index) =>
            <label key={item.name} className={category === index ? 'chosen' : ''}>
              <input type="radio" name="gift-category" value={index} checked={category === index} onChange={() => {setCategory(index); setError('');}}/>
              <span aria-hidden="true">{item.icon}</span><b>{item.name}</b>{category === index && <Check size={12} className="category-tick"/>}
            </label>)}</div>
        </fieldset>
        <fieldset className="predictor-scores">
          <legend><span>02</span> 给这份礼物一点线索 <small>0–10 分 · 每格 0.5</small></legend>
          <p className="predictor-score-hint">分数越高越符合；滑块初始在 5 分，请按了解的情况调整。</p>
          {features.map((feature, index) => <div className="predictor-slider-row" key={feature.label}>
            <div className="slider-heading"><label htmlFor={`prediction-${index}`}>{feature.label}<small>{feature.hint}</small></label>
              <output htmlFor={`prediction-${index}`}>{scores[index].toFixed(1)}<span> / 10</span></output></div>
            <div className="slider-track">
              <button type="button" aria-label={`${feature.label}减 0.5 分`} disabled={scores[index] === 0} onClick={() => change(index, scores[index] - .5)}>−</button>
              <input id={`prediction-${index}`} type="range" min="0" max="10" step="0.5" value={scores[index]}
                aria-valuetext={`${scores[index].toFixed(1)} 分，满分 10 分`} aria-describedby={`prediction-guide-${index}`}
                style={{'--fill': `${scores[index] * 10}%`} as CSSProperties} onChange={e => change(index, Number(e.target.value))}/>
              <button type="button" aria-label={`${feature.label}加 0.5 分`} disabled={scores[index] === 10} onClick={() => change(index, scores[index] + .5)}>+</button>
            </div>
            <div id={`prediction-guide-${index}`} className="slider-anchors"><span>{feature.low}</span><span>{feature.high}</span></div>
          </div>)}
        </fieldset>
        {error && <p className="prediction-error" role="alert">{error}</p>}
        <div className="prediction-actions"><button className="primary" type="submit"><Sparkles size={17}/>看看有多心动<ArrowRight size={18}/></button>
          <button className="text-button" type="button" onClick={() => {setScores([5, 5, 5, 5, 5, 5, 5]); setCategory(null); setResult(null); setError('');}}><RotateCcw size={14}/>重置参数</button></div>
      </form>
      <aside className="prediction-result" ref={resultRef} aria-label="礼物预测结果" tabIndex={-1}>
        <div className="prediction-kicker"><Heart size={15}/> 小猫的心动参考</div>
        {result && band && advice ? <>
          <div className="prediction-gift" aria-hidden="true">{categories[result.category].icon}<span>✧</span></div>
          <p className="prediction-result-label">预计喜欢指数 · {categories[result.category].name}</p>
          <div className="prediction-value" aria-label={`预计喜欢指数 ${result.score.toFixed(2)} 分`}><strong>{result.score.toFixed(2)}</strong><span>/ 10</span></div>
          <div className="prediction-meter" aria-hidden="true"><span style={{width: `${result.score * 10}%`}}/></div>
          <h2>{band.title}</h2><p className="prediction-description">{band.description}</p>
          {dirty && <p className="prediction-stale" role="status">参数已调整，点「看看有多心动」更新结果。</p>}
          <section><h3>这份礼物的优势</h3><p>{advice.strength}</p></section>
          <section><h3>再多想一点点</h3><ul>{advice.suggestions.map(text => <li key={text}>{text}</li>)}</ul></section>
          <section><h3>挑选小提醒</h3><p>{advice.categoryTip}</p></section>
        </> : <div className="prediction-empty"><Cat size={66} strokeWidth={1.1}/><span className="empty-star">✧</span><h2>这份心意，会让人开心吗？</h2>
          <p>选好类型，调整七项评分，<br/>小猫就来帮你估一估。</p><span className="prediction-placeholder">— <small>/ 10</small></span></div>}
        <p className="prediction-note">预测来自已有模型与当前评分，只作参考。优势和建议按你输入的分数整理，不能代替对对方的真实了解。</p>
        <div className="prediction-local"><ShieldCheck size={13}/>输入和结果只留在本次页面，退出即清空</div>
        <button className="text-button predictor-result-exit" onClick={onExit}><ArrowLeft size={15}/>返回主页面</button>
      </aside>
    </div>
  </main>;
}

export default function Predictor({onExit}: {onExit: () => void}) {
  const [model, setModel] = useState<PredictionModel | null>(null), [lockVersion, setLockVersion] = useState(0);
  const lock = useCallback(() => {setModel(null); setLockVersion(n => n + 1);}, []);
  useEffect(() => {
    const hidden = () => {if (document.visibilityState === 'hidden') lock();};
    const escape = (e: KeyboardEvent) => {if (e.key === 'Escape') {e.preventDefault(); onExit();}};
    document.addEventListener('visibilitychange', hidden);
    window.addEventListener('pagehide', lock); window.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('visibilitychange', hidden);
      window.removeEventListener('pagehide', lock); window.removeEventListener('keydown', escape);
    };
  }, [lock, onExit]);
  return model ? <ParameterPanel model={model} onLock={lock} onExit={onExit}/> :
    <Unlock key={lockVersion} onUnlock={setModel} onExit={onExit}/>;
}
