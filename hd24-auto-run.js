(()=>{
'use strict';
let completedSignature='';
let runningSignature='';
let runningSince=0;
let watchdog=null;

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

function syncSuccess(){
  const sig=getSignature();
  if(sig&&window.hd24SafeReflectSuccessSignature===sig){
    completedSignature=sig;
    runningSignature='';
    runningSince=0;
    return true;
  }
  return false;
}

function tryAutoRun(reason){
  const sig=getSignature();
  if(!sig)return;
  if(syncSuccess()||sig===completedSignature)return;
  if(!isReady())return;

  const now=Date.now();
  if(runningSignature===sig&&now-runningSince<30000)return;

  const btn=document.getElementById('btnReflect');
  runningSignature=sig;
  runningSince=now;
  writeLog('자동 실행 시작: '+reason+' — 업로드 완료 즉시 안전검증/실적반영');
  try{
    btn.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,view:window}));
  }catch(e){
    runningSignature='';
    runningSince=0;
    writeLog('자동 실행 오류: '+(e&&e.message||e));
  }
}

function resetAndRun(reason){
  completedSignature='';
  runningSignature='';
  runningSince=0;
  [0,50,120,250,500,900,1500,2500,4000,6500,10000,15000,25000,40000,60000].forEach(ms=>setTimeout(()=>tryAutoRun(reason),ms));
}

function wire(){
  const src=document.getElementById('srcFile');
  const master=document.getElementById('masterFile');
  const plant=document.getElementById('plantSelect');
  const btn=document.getElementById('btnReflect');
  [src,master].forEach(el=>el&&el.addEventListener('change',()=>resetAndRun(el.id+' upload')));
  if(plant)plant.addEventListener('change',()=>resetAndRun('plant change'));
  if(btn){
    new MutationObserver(()=>tryAutoRun('readiness enabled')).observe(btn,{attributes:true,attributeFilter:['disabled','data-safe-reflect-ready']});
  }
  document.addEventListener('hd24-safe-reflect-success',syncSuccess);
  watchdog=setInterval(()=>tryAutoRun('watchdog'),1000);
  window.addEventListener('beforeunload',()=>watchdog&&clearInterval(watchdog),{once:true});
  resetAndRun('startup');
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',wire,{once:true});
else wire();
})();
