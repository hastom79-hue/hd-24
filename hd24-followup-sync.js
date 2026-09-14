(()=>{
'use strict';
let completedSignature='';
let runningSignature='';
let lastState='';

const $=id=>document.getElementById(id);
function signature(){
  const plant=$('plantSelect')?.value||'';
  const sf=$('srcFile')?.files?.[0],mf=$('masterFile')?.files?.[0];
  if(!sf||!mf)return '';
  return [plant,sf.name,sf.size,sf.lastModified,mf.name,mf.size,mf.lastModified].join('|');
}
function analysisState(){
  let m=0,results=[];
  try{m=Number(selectedMonth)||0}catch(_){}
  try{results=Array.isArray(allResults)?allResults:[]}catch(_){}
  const current=m?results.filter(r=>Number(r.month)===m):[];
  return {month:m,total:results.length,current:current.length,ready:m>=1&&m<=12&&current.length>0};
}
function logSafe(msg){try{if(typeof window.log==='function')window.log(msg);else if($('log')){$('log').textContent+='\n'+msg;$('log').scrollTop=$('log').scrollHeight}}catch(_){}}
function previewReady(sig){
  const p=$('hd24Preview');
  if(!(p&&p.style.display!=='none'&&$('hd24PreviewSubject')?.textContent))return false;
  const tagged=p.dataset.hd24Signature||'';
  return !sig||tagged===sig;
}
function tagPreview(sig){const p=$('hd24Preview');if(p)p.dataset.hd24Signature=sig}
function clearStalePreview(){
  const p=$('hd24Preview');
  if(p){p.style.display='none';delete p.dataset.hd24Signature;}
  const s=$('hd24MailStatus');
  if(s)s.textContent='새 파일 분석 대기 중 · 안전반영/분석 완료 후 Preview를 준비합니다.';
}
function downloadReplyOnce(){const b=$('hd24DownloadReply');if(b&&!b.disabled)b.click()}
function trySync(reason){
  const sig=signature();
  if(!sig||sig===completedSignature||sig===runningSignature)return;
  if(window.hd24SafeReflectSuccessSignature!==sig)return;
  const a=analysisState();
  if(!a.ready){
    const state=`month=${a.month||'-'} / total=${a.total} / current=${a.current}`;
    if(state!==lastState){lastState=state;logSafe('후속조치 패키지 대기: KPI 분석 완료 대기 — '+state)}
    return;
  }
  const p=$('hd24Preview');
  if(p&&p.style.display!=='none'&&$('hd24PreviewSubject')?.textContent&&!p.dataset.hd24Signature){
    tagPreview(sig);
  }
  if(previewReady(sig)){
    completedSignature=sig;
    lastState='';
    logSafe('후속조치 패키지 확인: 현재 파일쌍 메일 Preview 사용');
    return;
  }
  const mailBtn=$('btnMailWatch');
  if(!mailBtn||mailBtn.disabled)return;
  runningSignature=sig;
  lastState='';
  try{
    logSafe(`후속조치 패키지 실행: ${reason} — 분석 ${a.current}건 확인 후 Preview/회신파일 생성`);
    mailBtn.click();
    setTimeout(()=>{
      const shown=$('hd24Preview');
      if(shown&&shown.style.display!=='none'&&$('hd24PreviewSubject')?.textContent){
        tagPreview(sig);
        downloadReplyOnce();
        completedSignature=sig;
        logSafe('후속조치 패키지 완료: 현재 파일쌍 메일 Preview + 회신용 Excel 준비');
      }else{
        logSafe('후속조치 패키지 재시도: Preview 미생성');
      }
      runningSignature='';
    },250);
  }catch(e){
    runningSignature='';
    logSafe('후속조치 패키지 오류: '+(e?.message||e));
  }
}
function reset(reason){
  completedSignature='';runningSignature='';lastState='';
  clearStalePreview();
  [0,100,300,700,1500,3000,6000,10000,15000].forEach(ms=>setTimeout(()=>trySync(reason),ms));
}
function wire(){
  ['srcFile','masterFile','plantSelect'].forEach(id=>$(id)?.addEventListener('change',()=>reset(id+' change')));
  window.addEventListener('hd24-safe-reflect-complete',()=>reset('safe reflect complete'));
  window.addEventListener('hd24-action-export-complete',()=>trySync('action export complete'));
  const rc=$('resultCard');if(rc)new MutationObserver(()=>trySync('analysis result updated')).observe(rc,{attributes:true,childList:true,subtree:true});
  setInterval(()=>trySync('watchdog'),1000);
  reset('startup');
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',wire,{once:true});else wire();
})();
