(()=>{
'use strict';
let lastAutoSignature='';
let attemptToken=0;

function getSignature(){
  const src=document.getElementById('srcFile');
  const master=document.getElementById('masterFile');
  const plant=document.getElementById('plantSelect');
  const sf=src&&src.files&&src.files[0];
  const mf=master&&master.files&&master.files[0];
  if(!sf||!mf)return '';
  return [plant?plant.value:'',sf.name,sf.size,sf.lastModified,mf.name,mf.size,mf.lastModified].join('|');
}

function isReady(){
  const btn=document.getElementById('btnReflect');
  const sig=getSignature();
  return !!(sig&&btn&&!btn.disabled&&window.hd24SafeReflectReady===true&&btn.dataset.safeReflectReady==='1');
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

function tryAutoRun(reason,token){
  if(token!==attemptToken)return;
  const sig=getSignature();
  if(!sig||sig===lastAutoSignature||!isReady())return;
  const btn=document.getElementById('btnReflect');
  lastAutoSignature=sig;
  writeLog('자동 실행 시작: '+reason+' — 업로드 완료 즉시 안전검증/실적반영');
  try{
    btn.click();
  }catch(e){
    lastAutoSignature='';
    writeLog('자동 실행 오류: '+(e&&e.message||e));
    throw e;
  }
}

function scheduleAutoRun(reason){
  const token=++attemptToken;
  [0,50,120,250,500,900,1500,2500,4000,6500,10000].forEach(ms=>setTimeout(()=>tryAutoRun(reason,token),ms));
}

function wire(){
  const src=document.getElementById('srcFile');
  const master=document.getElementById('masterFile');
  const plant=document.getElementById('plantSelect');
  const btn=document.getElementById('btnReflect');
  [src,master].forEach(el=>el&&el.addEventListener('change',()=>{
    lastAutoSignature='';
    scheduleAutoRun(el.id+' upload');
  }));
  if(plant)plant.addEventListener('change',()=>{
    lastAutoSignature='';
    scheduleAutoRun('plant change');
  });
  if(btn){
    new MutationObserver(()=>scheduleAutoRun('readiness enabled')).observe(btn,{attributes:true,attributeFilter:['disabled','data-safe-reflect-ready']});
  }
  scheduleAutoRun('startup');
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',wire,{once:true});
else wire();
})();
