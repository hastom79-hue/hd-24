(()=>{
'use strict';
function logSafe(msg){
  try{
    if(typeof window.log==='function')window.log(msg);
    else{const e=document.getElementById('log');if(e){e.textContent+='\n'+msg;e.scrollTop=e.scrollHeight}}
  }catch(_){}
}
window.addEventListener('hd24-action-export-complete',e=>{
  const eventCycle=Number(e?.detail?.cycle)||0;
  const currentCycle=Number(window.hd24ActionCycle)||0;
  if(!eventCycle||!currentCycle||eventCycle!==currentCycle){
    e.stopImmediatePropagation();
    logSafe(`분석후속조치 stale cycle 이벤트 차단: event=${eventCycle||'-'} / current=${currentCycle||'-'}`);
  }
},true);
})();