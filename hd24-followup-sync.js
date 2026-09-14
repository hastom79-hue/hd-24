(()=>{
'use strict';
let activeSignature='';
let completedSignature='';
let runningSignature='';
let actionExportSignature='';
let replyDownloadedSignature='';
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
  return !!(p&&p.style.display!=='none'&&$('hd24PreviewSubject')?.textContent&&p.dataset.hd24Signature===sig);
}
function tagPreview(sig){const p=$('hd24Preview');if(p)p.dataset.hd24Signature=sig}
function clearPreview(){
  const p=$('hd24Preview');
  if(p){p.style.display='none';delete p.dataset.hd24Signature;}
  const s=$('hd24MailStatus');
  if(s)s.textContent='새 파일 분석 대기 중 · 안전반영 → 분석파일 생성 후 Preview를 준비합니다.';
}
function downloadReplyOnce(sig){
  if(!sig||replyDownloadedSignature===sig)return;
  const b=$('hd24DownloadReply');
  if(b&&!b.disabled){b.click();replyDownloadedSignature=sig;}
}
function stateText(a,sig){return `safe=${window.hd24SafeReflectSuccessSignature===sig} / actionExport=${actionExportSignature===sig} / month=${a.month||'-'} / total=${a.total} / current=${a.current}`}
function trySync(reason){
  const sig=signature();
  if(!sig||sig===completedSignature||sig===runningSignature)return;
  const a=analysisState();
  if(window.hd24SafeReflectSuccessSignature!==sig||actionExportSignature!==sig||!a.ready){
    const state=stateText(a,sig);
    if(state!==lastState){lastState=state;logSafe('후속조치 패키지 대기: '+state)}
    return;
  }
  if(previewReady(sig)){
    downloadReplyOnce(sig);
    completedSignature=sig;
    lastState='';
    logSafe('후속조치 패키지 확인: 현재 파일쌍 Preview/회신 Excel 중복 없이 유지');
    return;
  }
  // Never trust an untagged Preview here. Legacy follow-up code may have rendered it
  // before the current analysis/export chain completed, so force one fresh package.
  const stale=$('hd24Preview');
  if(stale&&stale.style.display!=='none'&&!stale.dataset.hd24Signature){stale.style.display='none';}
  const mailBtn=$('btnMailWatch');
  if(!mailBtn||mailBtn.disabled)return;
  runningSignature=sig;
  lastState='';
  try{
    logSafe(`후속조치 패키지 실행: ${reason} — 분석파일 생성 완료 후 ${a.current}건 기준 Preview/회신 Excel 생성`);
    mailBtn.click();
    let checks=0;
    const verify=()=>{
      checks++;
      const shown=$('hd24Preview');
      if(shown&&shown.style.display!=='none'&&$('hd24PreviewSubject')?.textContent){
        tagPreview(sig);
        downloadReplyOnce(sig);
        completedSignature=sig;
        runningSignature='';
        logSafe('후속조치 패키지 완료: 분석파일 → 현재 파일쌍 메일 Preview → 회신용 Excel 1회 준비');
        return;
      }
      if(checks<8){setTimeout(verify,100)}
      else{runningSignature='';logSafe('후속조치 패키지 재시도 대기: Preview 미생성')}
    };
    setTimeout(verify,0);
  }catch(e){
    runningSignature='';
    logSafe('후속조치 패키지 오류: '+(e?.message||e));
  }
}
function hardReset(reason){
  activeSignature=signature();
  completedSignature='';runningSignature='';actionExportSignature='';replyDownloadedSignature='';lastState='';
  clearPreview();
  [0,100,300,700,1500,3000,6000,10000,15000].forEach(ms=>setTimeout(()=>trySync(reason),ms));
}
function safeComplete(){
  const sig=signature();
  if(!sig)return;
  // Repeated safe-complete events for the same upload pair must not reset completed/downloaded state.
  if(activeSignature!==sig)hardReset('safe reflect complete/new signature');
  else trySync('safe reflect complete');
}
function actionExportComplete(e){
  const sig=signature();
  const eventSig=e?.detail?.signature||'';
  if(!sig||eventSig!==sig)return;
  actionExportSignature=sig;
  trySync('action export complete');
}
function wire(){
  ['srcFile','masterFile','plantSelect'].forEach(id=>$(id)?.addEventListener('change',()=>hardReset(id+' change')));
  window.addEventListener('hd24-safe-reflect-complete',safeComplete);
  window.addEventListener('hd24-action-export-complete',actionExportComplete);
  const rc=$('resultCard');if(rc)new MutationObserver(()=>trySync('analysis result updated')).observe(rc,{attributes:true,childList:true,subtree:true});
  setInterval(()=>trySync('watchdog'),1000);
  hardReset('startup');
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',wire,{once:true});else wire();
})();
