(()=>{
'use strict';

let capturedSafe=null;
let capturePromise=null;
let processedSignature='';
let triggerSignature='';
const originalClick=HTMLAnchorElement.prototype.click;

function el(id){return document.getElementById(id)}
function logSafe(msg){try{if(typeof log==='function')log(msg);else if(el('log'))el('log').textContent+='\n'+msg}catch(_){}}
function plant(){return el('plantSelect')?.value||''}
function signature(){const a=el('srcFile')?.files?.[0],b=el('masterFile')?.files?.[0];if(!a||!b)return '';return [plant(),a.name,a.size,a.lastModified,b.name,b.size,b.lastModified].join('|')}
function safeName(name){return String(name||'').replace(/\.(xlsx|xlsm)$/i,'')}
function getAllResults(){try{return Array.isArray(allResults)?allResults:[]}catch(_){return []}}
function getMonth(){try{return Number(selectedMonth)||0}catch(_){return 0}}
function getMasterSheet(){try{return cfg().masterSheet||''}catch(_){return ''}}

HTMLAnchorElement.prototype.click=function(){
  try{
    const name=String(this.download||'');
    const href=String(this.href||'');
    if(/검증반영본\.(xlsx|xlsm)$/i.test(name)&&href.startsWith('blob:')){
      const sig=signature();
      capturePromise=fetch(href).then(r=>{if(!r.ok)throw new Error('safe blob fetch '+r.status);return r.arrayBuffer()}).then(buf=>{
        capturedSafe={signature:sig,name,buffer:buf,capturedAt:new Date().toISOString()};
        logSafe('안전반영 결과 캡처 완료 → 자동분석 최종파일 후처리 대기');
        return capturedSafe;
      }).catch(e=>{capturedSafe=null;logSafe('안전반영 결과 캡처 실패: '+(e?.message||e));throw e});
    }
  }catch(e){logSafe('안전반영 결과 캡처 훅 오류: '+(e?.message||e))}
  return originalClick.apply(this,arguments);
};

function resolvedMappingsFromResults(results){
  const map=new Map();
  for(const r of results){
    const row=Number(r.masterRow);
    if(!row)continue;
    if(!map.has(row))map.set(row,{masterRow:row,kpiKr:r.kpi||'',kpiEn:r.kpiEn||'',direction:r.direction||''});
  }
  return [...map.values()];
}

async function makeFinalActionWorkbook(reason){
  const sig=signature();
  if(!sig||sig===processedSignature)return;
  if(window.hd24SafeReflectSuccessSignature!==sig)return;
  const master=el('masterFile')?.files?.[0];
  if(!master)return;
  if(/\.xlsm$/i.test(master.name)){
    processedSignature=sig;
    logSafe('후속조치 열 자동생성 보류: XLSM 매크로 보존을 위해 ExcelJS 재저장을 차단했습니다. 안전반영본은 그대로 유지됩니다.');
    return;
  }
  if(typeof ExcelJS==='undefined'||!window.hd24KpiActionWorkbook||!window.hd24KpiActionClassifier)return;
  const results=getAllResults(),horizon=getMonth();
  if(!results.length||!(horizon>=1&&horizon<=12))return;
  if(!capturedSafe||capturedSafe.signature!==sig){if(capturePromise)try{await capturePromise}catch(_){return};}
  if(!capturedSafe||capturedSafe.signature!==sig)return;

  const mappings=resolvedMappingsFromResults(results);
  if(!mappings.length)return;
  const sheetName=getMasterSheet();
  if(!sheetName){logSafe('후속조치 파일 생성 차단: 총괄 시트명 확인 실패');return;}
  try{
    const wb=new ExcelJS.Workbook();
    await wb.xlsx.load(capturedSafe.buffer);
    const ws=wb.getWorksheet(sheetName);
    if(!ws)throw new Error('총괄 시트 없음: '+sheetName);
    const out=window.hd24KpiActionWorkbook.applyKpiActionColumn({worksheet:ws,resolvedMappings:mappings,horizon,classifier:window.hd24KpiActionClassifier,headerRow:4});
    const buf=await wb.xlsx.writeBuffer();
    const file=new File([buf],safeName(capturedSafe.name)+'_분석후속조치본.xlsx',{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
    const u=URL.createObjectURL(file),a=document.createElement('a');a.href=u;a.download=file.name;originalClick.call(a);setTimeout(()=>URL.revokeObjectURL(u),30000);
    processedSignature=sig;
    const abnormal=out.results.filter(x=>x.result&&x.result.label!=='정상/개선').length;
    logSafe(`최종 분석파일 자동 추출 완료: ${file.name} / 후속조치열 ${out.actionCol}열 / 관리대상 ${abnormal}건`);
    window.dispatchEvent(new CustomEvent('hd24-action-export-complete',{detail:{signature:sig,fileName:file.name,actionCol:out.actionCol,abnormalCount:abnormal,reason}}));
  }catch(e){processedSignature='';logSafe('최종 분석파일 생성 차단: '+(e?.message||e));console.error(e);}
}

function tryTriggerJudge(){
  const sig=signature();if(!sig||window.hd24SafeReflectSuccessSignature!==sig||triggerSignature===sig)return;
  const btn=el('btnJudge');if(!btn||btn.disabled)return;
  triggerSignature=sig;
  try{btn.click();logSafe('안전반영 완료 → 자동 KPI 분석 실행')}catch(e){triggerSignature='';logSafe('자동 KPI 분석 실행 오류: '+(e?.message||e))}
}

function schedule(reason){[0,80,200,500,1000,1800,3000,5000,8000].forEach(ms=>setTimeout(()=>{tryTriggerJudge();makeFinalActionWorkbook(reason)},ms))}
function reset(){capturedSafe=null;capturePromise=null;processedSignature='';triggerSignature=''}
function wire(){
  ['srcFile','masterFile','plantSelect'].forEach(id=>el(id)?.addEventListener('change',()=>{reset();schedule(id+' change')}));
  window.addEventListener('hd24-safe-reflect-complete',()=>schedule('safe reflect complete'));
  const rc=el('resultCard');if(rc)new MutationObserver(()=>schedule('analysis result updated')).observe(rc,{attributes:true,childList:true,subtree:true});
  schedule('startup');
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',wire,{once:true});else wire();
})();
