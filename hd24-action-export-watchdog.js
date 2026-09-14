(()=>{
'use strict';
// Compatibility wake-up bridge for the action-export module. It does not bypass any
// safe-reflect or analysis guard. It only nudges resultCard so the existing action-export
// MutationObserver re-runs its own fail-closed schedule if blob capture/analysis settles late.
let wakeTimers=[];
let completedSignature='';
let wakeSeq=0;
const WAKE_DELAYS=[0,2500,7000,15000,30000];

function el(id){return document.getElementById(id)}
function plant(){return el('plantSelect')?.value||''}
function signature(){
  const sf=el('srcFile')?.files?.[0],mf=el('masterFile')?.files?.[0];
  if(!sf||!mf)return '';
  return [plant(),sf.name,sf.size,sf.lastModified,mf.name,mf.size,mf.lastModified].join('|');
}
function logSafe(msg){try{if(typeof window.log==='function')window.log(msg);else if(el('log'))el('log').textContent+='\n'+msg}catch(_){}}
function clearWakeTimers(){for(const t of wakeTimers)clearTimeout(t);wakeTimers=[]}
function canWake(sig){return !!(sig&&window.hd24SafeReflectSuccessSignature===sig&&completedSignature!==sig)}
function nudge(sig,reason,attempt){
  if(signature()!==sig||!canWake(sig))return;
  const rc=el('resultCard');if(!rc)return;
  rc.dataset.hd24ActionExportWake=`${sig}|${++wakeSeq}|${Date.now()}`;
  if(attempt===1||attempt===WAKE_DELAYS.length)logSafe(`분석후속조치 생성 재동기화 ${attempt}/${WAKE_DELAYS.length}: ${reason}`);
}
function arm(reason){
  clearWakeTimers();
  const sig=signature();if(!canWake(sig))return;
  WAKE_DELAYS.forEach((ms,i)=>wakeTimers.push(setTimeout(()=>nudge(sig,reason,i+1),ms)));
}
function reset(reason){
  clearWakeTimers();completedSignature='';
  if(reason)logSafe('분석후속조치 재동기화 RESET: '+reason);
}
function wire(){
  ['srcFile','masterFile','plantSelect'].forEach(id=>el(id)?.addEventListener('change',()=>reset(id+' change')));
  window.addEventListener('hd24-safe-reflect-complete',()=>arm('safe reflect complete'));
  window.addEventListener('hd24-action-export-complete',e=>{
    const sig=signature(),eventSig=e?.detail?.signature||'';
    if(sig&&eventSig===sig){completedSignature=sig;clearWakeTimers();logSafe('분석후속조치 재동기화 종료: action-export 완료 확인');}
  });
  arm('startup');
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',wire,{once:true});else wire();
})();
