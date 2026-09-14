(()=>{
'use strict';
let successfulSignature='';
let resetting=false;

function el(id){return document.getElementById(id)}
function plant(){return el('plantSelect')?.value||''}
function needsSafeReflect(){return plant()==='india'||plant()==='brazil'}
function signature(){
  const sf=el('srcFile')?.files?.[0],mf=el('masterFile')?.files?.[0];
  if(!sf||!mf)return '';
  return [plant(),sf.name,sf.size,sf.lastModified,mf.name,mf.size,mf.lastModified].join('|');
}
function logSafe(msg){try{if(typeof window.log==='function')window.log(msg);else if(el('log'))el('log').textContent+='\n'+msg}catch(_){}}
function gateJudge(){
  if(!needsSafeReflect())return;
  const btn=el('btnJudge'),sig=signature();
  if(!btn)return;
  const passed=!!(sig&&successfulSignature===sig);
  if(!passed&&!btn.disabled){resetting=true;btn.disabled=true;resetting=false;}
  btn.dataset.safePipelinePassed=passed?'1':'0';
}
function markSafeReflectSuccess(entry){
  const sig=signature();
  if(!sig||!needsSafeReflect())return;
  successfulSignature=sig;
  const btn=el('btnJudge');
  if(btn){
    btn.dataset.safePipelinePassed='1';
    btn.disabled=false;
  }
  window.hd24SafeReflectSuccessSignature=sig;
  window.dispatchEvent(new CustomEvent('hd24-safe-reflect-complete',{detail:{signature:sig,entry:entry||null,time:new Date().toISOString()}}));
  logSafe('안전반영 성공 Gate PASS → 자동분석/파일추출/메일 Preview 허용');
}
function wrapAddHistory(){
  const original=window.addHistory;
  if(typeof original!=='function'||original.__hd24PipelineWrapped)return false;
  function wrapped(entry){
    const out=original.apply(this,arguments);
    try{if(entry&&entry.action==='실적 반영')markSafeReflectSuccess(entry)}catch(e){console.error('HD24 pipeline success hook failed',e)}
    return out;
  }
  wrapped.__hd24PipelineWrapped=true;
  wrapped.__hd24Original=original;
  window.addHistory=wrapped;
  return true;
}
function reset(reason){
  if(!needsSafeReflect())return;
  successfulSignature='';
  window.hd24SafeReflectSuccessSignature='';
  gateJudge();
  logSafe('안전반영 Gate RESET: '+reason+' — 새 파일쌍은 안전반영 성공 전 분석/메일 생성 차단');
}
function wire(){
  [0,50,150,400,1000,2500].forEach(ms=>setTimeout(()=>{wrapAddHistory();gateJudge()},ms));
  ['srcFile','masterFile'].forEach(id=>el(id)?.addEventListener('change',()=>reset(id+' change'),true));
  el('plantSelect')?.addEventListener('change',()=>reset('plant change'),true);
  const btn=el('btnJudge');
  if(btn)new MutationObserver(()=>{if(!resetting)gateJudge()}).observe(btn,{attributes:true,attributeFilter:['disabled']});
  window.addEventListener('hd24-safe-reflect-complete',()=>gateJudge());
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',wire,{once:true});else wire();
})();