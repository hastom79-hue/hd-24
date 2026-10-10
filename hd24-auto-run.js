(()=>{
'use strict';
let completedSignature='';
let runningSignature='';
let runningSince=0;
let watchdog=null;
let lastWaitState='';

function isMasterOnly(){
  try{return typeof cfg==='function' && cfg().hasSource===false;}catch(_){return document.getElementById('plantSelect')?.value==='ulsan';}
}
function getSignature(){
  const src=document.getElementById('srcFile');
  const master=document.getElementById('masterFile');
  const plant=document.getElementById('plantSelect');
  const sf=src&&src.files&&src.files[0];
  const mf=master&&master.files&&master.files[0];
  if(!mf)return '';
  if(!isMasterOnly()&&!sf)return '';
  const srcSig=sf?[sf.name,sf.size,sf.lastModified].join('|'):'MASTER_ONLY';
  return [plant?plant.value:'',srcSig,mf.name,mf.size,mf.lastModified].join('|');
}

function coreReady(){
  try{
    const masterOnly=isMasterOnly();
    const hasSrc=typeof srcWorkbook!=='undefined'&&!!srcWorkbook;
    const hasMaster=typeof masterWorkbook!=='undefined'&&!!masterWorkbook;
    const hasZip=typeof masterZip!=='undefined'&&!!masterZip;
    const hasBuffer=typeof masterFileBuffer!=='undefined'&&!!masterFileBuffer;
    const hasMapping=typeof mappingData!=='undefined'&&Array.isArray(mappingData)&&mappingData.length>0;
    return {masterOnly,hasSrc,hasMaster,hasZip,hasBuffer,hasMapping,ok:(masterOnly||hasSrc)&&hasMaster&&hasBuffer&&hasMapping};
  }catch(_){return {masterOnly:false,hasSrc:false,hasMaster:false,hasZip:false,hasBuffer:false,hasMapping:false,ok:false};}
}

function readiness(){
  const masterOnly=isMasterOnly();
  const btn=document.getElementById(masterOnly?'btnJudge':'btnReflect');
  const sig=getSignature();
  const core=coreReady();
  const safe=masterOnly ? !!btn : (window.hd24SafeReflectReady===true&&!!btn);
  if(sig&&btn&&btn.disabled&&safe&&core.ok){
    // Let the canonical readiness check decide; never force-enable a guarded action.
    if(typeof window.checkReady==='function'){
      try{window.checkReady()}catch(_){ }
    }
  }
  return {
    sig,btn,core,masterOnly,
    ok:!!(sig&&btn&&!btn.disabled&&safe&&core.ok),
    disabled:btn?!!btn.disabled:null,
    globalReady:masterOnly?true:window.hd24SafeReflectReady===true,
    datasetReady:btn?btn.dataset.safeReflectReady:null
  };
}

function writeLog(message){
  try{
    if(typeof window.log==='function')window.log(message);
    else {
      const el=document.getElementById('log');
      if(el){el.textContent+='\n'+message;el.scrollTop=el.scrollHeight;}
    }
  }catch(_){ }
}

function syncSuccess(){
  const sig=getSignature();
  if(!sig)return false;
  if(isMasterOnly()){
    const rows=typeof allResults!=='undefined'&&Array.isArray(allResults)?allResults:[];
    if(rows.length){
      const first=completedSignature!==sig;
      completedSignature=sig;runningSignature='';runningSince=0;
      if(first)writeLog('자동 판정 완료 확인: 울산 master-only 결과 생성');
      return true;
    }
    return false;
  }
  if(window.hd24SafeReflectSuccessSignature===sig){
    const first=completedSignature!==sig;
    completedSignature=sig;
    runningSignature='';
    runningSince=0;
    if(first)writeLog('자동 실행 완료 확인: 안전반영 성공 signature 일치');
    return true;
  }
  return false;
}

function waitStateText(s){
  return `mode=${s.masterOnly?'master-only':'source+master'} / disabled=${s.disabled} / safe=${s.globalReady} / dataset=${s.datasetReady||'-'} / src=${s.core.hasSrc} / master=${s.core.hasMaster} / buffer=${s.core.hasBuffer} / zip(lazy)=${s.core.hasZip} / mapping=${s.core.hasMapping}`;
}

function tryAutoRun(reason){
  const s=readiness();
  const sig=s.sig;
  if(!sig)return;
  if(syncSuccess()||sig===completedSignature)return;
  if(!s.ok){
    const state=waitStateText(s);
    if(state!==lastWaitState){lastWaitState=state;writeLog('자동 실행 대기: '+state);}
    return;
  }
  lastWaitState='';
  const now=Date.now();
  if(runningSignature===sig)return; // In-flight work must never be re-clicked by the watchdog.
  runningSignature=sig;
  runningSince=now;
  writeLog(s.masterOnly ? '자동 판정 시작: '+reason+' — 울산 총괄파일 master-only 판정' : '자동 실행 시작: '+reason+' — 업로드 완료 즉시 안전검증/실적반영');
  try{s.btn.click();if(s.masterOnly)setTimeout(syncSuccess,0);}
  catch(e){runningSignature='';runningSince=0;writeLog('자동 실행 오류: '+(e&&e.message||e));}
}

function resetAndRun(reason){
  completedSignature='';
  runningSignature='';
  runningSince=0;
  lastWaitState='';
  if(!getSignature())return;
  [100,600,1800,4000].forEach(ms=>setTimeout(()=>{if(getSignature())tryAutoRun(reason)},ms));
}

function wire(){
  if(window.__HD24_AUTO_RUN_WIRED__)return;
  window.__HD24_AUTO_RUN_WIRED__=true;
  const src=document.getElementById('srcFile');
  const master=document.getElementById('masterFile');
  const plant=document.getElementById('plantSelect');
  const reflectBtn=document.getElementById('btnReflect');
  const judgeBtn=document.getElementById('btnJudge');
  [src,master].forEach(el=>el&&el.addEventListener('change',()=>resetAndRun(el.id+' upload')));
  if(plant)plant.addEventListener('change',()=>resetAndRun('plant change'));
  [reflectBtn,judgeBtn].forEach(btn=>btn&&new MutationObserver(()=>tryAutoRun('readiness enabled')).observe(btn,{attributes:true,attributeFilter:['disabled','data-safe-reflect-ready']}));
  document.addEventListener('hd24-safe-reflect-success',syncSuccess);
  window.addEventListener('hd24-safe-reflect-complete',syncSuccess);
  watchdog=setInterval(()=>{const sig=getSignature();if(!sig||sig===completedSignature)return;if(runningSignature===sig)return;tryAutoRun('watchdog')},15000);
  window.addEventListener('beforeunload',()=>watchdog&&clearInterval(watchdog),{once:true});
  resetAndRun('startup');
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',wire,{once:true});
else wire();
})();