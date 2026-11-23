import Ajv from 'ajv';
import schema from './data/session.schema.json';
import { STORAGE_KEY, validateSemantics } from './engine';
import type { Session } from './types';
const check = new Ajv({allErrors:true}).compile<Session>(schema);
export function validateSession(value: unknown): asserts value is Session {
  if(!check(value)) throw Error('数据格式不完整，请保留本机数据后重试。');
  const issues=validateSemantics(value);
  if(issues.length) throw Error(issues.join('；'));
}
export function loadSession(): {session:Session|null; error:string|null} {
  try {
    const raw=localStorage.getItem(STORAGE_KEY);
    if(!raw) return {session:null,error:null};
    const parsed:unknown=JSON.parse(raw);
    validateSession(parsed);
    return {session:parsed,error:null};
  } catch { return {session:null,error:'旧进度暂时无法读取。可以先复制备份，再清除并重新开始。'}; }
}
export function saveSession(session:Session):boolean {
  try { localStorage.setItem(STORAGE_KEY,JSON.stringify(session)); return true; } catch { return false; }
}
export function exportJSON(session:Session):string {
  validateSession(session);
  return JSON.stringify(session,null,2);
}
export function filename(session:Session) {
  return `gift-lab-${session.session_id.slice(0,8)}.json`;
}
export function download(session:Session) {
  const url=URL.createObjectURL(new Blob([exportJSON(session)],{type:'application/json'}));
  const a=document.createElement('a'); a.href=url; a.download=filename(session); a.click();
  setTimeout(()=>URL.revokeObjectURL(url),30000);
}
export async function shareFile(session:Session):Promise<'shared'|'fallback'|'cancelled'> {
  const file=new File([exportJSON(session)],filename(session),{type:'application/json'});
  try {
    if(!navigator.share || !navigator.canShare?.({files:[file]})) return 'fallback';
    await navigator.share({files:[file],title:'我的礼物偏好图鉴'});
    return 'shared';
  } catch(e) {return (e as Error).name==='AbortError'?'cancelled':'fallback';}
}
export async function copyData(text:string):Promise<boolean> {
  try {await navigator.clipboard.writeText(text);return true;} catch {return false;}
}
