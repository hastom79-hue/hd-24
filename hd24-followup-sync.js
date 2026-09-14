(()=>{
'use strict';
// This bridge is the only automatic follow-up orchestrator. The legacy module keeps
// manual Preview/send/import UI, but its old 80 ms auto-package race is suppressed.
window.hd24FollowupSyncOwnsAutoPackage=true;
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
function plantName(){const p=$('plantSelect')?.value||'';return p==='india'?'India':p==='brazil'?'Brazil':p==='ulsan'?'Ulsan':p}
function analysisState(){
  let m=0,results=[];
  try{m=Number(selectedMonth)||0}catch(_){}
  try{results=Array.isArray(allResults)?allResults:[]}catch(_){}
  const current=m?results.filter(r=>Number(r.month)===m):[];
  return {month:m,total:results.length,current:current.length,ready:m>=1&&m<=12&&current.length>0};
}
function snapshotFor(sig){
  const s=window.hd24FollowupSnapshot;
  if(!s||s.signature!==sig||!(Number(s.month)>=1&&Number(s.month)<=12)||!Array.isArray(s.items)||!s.items.length)return null;
  if(s.items.some(x=>Number(x.month)!==Number(s.month)||!Number(x.masterRow)))return null;
  return s;
}
function withSnapshot(sig,fn){
  const s=snapshotFor(sig);if(!s)return false;
  let oldResults,oldMonth;
  try{oldResults=allResults;oldMonth=selectedMonth;allResults=s.items.map(x=>({...x}));selectedMonth=Number(s.month);fn();return true}
  catch(_){return false}
  finally{try{allResults=oldResults;selectedMonth=oldMonth}catch(_){}}
}
function logSafe(msg){try{if(typeof window.log==='function')window.log(msg);else if($('log')){$('log').textContent+='\n'+msg;$('log').scrollTop=$('log').scrollHeight}}catch(_){}}
function previewMeta(sig){
  const p=$('hd24Preview'),sub=$('hd24PreviewSubject')?.textContent||'',snap=snapshotFor(sig);
  if(!p||p.style.display==='none'||!sub||!snap)return null;
  const m=sub.match(/-\s*(\d{1,2})M\s*\((\d+)\s*KPI/i);
  const month=m?Number(m[1]):0,count=m?Number(m[2]):-1;
  const valid=month===Number(snap.month)&&count>=0&&sub.includes(plantName());
  return {valid,month,count,subject:sub};
}
function previewReady(sig){
  const p=$('hd24Preview'),meta=previewMeta(sig);
  return !!(p&&p.dataset.hd24Signature===sig&&meta?.valid);
}
function tagPreview(sig){
  const p=$('hd24Preview'),meta=previewMeta(sig),snap=snapshotFor(sig);
  if(!p||!meta?.valid||!snap)return false;
  p.dataset.hd24Signature=sig;
  p.dataset.hd24Month=String(snap.month);
  p.dataset.hd24Count=String(meta.count);
  return true;
}
function clearPreview(){
  const p=$('hd24Preview');
  if(p){p.style.display='none';delete p.dataset.hd24Signature;delete p.dataset.hd24Month;delete p.dataset.hd24Count;}
  window.hd24FollowupSnapshot=null;
  const s=$('hd24MailStatus');
  if(s)s.textContent='새 파일 분석 대기 중 · 안전반영 → 분석파일 생성 후 Preview를 준비합니다.';
}
function downloadReplyOnce(sig){
  if(!sig||replyDownloadedSignature===sig||!snapshotFor(sig))return;
  const b=$('hd24DownloadReply');
  if(b&&!b.disabled&&withSnapshot(sig,()=>b.click()))replyDownloadedSignature=sig;
}
function stateText(a,sig){return `safe=${window.hd24SafeReflectSuccessSignature===sig} / actionExport=${actionExportSignature===sig} / snapshot=${!!snapshotFor(sig)} / month=${a.month||'-'} / total=${a.total} / current=${a.current}`}
function trySync(reason){
  const sig=signature();
  if(!sig||sig===completedSignature||sig===runningSignature)return;
  const a=analysisState(),snap=snapshotFor(sig);
  if(window.hd24SafeReflectSuccessSignature!==sig||actionExportSignature!==sig||!snap||!a.ready){
    const state=stateText(a,sig);
    if(state!==lastState){lastState=state;logSafe('후속조치 패키지 대기: '+state)}
    return;
  }
  if(Number(a.month)!==Number(snap.month)){
    logSafe(`후속조치 패키지 대기: 현재 선택월 ${a.month}월 ≠ 분석파일 스냅샷 ${snap.month}월`);return;
  }
  if(previewReady(sig)){
    downloadReplyOnce(sig);
    completedSignature=sig;
    lastState='';
    logSafe(`후속조치 패키지 확인: ${snap.month}월 동일 분석스냅샷 ${snap.items.length}건 기준 Preview/회신 Excel 유지`);
    return;
  }
  const stale=$('hd24Preview');
  if(stale&&stale.style.display!=='none'&&!stale.dataset.hd24Signature){stale.style.display='none';}
  const mailBtn=$('btnMailWatch');
  if(!mailBtn||mailBtn.disabled)return;
  runningSignature=sig;
  lastState='';
  try{
    logSafe(`후속조치 패키지 실행: ${reason} — ${snap.month}월 분석스냅샷 ${snap.items.length}건 고정 후 Preview/회신 Excel 생성`);
    if(!withSnapshot(sig,()=>mailBtn.click()))throw new Error('분석스냅샷 고정 실패');
    let checks=0;
    const verify=()=>{
      checks++;
      const shown=$('hd24Preview'),meta=previewMeta(sig);
      if(shown&&shown.style.display!=='none'&&meta?.valid&&tagPreview(sig)){
        downloadReplyOnce(sig);
        if(replyDownloadedSignature!==sig){runningSignature='';logSafe('후속조치 패키지 재시도 대기: 회신 Excel 생성 미확인');return;}
        completedSignature=sig;
        runningSignature='';
        logSafe(`후속조치 패키지 완료: 분석파일 → ${meta.month}월 Preview ${meta.count} KPI → 동일 스냅샷 회신용 Excel 1회`);
        return;
      }
      if(checks<8){setTimeout(verify,100)}
      else{runningSignature='';logSafe('후속조치 패키지 재시도 대기: Preview 월/사업장/건수 검증 실패')}
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
  if(activeSignature!==sig)hardReset('safe reflect complete/new signature');
  else trySync('safe reflect complete');
}
function actionExportComplete(e){
  const sig=signature(),d=e?.detail||{};
  const eventSig=d.signature||'',month=Number(d.month)||0,items=Array.isArray(d.items)?d.items:[];
  if(!sig||eventSig!==sig)return;
  if(!(month>=1&&month<=12)||!items.length||items.some(x=>Number(x.month)!==month||!Number(x.masterRow))){
    logSafe('후속조치 패키지 차단: action-export 분석스냅샷 검증 실패');return;
  }
  window.hd24FollowupSnapshot={signature:sig,month,items:items.map(x=>({...x})),capturedAt:new Date().toISOString(),fileName:d.fileName||''};
  actionExportSignature=sig;
  logSafe(`후속조치 분석스냅샷 고정: ${month}월 ${items.length}건 / ${d.fileName||'분석후속조치본'}`);
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
