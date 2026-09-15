(()=>{
'use strict';
const FILE_ID='hd24ReplyFile';
const BUTTON_ID='hd24ImportReply';
let autoFile=null;
let autoAt=0;
function selected(){return document.getElementById(FILE_ID)?.files?.[0]||null}
function markAuto(){const f=selected();if(!f)return;autoFile=f;autoAt=Date.now();const b=document.getElementById(BUTTON_ID);if(b){b.dataset.hd24AutoImportPending='1';setTimeout(()=>{if(b.dataset.hd24AutoImportPending==='1')delete b.dataset.hd24AutoImportPending},5000)}}
function suppressDuplicateClick(e){const f=selected();if(!f||f!==autoFile||Date.now()-autoAt>5000)return;const b=document.getElementById(BUTTON_ID);if(!b||!b.contains(e.target))return;e.preventDefault();e.stopImmediatePropagation();delete b.dataset.hd24AutoImportPending;try{if(typeof log==='function')log('회신 파일 중복 반영 방지: 자동 반영 직후 동일 파일 수동 재실행 차단')}catch(_){}}
document.addEventListener('change',e=>{if(e.target?.id===FILE_ID)markAuto()},true);
document.addEventListener('click',suppressDuplicateClick,true);
})();