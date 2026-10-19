import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Cat, Check, ChevronLeft, Clock3, Copy, Download, Gift as GiftIcon, Heart, Leaf, MoreHorizontal, RotateCcw, Share2, ShieldCheck, Sparkles, X } from 'lucide-react';
import { bank, choose, giftById, newSession, progress, rate, savePreference, STORAGE_KEY, summarize } from './engine';
import { radar, reasonsFor, specialOptions } from './data/radar';
import { copyData, download, exportJSON, loadSession, saveSession, shareFile } from './storage';
import type { AnswerStatus, Gift, Preference, Session } from './types';
import RewardExperience, { PrizeCard } from './RewardExperience';
import { clearRewards, type Prize } from './rewardMachine';

function GiftArt({gift,small=false}:{gift:Gift;small?:boolean}) {
  return <div className={`gift-art ${small?'small':''}`} data-category={bank.categories.indexOf(gift.category)}>
    <span className="art-orbit"/><span className="art-star a">✧</span>
    <span role="img" aria-label={gift.name} className="gift-emoji">{gift.icon}</span><span className="art-star b">✦</span>
  </div>;
}
function Price({gift}:{gift:Gift}) {return <span className="price">约 ¥{gift.price_cny[0]}–{gift.price_cny[1]}</span>;}
function Welcome({session,onStart,onResume}:{session:Session|null;onStart:()=>void;onResume:()=>void}) {
  return <main className="welcome">
    <section className="welcome-copy">
      <div className="eyebrow"><span/> 一份关于你的，小小好奇</div>
      <h1>礼物偏好<br/><span>研究所</span><span className="title-star">✳</span></h1>
      <p className="subtitle">来看看什么东西最能戳中你的心吧！</p>
      <p className="intro">这里有一些可可爱爱的小东西，<br/>选出你喜欢的就好啦。<br/>没有标准答案，跟着感觉走～</p>
      <div className="pills"><span><Clock3 size={15}/> 大概 10 分钟</span><span><GiftIcon size={15}/> 最后有个小惊喜</span></div>
      <button className="primary start" onClick={session?onResume:onStart}>{session?'继续我的小冒险':'开启我的小冒险'}<ArrowRight size={20}/></button>
      {session && <p className="resume-note">已经完成 {progress(session)}% · 上次的选择都在</p>}
      <p className="privacy"><ShieldCheck size={16}/><span>你的选择只保存在本机。完成后，可以自己决定是否分享给小游戏作者，用于礼物偏好 AI 实验。开始即同意本机保存，任何题都可以跳过。</span></p>
    </section>
    <section className="hero-art" aria-label="小猫和礼物盒">
      <div className="art-label">小小快乐收集计划</div>
      <span className="float heart-one">♡</span><span className="float star-one">✧</span>
      <div className="speech">今天来当一次<br/>礼物小侦探吧！</div>
      <div className="cat-peek"><Cat strokeWidth={1.15}/><span className="cat-blush left"/><span className="cat-blush right"/></div>
      <div className="present"><div className="bow">୨୧</div><div className="lid"/><div className="ribbon"/><Heart className="box-heart" size={30}/></div>
      <span className="float star-two">✦</span><span className="float flower">✿</span>
      <div className="art-bottom"><span>一点点心意</span><span className="dash"/><span>很多小快乐</span></div>
    </section>
    <section className="journey" aria-label="游戏三关">
      {[['01','你的快乐雷达','点点喜欢，认识你的快乐','🌷'],['02','拆礼物盲盒','24 份礼物，哪份让你心动？','🎁'],['03','心动二选一','30 次选择，跟着直觉走','💗']].map(([n,t,d,e])=>
        <div className="journey-item" key={n}><span className="journey-number">{n}</span><div><h3>{t}</h3><p>{d}</p></div><span className="journey-emoji">{e}</span></div>)}
    </section>
    <div className="welcome-footer"><Leaf size={14}/> 不用打字，不用登录，轻轻松松就好。</div>
  </main>;
}
function RadarQuestion({session,onAnswer}:{session:Session;onAnswer:(p:Preference)=>void}) {
  const q=radar[session.cursor.index];
  const [draft,setDraft]=useState<Preference>(session.preferences[q.id] || {question_id:q.id,positive:[],negative:[],uncertain:[],skipped:false,answered_at:''});
  function toggle(id:string,special=false) {
    setDraft(d=>{
      const n={...d,positive:[...d.positive],negative:[...d.negative],uncertain:[...d.uncertain],skipped:false};
      if(special){
        const active=n.uncertain.includes(id);
        n.positive=[];n.negative=[];n.uncertain=active?[]:[id];
      } else {
        n.uncertain=n.uncertain.filter(v=>!specialOptions[q.id].includes(v));
        if(q.id==='brands'){
          if(n.positive.includes(id)){n.positive=n.positive.filter(v=>v!==id);n.negative.push(id);}
          else if(n.negative.includes(id)){n.negative=n.negative.filter(v=>v!==id);n.uncertain.push(id);}
          else if(n.uncertain.includes(id)){n.uncertain=n.uncertain.filter(v=>v!==id);}
          else n.positive.push(id);
        } else {
          const field=q.id==='avoid'?'negative':'positive';
          n[field]=n[field].includes(id)?n[field].filter(v=>v!==id):[...n[field],id];
        }
      }
      return n;
    });
  }
  const hasSelection=draft.positive.length+draft.negative.length+draft.uncertain.length>0;
  return <section className="question radar-question">
    <div className="chapter"><span>01</span> 你的快乐雷达</div>
    <h1>{q.title}</h1><p className="question-sub">{q.sub}</p>
    <div className={`option-grid ${q.id==='colors'?'colors':''}`}>
      {q.options.map(([id,icon,label])=>{
        const status=draft.positive.includes(id)?'positive':draft.negative.includes(id)?'negative':draft.uncertain.includes(id)?'uncertain':'';
        return <button key={id} className={`option ${status}`} aria-pressed={!!status} onClick={()=>toggle(id)}>
          {icon.startsWith('#')?<span className="color-swatch" style={{background:icon}}/>:<span className="option-icon">{icon}</span>}
          <span>{label}{q.id==='brands' && <small>{status==='positive'?'喜欢':status==='negative'?'不喜欢':status==='uncertain'?'没听说过':'点选你的感觉'}</small>}</span>
          {!!status && <Check className="option-check" size={16}/>}
        </button>;
      })}
    </div>
    <div className="specials">{specialOptions[q.id].map(t=><button key={t} aria-pressed={draft.uncertain.includes(t)} className={draft.uncertain.includes(t)?'selected':''} onClick={()=>toggle(t,true)}>{t}</button>)}</div>
    <button className="primary" disabled={!hasSelection} onClick={()=>onAnswer({...draft,answered_at:new Date().toISOString()})}>{session.cursor.index===6?'去拆礼物啦':'选好啦，下一步'}<ArrowRight size={18}/></button>
    <button className="text-button skip" onClick={()=>onAnswer({question_id:q.id,positive:[],negative:[],uncertain:[],skipped:true,answered_at:new Date().toISOString()})}>这题先跳过</button>
  </section>;
}
function RatingQuestion({session,onRate}:{session:Session;onRate:(score:number|null,status:AnswerStatus)=>void}) {
  const gift=giftById.get(session.plan.ratings[session.cursor.index].gift_id)!;
  const answer=session.gift_ratings.find(a=>a.gift_id===gift.id);
  return <section className="question rating-question">
    <div className="chapter"><span>02</span> 拆礼物盲盒</div>
    <div className="gift-card"><GiftArt gift={gift}/><div className="gift-info"><span className="gift-kicker">一份小小的礼物</span><h1>{gift.name}</h1><p>{gift.description}</p><Price gift={gift}/></div></div>
    <h2 className="rating-prompt">如果有人送你这个，<br/>你会有多开心？</h2>
    <div className="scale-labels"><span>不太开心</span><Heart size={14}/><span>超级开心</span></div>
    <div className="score-grid" role="group" aria-label="开心程度，0 到 10 分">
      {Array.from({length:11},(_,n)=><button key={n} aria-label={`${n} 分`} aria-pressed={answer?.rating===n} className={`score ${answer?.rating===n?'selected':''}`} onClick={()=>onRate(n,'rated')}>{n}</button>)}
    </div>
    <p className="tap-hint">点一下就记好啦 · 随时可以返回修改</p>
    <div className="answer-alternatives"><button onClick={()=>onRate(null,'uncertain')}>不确定</button><button onClick={()=>onRate(null,'unfamiliar')}>不了解这个</button><button onClick={()=>onRate(null,'skipped')}>跳过</button></div>
    {answer && <p className="old-answer">上次的选择：{answer.rating!==null?`${answer.rating} 分`:{uncertain:'不确定',unfamiliar:'不了解',skipped:'跳过',rated:''}[answer.status]}</p>}
  </section>;
}
function PairQuestion({session,onChoose}:{session:Session;onChoose:(chosen:'left'|'right'|'tie'|'neither'|'unknown',skip?:boolean)=>void}) {
  const plan=session.plan.pairs[session.cursor.index],answer=session.pairwise_choices.find(a=>a.pair_id===plan.pair_id);
  return <section className="question pair-question">
    <div className="chapter"><span>03</span> 心动二选一</div><h1>这两个，<br/>你更心动哪个？</h1>
    <p className="question-sub">想象收到它们的那一刻，凭感觉选就好。</p>
    <div className="pair-cards">
      {(['left','right'] as const).map((side,i)=>{
        const gift=giftById.get(side==='left'?plan.left_gift_id:plan.right_gift_id)!;
        return <button key={side} className={`pair-card ${answer?.chosen===side?'selected':''}`} onClick={()=>onChoose(side)} aria-label={`选择${i?'右边':'左边'}：${gift.name}`}>
          <GiftArt gift={gift} small/><div className="pair-info"><span className="pair-letter">{i?'B':'A'}</span><h2>{gift.name}</h2><p>{gift.description}</p><Price gift={gift}/><span className="choose-hint">更喜欢这个 <Heart size={14}/></span></div>
        </button>;
      })}
    </div>
    <div className="pair-alternatives"><button onClick={()=>onChoose('tie')}>都很喜欢 / 差不多</button><button onClick={()=>onChoose('neither')}>都不喜欢</button></div>
    <div className="answer-alternatives"><button onClick={()=>onChoose('unknown')}>不确定</button><button onClick={()=>onChoose('unknown',true)}>这组先跳过</button></div>
    {answer && <p className="old-answer">上次的选择：{{left:'左边',right:'右边',tie:'差不多',neither:'都不喜欢',unknown:answer.skipped?'跳过':'不确定'}[answer.chosen]}</p>}
    <p className="pair-footnote">价格是大致范围，图标仅帮助理解。条件以文字为准。</p>
  </section>;
}
function Result({session,onCapture,onPrizeCapture,onDownload,onShare,onCopy,onRestart}:{session:Session;onCapture:()=>void;onPrizeCapture:(prize:Prize)=>void;onDownload:()=>void;onShare:()=>void;onCopy:()=>void;onRestart:()=>void}) {
  const summary=summarize(session);
  return <main className="result">
    <div className="result-intro"><div className="celebrate">✦ <Cat size={54} strokeWidth={1.4}/> ✧</div>
      <span className="eyebrow">小小研究，圆满结束</span><h1>🎉 礼物小侦探通关啦！</h1>
      <p>你的每一个选择都已经被认真记下啦～<br/>等等…好像还有一个隐藏奖励！</p>
    </div>
    <RewardExperience key={session.session_id} sessionId={session.session_id} onCapture={onPrizeCapture}/>
    <div className="result-columns">
      <section className="atlas"><span className="eyebrow">关于你的小小发现</span><h2>我的礼物偏好图鉴</h2><div className="title-badge"><Sparkles size={18}/>{summary.title}</div>
        <dl><dt>想多看一眼</dt><dd>{summary.categories.join('、')||'暂时留一点神秘感'}</dd>
          <dt>喜欢的模样</dt><dd>{[...summary.styles,...summary.colors].join('、')||'还没有选定，慢慢发现也很好'}</dd></dl>
        <h3>这次让你开心的小东西</h3>
        {summary.best.length?summary.best.map(g=><div className="best-gift" key={g.name}><span>{g.name}</span><strong>{g.rating}<small> / 10</small></strong></div>):<p className="empty-summary">这次还没有记录到 8 分以上的小礼物。</p>}
        <p className="fine-print">只根据你这次填写的部分选择整理，是一张探索中的小图鉴。</p>
        <button className="primary" onClick={onCapture}>保存我的礼物图鉴<Download size={18}/></button>
      </section>
    </div>
    <section className="export-panel"><h2>把这份小发现，带走吧</h2><p>是否分享，由你决定。数据文件里有你这一轮的完整选择。</p>
      <div className="export-actions"><button className="primary" onClick={onShare}><Share2 size={17}/>分享我的礼物偏好</button><button className="secondary" onClick={onDownload}><Download size={17}/>下载礼物数据 JSON</button><button className="secondary" onClick={onCopy}><Copy size={17}/>复制数据</button></div>
      <details><summary>在微信里，文件保存不了？</summary><p>先试试「分享我的礼物偏好」。如果没有文件分享入口，点右上角「···」，选择用 Safari 或浏览器打开，再下载 JSON 到「文件」或「下载内容」，然后在微信发送文件。</p><p>微信和外部浏览器的进度不会自动互通。切换前请在这里「复制数据」并保存到手机备忘录，或直接把完整文本发给作者。奖励页面随时可以截图。</p></details>
    </section>
    <button className="text-button replay" onClick={onRestart}><RotateCcw size={16}/> 再玩一轮</button>
  </main>;
}
export default function App() {
  const [initial]=useState(loadSession);
  const [session,setSession]=useState<Session|null>(initial.session),[entered,setEntered]=useState(false);
  const [storageError,setStorageError]=useState(initial.error),[menu,setMenu]=useState(false),[notice,setNotice]=useState('');
  const [modal,setModal]=useState<'clear'|'restart'|'capture'|'prize'|'copy'|'share'|null>(null),[copyText,setCopyText]=useState('');
  const [capturedPrize,setCapturedPrize]=useState<Prize|null>(null);
  const [lastRating,setLastRating]=useState<number|null>(null),[reasonIndex,setReasonIndex]=useState<number|null>(null);
  const sessionRef=useRef(session),lastTick=useRef(Date.now()),lastAction=useRef(Date.now()),locked=useRef(false);
  useEffect(()=>{sessionRef.current=session;},[session]);
  function commit(s:Session) {
    sessionRef.current=s;setSession(s);
    setStorageError(saveSession(s)?null:'浏览器暂时存不了进度。请先复制数据备份，避免关闭后丢失。');
  }
  useEffect(()=>{
    const activity=()=>{lastAction.current=Date.now();};
    const tick=()=>{
      const t=Date.now(),elapsed=(t-lastTick.current)/1000;lastTick.current=t;
      const s=sessionRef.current;
      if(s && !s.completed && document.visibilityState==='visible' && t-lastAction.current<60000 && elapsed<15) {
        const next={...s,active_seconds:Math.round((s.active_seconds+elapsed)*10)/10};
        sessionRef.current=next;setSession(next);
        if(!saveSession(next))setStorageError('浏览器暂时存不了进度，请复制数据备份。');
      }
    };
    window.addEventListener('pointerdown',activity);window.addEventListener('keydown',activity);
    const timer=window.setInterval(tick,10000);
    return()=>{window.clearInterval(timer);window.removeEventListener('pointerdown',activity);window.removeEventListener('keydown',activity);};
  },[]);
  useEffect(()=>{if(notice){const t=setTimeout(()=>setNotice(''),5000);return()=>clearTimeout(t);}},[notice]);
  useEffect(()=>{
    if(!modal && reasonIndex===null)return;
    const active=document.activeElement as HTMLElement|null;
    const handler=(e:KeyboardEvent)=>{
      if(e.key==='Escape'){setModal(null);setReasonIndex(null);}
      if(e.key==='Tab'){
        const nodes=[...document.querySelectorAll<HTMLElement>('.modal button, .modal textarea, .modal summary')].filter(e=>!e.hasAttribute('disabled'));
        if(!nodes.length)return;
        const first=nodes[0],last=nodes[nodes.length-1];
        if(e.shiftKey && document.activeElement===first){e.preventDefault();last.focus();}
        else if(!e.shiftKey && document.activeElement===last){e.preventDefault();first.focus();}
      }
    };
    const old=document.body.style.overflow;document.body.style.overflow='hidden';
    document.querySelector<HTMLElement>('.modal button')?.focus();window.addEventListener('keydown',handler);
    return()=>{document.body.style.overflow=old;window.removeEventListener('keydown',handler);active?.focus();};
  },[modal,reasonIndex]);
  const busyAction=(fn:()=>void)=>{
    if(locked.current)return;locked.current=true;fn();
    window.setTimeout(()=>{locked.current=false;},220);
  };
  function move(s:Session,stage:Session['cursor']['stage'],index:number) {
    commit({...s,cursor:{stage,index}});
    window.scrollTo({top:0,behavior:'instant'});
  }
  function back() {
    if(!session)return;
    setLastRating(null);
    const {stage,index}=session.cursor;
    if(index>0)move(session,stage,index-1);
    else if(stage==='rating')move(session,'radar',6);
    else if(stage==='pair')move(session,'rating',23);
    else if(stage==='result')move(session,'pair',29);
    else setEntered(false);
  }
  function answerRating(score:number|null,status:AnswerStatus) {
    if(!session)return;
    busyAction(()=>{
      const i=session.cursor.index,prev=session.gift_ratings.find(a=>a.gift_id===session.plan.ratings[i].gift_id);
      const next=rate(session,i,score,status,status==='rated'?(prev?.reason_tags||[]):[]);
      setLastRating(i);
      move(next,i===23?'pair':'rating',i===23?0:i+1);
    });
  }
  async function copy() {
    try {
      const value=session?exportJSON(session):localStorage.getItem(STORAGE_KEY)||'';
      setCopyText(value);
      if(await copyData(value)){setNotice('完整数据已复制，可以粘贴到备忘录或发给作者。');}
      else setModal('copy');
    }catch(e){setNotice((e as Error).message);}
  }
  function downloadData(){if(session)try{download(session);setNotice('已请求保存。若没有文件，请使用复制数据或查看微信指引。');}catch(e){setNotice((e as Error).message);}}
  async function share(){
    if(!session)return;
    try{const result=await shareFile(session);if(result==='fallback')setModal('share');}
    catch(e){setNotice((e as Error).message);}
  }
  function restart(){
    try{localStorage.removeItem(STORAGE_KEY);}catch{/* Starting in memory still works; save reports failures. */}
    setModal(null);setLastRating(null);setReasonIndex(null);commit(newSession());setEntered(true);
  }
  const current=entered&&session?session.cursor.stage:'welcome',isGame=['radar','rating','pair'].includes(current);
  const stageLabel=current==='radar'?'快乐雷达':current==='rating'?'礼物盲盒':'心动二选一';
  const reasonAnswer=session&&reasonIndex!==null?session.gift_ratings.find(r=>r.gift_id===session.plan.ratings[reasonIndex].gift_id):null;
  return <>
    <header className={`site-header ${isGame?'playing':''}`}>
      <div className="header-inner"><a className="brand" href="./" onClick={e=>{e.preventDefault();setEntered(false);}}><span className="brand-icon"><GiftIcon size={20}/></span><span>礼物偏好研究所<small>把小小的喜欢，认真收好</small></span></a>
        <div className="header-right"><span className="local-badge"><span/>{storageError?'记得备份哦':'小小心意，本机珍藏'}</span><button className="icon-button" aria-label="更多选项" onClick={()=>setMenu(!menu)}><MoreHorizontal size={23}/></button></div>
        {menu&&<div className="menu"><button onClick={()=>{copy();setMenu(false);}}>复制当前数据备份</button><button onClick={()=>{setModal('restart');setMenu(false);}}>重新开始</button><button onClick={()=>{setModal('clear');setMenu(false);}}>清除本机数据</button></div>}
      </div>
      {isGame&&session&&<div className="progress-wrap"><div className="progress-meta"><button className="back" onClick={back}><ChevronLeft size={17}/>上一题</button><span>{stageLabel} · {session.cursor.index+1} / {current==='radar'?7:current==='rating'?24:30}</span><strong>{progress(session)}%</strong></div><div className="progress-track" role="progressbar" aria-label="总进度" aria-valuenow={progress(session)} aria-valuemin={0} aria-valuemax={100}><div style={{width:`${progress(session)}%`}}/></div></div>}
    </header>
    {storageError&&<div className="storage-warning" role="alert">{storageError}<button onClick={copy}>复制备份</button></div>}
    {current==='welcome'&&<Welcome session={session} onResume={()=>setEntered(true)} onStart={()=>{if(initial.error){setModal('restart');return;}commit(newSession());setEntered(true);}}/>}
    {isGame&&session&&<main className="game" key={session.cursor.stage+session.cursor.index}>
      {current==='radar'&&<RadarQuestion session={session} onAnswer={p=>{const i=session.cursor.index;move(savePreference(session,p),i===6?'rating':'radar',i===6?0:i+1);}}/>}
      {current==='rating'&&<RatingQuestion session={session} onRate={answerRating}/>}
      {current==='pair'&&<PairQuestion session={session} onChoose={(value,skip=false)=>busyAction(()=>{
        setLastRating(null);const i=session.cursor.index,next=choose(session,i,value,skip);
        move(i===29?{...next,completed:true,completed_at:next.completed_at||new Date().toISOString()}:next,i===29?'result':'pair',i===29?0:i+1);
      })}/>}
      {lastRating!==null&&<button className="last-reason" onClick={()=>setReasonIndex(lastRating)}><span><Check size={15}/> 刚才那份礼物，记好啦</span><strong>补个原因 <span>选填</span></strong></button>}
      <div className="game-footer"><Cat size={17}/>{current==='radar'?'喜欢与不喜欢，都可以放心选。':current==='rating'?'不用照顾送礼人的心情，照顾你的就好。':'没有标准答案，按你的感觉来。'}</div>
    </main>}
    {current==='result'&&session?.completed&&<Result session={session} onCapture={()=>setModal('capture')} onPrizeCapture={prize=>{setCapturedPrize(prize);setModal('prize');}} onDownload={downloadData} onShare={share} onCopy={copy} onRestart={()=>setModal('restart')}/>}
    {notice&&<div className="toast" role="status">{notice}</div>}
    {(modal||reasonAnswer)&&<div className="modal-backdrop"><section className={`modal ${modal==='capture'?'capture-modal':modal==='prize'?'prize-capture-modal':''}`} role="dialog" aria-modal="true" aria-label={modal==='capture'?'截图保存礼物图鉴':modal==='prize'?'截图保存中奖兑换券':reasonAnswer?'补充礼物原因':'数据与进度操作'}>
      <button className="icon-button modal-close" aria-label="关闭弹窗" onClick={()=>{setModal(null);setReasonIndex(null);}}><X/></button>
      {modal==='clear'&&<><h2>清除这台设备上的选择？</h2><p>清除后，答题和奖励进度都无法找回。已经下载、分享的文件或截图不会被删除。</p><button className="secondary" onClick={copy}>先复制数据备份</button><button className="primary" onClick={()=>{try{clearRewards();localStorage.removeItem(STORAGE_KEY);setSession(null);sessionRef.current=null;setEntered(false);setStorageError(null);setModal(null);}catch{setNotice('没有清除成功，请检查浏览器设置。');}}}>确认清除</button></>}
      {modal==='restart'&&<><h2>开始一轮新的小冒险？</h2><p>新一轮会替换这台设备上的旧进度。建议先保存数据；新一轮可能遇见一些老朋友。</p><button className="secondary" onClick={copy}>先复制旧数据</button><button className="primary" onClick={restart}>开始新一轮</button></>}
      {modal==='share'&&<><div className="modal-emoji">💌</div><h2>换个方式，把心意带走</h2><p>这个浏览器暂时不能分享文件。可以下载后在微信发送文件，或直接复制完整数据发给李老师。</p><button className="primary" onClick={downloadData}>下载 JSON</button><button className="secondary" onClick={copy}>复制数据</button><p className="fine-print">微信里下载不了时：先复制备份，再从右上角「···」用浏览器打开。不同浏览器不会自动同步进度。</p></>}
      {modal==='copy'&&<><h2>长按下面的文字，全选复制</h2><p>浏览器没有开放一键复制，可以手动把完整内容复制到备忘录或微信。</p><textarea aria-label="完整礼物数据" readOnly value={copyText} onFocus={e=>e.target.select()}/></>}
      {modal==='capture'&&session&&<><p className="capture-instruction">用手机截屏，收藏这一页就好啦</p><div className="capture-card"><div className="capture-brand"><GiftIcon size={16}/> 礼物偏好研究所</div><h2>{summarize(session).title}的小图鉴</h2><p>{[...summarize(session).styles,...summarize(session).colors].slice(0,4).join(' · ')||'每一个选择，都算数。'}</p><div className="atlas-snapshot"><span>想多看一眼</span><p>{summarize(session).categories.join('、')||'暂时留一点神秘感'}</p><span>这次让你开心的小东西</span>{summarize(session).best.map(g=><p key={g.name}>{g.name} · {g.rating} / 10</p>)}</div><p className="capture-thanks">谢谢你，把一点时间分给我的小小研究 ♡</p></div></>}
      {modal==='prize'&&session?.completed&&capturedPrize&&<><p className="capture-instruction">{capturedPrize==='no_prize'?'用手机截屏，收藏这次转盘结果吧 ♡':'用手机截屏，带着兑换券去找李老师吧 ♡'}</p><PrizeCard prize={capturedPrize} compact/></>}
      {reasonAnswer&&session&&reasonIndex!==null&&<><h2>刚才为什么这样选呀？</h2><p>{giftById.get(reasonAnswer.gift_id)!.name} · {reasonAnswer.rating!==null?`${reasonAnswer.rating} 分`:'暂时没有评分'}</p><div className="reason-tags">{reasonsFor(giftById.get(reasonAnswer.gift_id)!.category).map(([id,label])=><button key={id} aria-pressed={reasonAnswer.reason_tags.includes(id)} className={reasonAnswer.reason_tags.includes(id)?'selected':''} onClick={()=>{const tags=reasonAnswer.reason_tags.includes(id)?reasonAnswer.reason_tags.filter(t=>t!==id):[...reasonAnswer.reason_tags,id];commit(rate(session,reasonIndex,reasonAnswer.rating,reasonAnswer.status,tags));}}>{label}</button>)}</div><button className="primary" onClick={()=>setReasonIndex(null)}>记好啦，继续玩</button><p className="fine-print">选不选都可以，答案已经保存。</p></>}
    </section></div>}
  </>;
}
