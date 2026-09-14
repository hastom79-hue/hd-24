(()=>{
'use strict';
let completedSignature='';
let runningSignature='';
let runningSince=0;
let watchdog=null;
let lastWaitState='';

function getSignature(){
  const src=document.getElementById('srcFile');
  const master=document.getElementById('masterFile');
  const plant=document.getElementById('plantSelect');
  const sf=src&&src.files&&src.files[0];
  const mf=master&&master.files&&master.files[0];
  if(!sf||!mf)return '';
  return [plant?plant.value:'',sf.name,sf.size,sf.lastModified,mf.name,mf.size,mf.lastModified].join('|');
}

function coreReady(){
  try{
    const hasSrc=typeof srcWorkbook!=='undefined'&&!!srcWorkbook;
    const hasMaster=typeof masterWorkbook!=='undefined'&&!!masterWorkbook;
    const hasZip=typeof masterZip!=='undefined'&&!!masterZip;
    const hasMapping=typeof mappingData!=='undefined'&&Array.isArray(mappingData)&&mappingData.length>0;
    return {hasSrc,hasMaster,hasZip,hasMapping,ok:hasSrc&&hasMaster&&hasZip&&hasMapping};
  }catch(_){return {hasSrc:false,hasMaster:false,hasZip:false,hasMapping:false,ok:false};}
}

function readiness(){
  const btn=document.getElementById('btnReflect');
  const sig=getSignature();
  const core=coreReady();
  const safe=window.hd24SafeReflectReady===true&&!!btn&&btn.dataset.safeReflectReady==='1';
  // checkReady() has occasionally lagged behind actual workbook/mapping readiness in the live page.
  // If every fail-closed prerequisite is independently confirmed, repair only the stale disabled UI state.
  if(sig&&btn&&btn.disabled&&safe&&core.ok){
    btn.disabled=false;
    if(typeof window.checkReady==='function'){
      try{window.checkReady()}catch(_){ }
    }
  }
  return {
    sig,btn,core,
    ok:!!(sig&&btn&&!btn.disabled&&safe&&core.ok),
    disabled:btn?!!btn.disabled:null,
    globalReady:window.hd24SafeReflectReady===true,
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
  if(sig&&window.hd24SafeReflectSuccessSignature===sig){
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
  return `disabled=${s.disabled} / safe=${s.globalReady} / dataset=${s.datasetReady||'-'} / src=${s.core.hasSrc} / master=${s.core.hasMaster} / zip=${s.core.hasZip} / mapping=${s.core.hasMapping}`;
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
  if(runningSignature===sig&&now-runningSince<3000)return;
  runningSignature=sig;
  runningSince=now;
  writeLog('자동 실행 시작: '+reason+' — 업로드 완료 즉시 안전검증/실적반영');
  try{s.btn.click();}
  catch(e){runningSignature='';runningSince=0;writeLog('자동 실행 오류: '+(e&&e.message||e));}
}

function resetAndRun(reason){
  completedSignature='';
  runningSignature='';
  runningSince=0;
  lastWaitState='';
  [0,50,120,250,500,900,1500,2500,4000,6500,10000,15000,25000,40000,60000].forEach(ms=>setTimeout(()=>tryAutoRun(reason),ms));
}

function wire(){
  const src=document.getElementById('srcFile');
  const master=document.getElementById('masterFile');
  const plant=document.getElementById('plantSelect');
  const btn=document.getElementById('btnReflect');
  [src,master].forEach(el=>el&&el.addEventListener('change',()=>resetAndRun(el.id+' upload')));
  if(plant)plant.addEventListener('change',()=>resetAndRun('plant change'));
  if(btn)new MutationObserver(()=>tryAutoRun('readiness enabled')).observe(btn,{attributes:true,attributeFilter:['disabled','data-safe-reflect-ready']});
  document.addEventListener('hd24-safe-reflect-success',syncSuccess);
  window.addEventListener('hd24-safe-reflect-complete',syncSuccess);
  watchdog=setInterval(()=>tryAutoRun('watchdog'),1000);
  window.addEventListener('beforeunload',()=>watchdog&&clearInterval(watchdog),{once:true});
  resetAndRun('startup');
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',wire,{once:true});
else wire();
})();
