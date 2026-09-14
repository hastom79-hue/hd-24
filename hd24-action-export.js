(()=>{
'use strict';

let capturedSafe=null;
let capturePromise=null;
let processedSignature='';
let triggerSignature='';
let analysisReadySignature='';
let judgeClickedAt=0;
let analysisReadyLogged='';
let analysisMutationSeen=false;
let cycle=0;
let triggerCycle=0;
let analysisReadyCycle=0;
const originalClick=HTMLAnchorElement.prototype.click;

function el(id){return document.getElementById(id)}
function logSafe(msg){try{if(typeof log==='function')log(msg);else if(el('log'))el('log').textContent+='\n'+msg}catch(_){}}
function plant(){return el('plantSelect')?.value||''}
function signature(){const a=el('srcFile')?.files?.[0],b=el('masterFile')?.files?.[0];if(!a||!b)return '';return [plant(),a.name,a.size,a.lastModified,b.name,b.size,b.lastModified].join('|')}
function safeName(name){return String(name||'').replace(/\.(xlsx|xlsm)$/i,'')}
function getAllResults(){try{return Array.isArray(allResults)?allResults:[]}catch(_){return []}}
function getMonth(){try{return Number(selectedMonth)||0}catch(_){return 0}}
function getMasterSheet(){try{return cfg().masterSheet||''}catch(_){return ''}}
function currentAnalysisState(){
  const horizon=getMonth(),results=getAllResults();
  const current=(horizon>=1&&horizon<=12)?results.filter(r=>Number(r.month)===horizon):[];
  return {horizon,results,current,ready:horizon>=1&&horizon<=12&&current.length>0};
}
function snapshotItem(r){
  return {
    month:Number(r.month)||0,
    masterRow:Number(r.masterRow)||0,
    kpi:r.kpi||'',kpiEn:r.kpiEn||'',direction:r.direction||'',unit:r.unit||'',
    target:r.target??null,actual:r.actual??null,achieved:!!r.achieved,
    streak:Number(r.streak)||0,trend:r.trend||'flat'
  };
}
function currentCycle(){return cycle}
function reset(){
  cycle+=1;window.hd24ActionCycle=cycle;
  capturedSafe=null;capturePromise=null;processedSignature='';triggerSignature='';analysisReadySignature='';analysisReadyLogged='';analysisMutationSeen=false;judgeClickedAt=0;triggerCycle=0;analysisReadyCycle=0;
}

HTMLAnchorElement.prototype.click=function(){
  try{
    const name=String(this.download||'');
    const href=String(this.href||'');
    if(/검증반영본\.(xlsx|xlsm)$/i.test(name)&&href.startsWith('blob:')){
      const sig=signature(),captureCycle=currentCycle();
      capturePromise=fetch(href).then(r=>{if(!r.ok)throw new Error('safe blob fetch '+r.status);return r.arrayBuffer()}).then(buf=>{
        if(captureCycle!==currentCycle()||signature()!==sig)throw new Error('stale safe blob cycle');
        capturedSafe={signature:sig,cycle:captureCycle,name,buffer:buf,capturedAt:new Date().toISOString()};
        logSafe('안전반영 결과 캡처 완료 → 자동분석 최종파일 후처리 대기');
        return capturedSafe;
      }).catch(e=>{if(captureCycle===currentCycle())capturedSafe=null;logSafe('안전반영 결과 캡처 실패: '+(e?.message||e));throw e});
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

function markAnalysisReady(reason){
  const sig=signature();
  if(!sig||sig!==triggerSignature||window.hd24SafeReflectSuccessSignature!==sig||!judgeClickedAt||!analysisMutationSeen||triggerCycle!==currentCycle())return false;
  const a=currentAnalysisState();
  if(!a.ready)return false;
  analysisReadySignature=sig;analysisReadyCycle=currentCycle();
  if(analysisReadyLogged!==sig){
    analysisReadyLogged=sig;
    logSafe(`KPI 분석 결과 동기화 완료: ${reason} / ${a.horizon}월 ${a.current.length}건 / cycle=${currentCycle()}`);
  }
  return true;
}

async function makeFinalActionWorkbook(reason){
  const sig=signature(),workCycle=currentCycle();
  if(!sig||sig===processedSignature)return;
  if(window.hd24SafeReflectSuccessSignature!==sig)return;
  if(analysisReadySignature!==sig||analysisReadyCycle!==workCycle)return;
  const master=el('masterFile')?.files?.[0];
  if(!master)return;
  if(/\.xlsm$/i.test(master.name)){
    processedSignature=sig;
    logSafe('후속조치 열 자동생성 보류: XLSM 매크로 보존을 위해 ExcelJS 재저장을 차단했습니다. 안전반영본은 그대로 유지됩니다.');
    return;
  }
  if(typeof ExcelJS==='undefined'||!window.hd24KpiActionWorkbook||!window.hd24KpiActionClassifier)return;
  const a=currentAnalysisState(),results=a.results,horizon=a.horizon;
  if(!a.ready)return;
  const analysisSnapshot=a.current.map(snapshotItem);
  if(!analysisSnapshot.length||analysisSnapshot.some(x=>x.month!==horizon||!x.masterRow)){
    logSafe('최종 분석파일 생성 차단: 현재월 분석 스냅샷 검증 실패');return;
  }
  if(!capturedSafe||capturedSafe.signature!==sig||capturedSafe.cycle!==workCycle){if(capturePromise)try{await capturePromise}catch(_){return};}
  if(workCycle!==currentCycle()||signature()!==sig)return;
  if(!capturedSafe||capturedSafe.signature!==sig||capturedSafe.cycle!==workCycle)return;

  const mappings=resolvedMappingsFromResults(results);
  if(!mappings.length)return;
  const sheetName=getMasterSheet();
  if(!sheetName){logSafe('후속조치 파일 생성 차단: 총괄 시트명 확인 실패');return;}
  try{
    const wb=new ExcelJS.Workbook();
    await wb.xlsx.load(capturedSafe.buffer);
    if(workCycle!==currentCycle()||signature()!==sig)throw new Error('stale action-export cycle after workbook load');
    const ws=wb.getWorksheet(sheetName);
    if(!ws)throw new Error('총괄 시트 없음: '+sheetName);
    const out=window.hd24KpiActionWorkbook.applyKpiActionColumn({worksheet:ws,resolvedMappings:mappings,horizon,classifier:window.hd24KpiActionClassifier,headerRow:4});
    const buf=await wb.xlsx.writeBuffer();
    if(workCycle!==currentCycle()||signature()!==sig)throw new Error('stale action-export cycle after workbook write');
    const file=new File([buf],safeName(capturedSafe.name)+'_분석후속조치본.xlsx',{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
    const u=URL.createObjectURL(file),a=document.createElement('a');a.href=u;a.download=file.name;originalClick.call(a);setTimeout(()=>URL.revokeObjectURL(u),30000);
    processedSignature=sig;
    const abnormal=out.results.filter(x=>x.result&&x.result.label!=='정상/개선').length;
    logSafe(`최종 분석파일 자동 추출 완료: ${file.name} / 후속조치열 ${out.actionCol}열 / 관리대상 ${abnormal}건 / 분석스냅샷 ${analysisSnapshot.length}건 고정 / cycle=${workCycle}`);
    window.dispatchEvent(new CustomEvent('hd24-action-export-complete',{detail:{signature:sig,cycle:workCycle,fileName:file.name,actionCol:out.actionCol,abnormalCount:abnormal,reason,month:horizon,items:analysisSnapshot}}));
  }catch(e){if(workCycle===currentCycle())processedSignature='';logSafe('최종 분석파일 생성 차단: '+(e?.message||e));console.error(e);}
}

function tryTriggerJudge(){
  const sig=signature();if(!sig||window.hd24SafeReflectSuccessSignature!==sig||(triggerSignature===sig&&triggerCycle===currentCycle()))return;
  const btn=el('btnJudge');if(!btn||btn.disabled)return;
  triggerSignature=sig;triggerCycle=currentCycle();
  analysisReadySignature='';analysisReadyCycle=0;
  analysisReadyLogged='';
  analysisMutationSeen=false;
  judgeClickedAt=Date.now();
  try{btn.click();logSafe(`안전반영 완료 → 자동 KPI 분석 실행 / cycle=${triggerCycle}`)}catch(e){triggerSignature='';triggerCycle=0;analysisMutationSeen=false;judgeClickedAt=0;logSafe('자동 KPI 분석 실행 오류: '+(e?.message||e))}
}

function schedule(reason){const scheduledCycle=currentCycle();[0,80,200,500,1000,1800,3000,5000,8000].forEach(ms=>setTimeout(()=>{if(scheduledCycle!==currentCycle())return;tryTriggerJudge();markAnalysisReady(reason);makeFinalActionWorkbook(reason)},ms))}
function wire(){
  reset();
  ['srcFile','masterFile','plantSelect'].forEach(id=>el(id)?.addEventListener('change',()=>{reset();schedule(id+' change')}));
  window.addEventListener('hd24-safe-reflect-complete',()=>schedule('safe reflect complete'));
  const rc=el('resultCard');if(rc)new MutationObserver(()=>{
    const sig=signature();
    if(sig&&sig===triggerSignature&&triggerCycle===currentCycle()&&window.hd24SafeReflectSuccessSignature===sig&&judgeClickedAt)analysisMutationSeen=true;
    markAnalysisReady('analysis result updated');
    schedule('analysis result updated');
  }).observe(rc,{attributes:true,childList:true,subtree:true});
  schedule('startup');
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',wire,{once:true});else wire();
})();