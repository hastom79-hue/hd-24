(()=>{
'use strict';
// Single automatic follow-up orchestrator. Completion is fail-closed until the actual
// reply workbook has been built, downloaded, reopened, and cross-checked against the
// exact same action-export snapshot, watch-KPI selection, Preview metadata, and upload cycle.
window.hd24FollowupSyncOwnsAutoPackage=true;
let activeSignature='';
let activeCycle=0;
let completedSignature='';
let completedCycle=0;
let runningSignature='';
let runningCycle=0;
let actionExportSignature='';
let actionExportCycle=0;
let replyRequestedSignature='';
let replyRequestedCycle=0;
let replyDownloadedSignature='';
let replyDownloadedCycle=0;
let replyPin=null;
let replyAttempts={};
let lastState='';
const replyFiles=new Map();
const REPLY_KEY='hd24_kpi_reply_history_v2';

const $=id=>document.getElementById(id);
const norm=v=>String(v??'').toLowerCase().replace(/\r?\n/g,' ').replace(/["'“”‘’]/g,'').replace(/[()\[\]{}%:/\\,_-]/g,' ').replace(/\s+/g,' ').trim();
function signature(){
  const plant=$('plantSelect')?.value||'';
  const sf=$('srcFile')?.files?.[0],mf=$('masterFile')?.files?.[0];
  if(!sf||!mf)return '';
  return [plant,sf.name,sf.size,sf.lastModified,mf.name,mf.size,mf.lastModified].join('|');
}
function currentCycle(){return Number(window.hd24ActionCycle)||0}
function cycleKey(sig,cycle){return `${cycle}::${sig}`}
function plantKey(){return $('plantSelect')?.value||''}
function plantName(){const p=plantKey();return p==='india'?'India':p==='brazil'?'Brazil':p==='ulsan'?'Ulsan':p}
function analysisState(){
  let m=0,results=[];
  try{m=Number(selectedMonth)||0}catch(_){}
  try{results=Array.isArray(allResults)?allResults:[]}catch(_){}
  const current=m?results.filter(r=>Number(r.month)===m):[];
  return {month:m,total:results.length,current:current.length,ready:m>=1&&m<=12&&current.length>0};
}
function snapshotFor(sig,cycle=currentCycle()){
  const s=window.hd24FollowupSnapshot;
  if(!s||s.signature!==sig||Number(s.cycle)!==Number(cycle)||!(Number(s.month)>=1&&Number(s.month)<=12)||!Array.isArray(s.items)||!s.items.length)return null;
  if(s.items.some(x=>Number(x.month)!==Number(s.month)||!Number(x.masterRow)))return null;
  return s;
}
function loadReplyHistory(){try{return JSON.parse(localStorage.getItem(REPLY_KEY)||'[]')}catch(_){return []}}
function similarity(a,b){a=norm(a);b=norm(b);if(!a||!b)return 0;if(a===b||a.includes(b)||b.includes(a))return 1;const A=new Set(a.split(' ').filter(x=>x.length>1)),B=new Set(b.split(' ').filter(x=>x.length>1));let hit=0;A.forEach(x=>B.has(x)&&hit++);return hit/Math.max(1,Math.min(A.size,B.size));}
function recurrenceForSnapshot(r){
  const k=norm(r.kpiEn||r.kpi),h=loadReplyHistory().filter(x=>x.plant===plantKey()&&norm(x.kpiEn||x.kpi)===k).sort((a,b)=>String(b.replyReceivedAt||'').localeCompare(String(a.replyReceivedAt||'')));
  if(h.length<2)return h.length?{latest:h[0],sameCauseCount:1,isRecurrence:false}:null;
  const latest=h[0],cause=latest.rootCause||latest.reason||'',same=h.filter(x=>similarity(cause,x.rootCause||x.reason||'')>=0.6).length;
  return {latest,sameCauseCount:same,isRecurrence:same>=2};
}
function isWatchTarget(r){const rec=recurrenceForSnapshot(r);return !r.achieved||Number(r.streak)>=2||r.trend==='down'||!!rec?.isRecurrence}
function expectedWatchItems(sig,cycle=currentCycle()){const s=snapshotFor(sig,cycle);return s?s.items.filter(isWatchTarget):[]}
function expectedWatchRows(sig,cycle=currentCycle()){return expectedWatchItems(sig,cycle).map(x=>Number(x.masterRow)).sort((a,b)=>a-b)}
function watchFingerprint(sig,cycle=currentCycle()){return expectedWatchRows(sig,cycle).join(',')}
function withSnapshot(sig,cycle,fn){
  const s=snapshotFor(sig,cycle);if(!s)return false;
  let oldResults,oldMonth;
  try{oldResults=allResults;oldMonth=selectedMonth;allResults=s.items.map(x=>({...x}));selectedMonth=Number(s.month);fn();return true}
  catch(_){return false}
  finally{try{allResults=oldResults;selectedMonth=oldMonth}catch(_){}}
}
function logSafe(msg){try{if(typeof window.log==='function')window.log(msg);else if($('log')){$('log').textContent+='\n'+msg;$('log').scrollTop=$('log').scrollHeight}}catch(_){}}
function previewMeta(sig,cycle=currentCycle()){
  const p=$('hd24Preview'),sub=$('hd24PreviewSubject')?.textContent||'',snap=snapshotFor(sig,cycle),watch=expectedWatchItems(sig,cycle);
  if(!p||p.style.display==='none'||!sub||!snap)return null;
  const m=sub.match(/-\s*(\d{1,2})M\s*\((\d+)\s*KPI/i);
  const month=m?Number(m[1]):0,count=m?Number(m[2]):-1;
  const valid=month===Number(snap.month)&&count===watch.length&&sub.includes(plantName());
  return {valid,month,count,subject:sub,watchCount:watch.length,watchRows:expectedWatchRows(sig,cycle)};
}
function previewReady(sig,cycle=currentCycle()){const p=$('hd24Preview'),meta=previewMeta(sig,cycle);return !!(p&&p.dataset.hd24Signature===sig&&Number(p.dataset.hd24Cycle)===Number(cycle)&&p.dataset.hd24Rows===watchFingerprint(sig,cycle)&&meta?.valid)}
function tagPreview(sig,cycle=currentCycle()){
  const p=$('hd24Preview'),meta=previewMeta(sig,cycle),snap=snapshotFor(sig,cycle);
  if(!p||!meta?.valid||!snap)return false;
  p.dataset.hd24Signature=sig;p.dataset.hd24Cycle=String(cycle);p.dataset.hd24Month=String(snap.month);p.dataset.hd24Count=String(meta.count);p.dataset.hd24Rows=watchFingerprint(sig,cycle);return true;
}
function clearPreview(){
  const p=$('hd24Preview');if(p){p.style.display='none';delete p.dataset.hd24Signature;delete p.dataset.hd24Cycle;delete p.dataset.hd24Month;delete p.dataset.hd24Count;delete p.dataset.hd24Rows;}
  window.hd24FollowupSnapshot=null;
  const s=$('hd24MailStatus');if(s)s.textContent='새 파일 분석 대기 중 · 안전반영 → 분석파일 생성 후 Preview를 준비합니다.';
}
function cellValue(v){
  if(v==null)return '';
  if(typeof v==='object'){if(v.text!=null)return v.text;if(v.result!=null)return v.result;if(Array.isArray(v.richText))return v.richText.map(x=>x.text||'').join('')}
  return v;
}
function sameValue(a,b){
  if((a==null||a==='')&&(b==null||b===''))return true;
  const na=Number(a),nb=Number(b);if(Number.isFinite(na)&&Number.isFinite(nb))return Math.abs(na-nb)<=1e-9*Math.max(1,Math.abs(na),Math.abs(nb));
  return norm(a)===norm(b);
}
function baseTags(r){const out=[];if(!r.achieved)out.push('Target Miss');if(Number(r.streak)>=3)out.push(`${Number(r.streak)}M Consecutive Miss`);else if(Number(r.streak)>=2)out.push('Temporary / Consecutive Miss');if(r.trend==='down')out.push('Worsening');return out}
function snapshotLookup(snap){
  const map=new Map();for(const r of snap.items){for(const k of [norm(r.kpiEn),norm(r.kpi)].filter(Boolean))if(!map.has(k))map.set(k,r)}return map;
}
async function validateReplyFile(file,sig,cycle){
  if(currentCycle()!==cycle||signature()!==sig)throw new Error('검증 시작 전 업로드 cycle 변경');
  const snap=snapshotFor(sig,cycle),meta=previewMeta(sig,cycle),expected=expectedWatchRows(sig,cycle);if(!snap||!meta?.valid)throw new Error('Preview/분석스냅샷 상태 불일치');
  if(typeof ExcelJS==='undefined')throw new Error('ExcelJS unavailable');
  if(!expected.length)throw new Error('관리대상 KPI 0건인데 회신 Excel 생성 시도');
  const expectedName=`HDPS_KPI_Response_${plantName()}_${snap.month}M.xlsx`;
  if(file.name!==expectedName)throw new Error(`회신파일명 불일치: ${file.name}`);
  const wb=new ExcelJS.Workbook();await wb.xlsx.load(await file.arrayBuffer());
  if(currentCycle()!==cycle||signature()!==sig)throw new Error('회신 Excel 검증 중 업로드 cycle 변경');
  const ws=wb.worksheets?.[0];if(!ws)throw new Error('회신 워크북 시트 없음');
  const lookup=snapshotLookup(snap),rows=[],seen=new Set(),expectedSet=new Set(expected.map(String));
  ws.eachRow((row,rn)=>{
    if(rn===1)return;
    const v=i=>cellValue(row.getCell(i).value);
    const kpiKr=v(3),kpiEn=v(4);if(!norm(kpiKr||kpiEn))return;
    rows.push({plant:v(1),month:Number(v(2)),kpiKr,kpiEn,target:v(5),actual:v(6),status:String(v(7)||'')});
  });
  if(rows.length!==meta.count)throw new Error(`Preview↔회신 Excel KPI 건수 불일치: ${meta.count} vs ${rows.length}`);
  if(rows.length!==expected.length)throw new Error(`관리대상↔회신 Excel KPI 건수 불일치: ${expected.length} vs ${rows.length}`);
  for(const r of rows){
    if(r.plant!==plantName())throw new Error(`회신 Excel 사업장 불일치: ${r.plant}`);
    if(r.month!==Number(snap.month))throw new Error(`회신 Excel 대상월 불일치: ${r.month}`);
    const key=norm(r.kpiEn||r.kpiKr),src=lookup.get(key)||lookup.get(norm(r.kpiKr));
    if(!src)throw new Error(`회신 Excel KPI가 분석스냅샷에 없음: ${r.kpiEn||r.kpiKr}`);
    const uniq=String(src.masterRow);if(!expectedSet.has(uniq))throw new Error(`회신 Excel KPI가 관리대상 집합에 없음: ${r.kpiEn||r.kpiKr}`);if(seen.has(uniq))throw new Error(`회신 Excel 중복 KPI: ${r.kpiEn||r.kpiKr}`);seen.add(uniq);
    if(!sameValue(r.target,src.target))throw new Error(`회신 Excel Target 불일치: ${r.kpiEn||r.kpiKr}`);
    if(!sameValue(r.actual,src.actual))throw new Error(`회신 Excel Actual 불일치: ${r.kpiEn||r.kpiKr}`);
    if(!r.status.trim())throw new Error(`회신 Excel Status/Trend 공란: ${r.kpiEn||r.kpiKr}`);
    for(const tag of baseTags(src))if(!r.status.includes(tag))throw new Error(`회신 Excel Status/Trend 불일치: ${r.kpiEn||r.kpiKr} / ${tag}`);
  }
  if(seen.size!==expectedSet.size||[...expectedSet].some(x=>!seen.has(x)))throw new Error('회신 Excel 관리대상 KPI 집합 불일치');
  if(currentCycle()!==cycle||signature()!==sig)throw new Error('회신 Excel 검증 완료 직전 업로드 cycle 변경');
  return {count:rows.length,month:Number(snap.month),plant:plantName(),fileName:file.name,rows:expected,cycle};
}
function restoreReplyPin(sig,cycle){
  if(!replyPin||replyPin.sig!==sig||Number(replyPin.cycle)!==Number(cycle))return;
  clearTimeout(replyPin.timer);
  try{allResults=replyPin.oldResults;selectedMonth=replyPin.oldMonth}catch(_){}
  replyPin=null;
}
function beginReplyPin(sig,cycle){
  const snap=snapshotFor(sig,cycle);if(!snap||replyPin||currentCycle()!==cycle)return false;
  try{
    const oldResults=allResults,oldMonth=selectedMonth;
    allResults=snap.items.map(x=>({...x}));selectedMonth=Number(snap.month);
    const timer=setTimeout(()=>{
      if(replyPin?.sig!==sig||Number(replyPin?.cycle)!==Number(cycle))return;
      restoreReplyPin(sig,cycle);replyRequestedSignature='';replyRequestedCycle=0;runningSignature='';runningCycle=0;
      logSafe('후속조치 패키지 차단: 회신 Excel 실제 생성/다운로드 확인 시간초과');
    },15000);
    replyPin={sig,cycle,oldResults,oldMonth,timer};return true;
  }catch(e){logSafe('회신 Excel 분석스냅샷 고정 실패: '+(e?.message||e));return false}
}
function requestReply(sig,cycle){
  const key=cycleKey(sig,cycle);
  if(!sig||currentCycle()!==cycle||(replyDownloadedSignature===sig&&replyDownloadedCycle===cycle)||(replyRequestedSignature===sig&&replyRequestedCycle===cycle)||!snapshotFor(sig,cycle)||!expectedWatchItems(sig,cycle).length)return;
  if((replyAttempts[key]||0)>=2){logSafe('후속조치 패키지 차단: 회신 Excel 검증 재시도 한도 초과');return;}
  const b=$('hd24DownloadReply');if(!b||b.disabled)return;
  if(!beginReplyPin(sig,cycle))return;
  replyAttempts[key]=(replyAttempts[key]||0)+1;replyRequestedSignature=sig;replyRequestedCycle=cycle;
  try{b.click();logSafe(`회신 Excel 생성 요청: cycle ${cycle} 실제 파일 검증 대기 (${replyAttempts[key]}/2)`)}catch(e){restoreReplyPin(sig,cycle);replyRequestedSignature='';replyRequestedCycle=0;logSafe('회신 Excel 생성 요청 오류: '+(e?.message||e))}
}
function completeIfReady(sig,cycle,verified){
  const meta=previewMeta(sig,cycle),snap=snapshotFor(sig,cycle);if(currentCycle()!==cycle||!verified||Number(verified.cycle)!==Number(cycle)||!meta?.valid||!snap||replyDownloadedSignature!==sig||replyDownloadedCycle!==cycle||verified.rows?.join(',')!==watchFingerprint(sig,cycle))return;
  completedSignature=sig;completedCycle=cycle;runningSignature='';runningCycle=0;lastState='';
  logSafe(`후속조치 패키지 완료: cycle ${cycle} ${verified.plant} ${verified.month}월 관리대상 ${verified.count} KPI exact-set ↔ Preview ↔ 회신 Excel Target/Actual/Status 검증 PASS`);
}
// Capture the actual generated File before its blob URL is clicked. This is later reopened
// with ExcelJS, so completion means workbook bytes were built and validated, not merely that
// the async download button handler was invoked.
try{
  const createObjectURL=URL.createObjectURL.bind(URL);
  URL.createObjectURL=function(obj){const u=createObjectURL(obj);try{if(obj&&/^HDPS_KPI_Response_.+_\d{1,2}M\.xlsx$/i.test(String(obj.name||'')))replyFiles.set(u,{file:obj,cycle:replyPin?.cycle||replyRequestedCycle||currentCycle()})}catch(_){}return u};
  const anchorClick=HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click=function(){
    const href=String(this.href||''),name=String(this.download||''),entry=replyFiles.get(href),sig=replyPin?.sig||replyRequestedSignature||'',cycle=Number(replyPin?.cycle||replyRequestedCycle||entry?.cycle||0),file=entry?.file;
    const ret=anchorClick.apply(this,arguments);
    if(file&&sig&&cycle&&name===file.name){
      replyFiles.delete(href);restoreReplyPin(sig,cycle);
      Promise.resolve().then(()=>validateReplyFile(file,sig,cycle)).then(v=>{
        if(currentCycle()!==cycle||signature()!==sig)throw new Error('검증 중 업로드 cycle 변경');
        replyDownloadedSignature=sig;replyDownloadedCycle=cycle;replyRequestedSignature='';replyRequestedCycle=0;
        logSafe(`회신 Excel 실제파일 exact-set 검증 PASS: cycle ${cycle} / ${v.fileName} / ${v.count}행 / rows=${v.rows.join(',')}`);completeIfReady(sig,cycle,v);
      }).catch(e=>{
        if(currentCycle()!==cycle)return;
        replyRequestedSignature='';replyRequestedCycle=0;replyDownloadedSignature='';replyDownloadedCycle=0;runningSignature='';runningCycle=0;
        logSafe('후속조치 패키지 차단: 회신 Excel 실제파일 검증 실패 — '+(e?.message||e));
        setTimeout(()=>{if(currentCycle()===cycle)trySync('reply workbook validation retry')},250);
      });
    }
    return ret;
  };
}catch(e){logSafe('회신 Excel 실제파일 검증 훅 설치 실패: '+(e?.message||e))}
function stateText(a,sig,cycle){return `cycle=${cycle} / safe=${window.hd24SafeReflectSuccessSignature===sig} / actionExport=${actionExportSignature===sig&&actionExportCycle===cycle} / snapshot=${!!snapshotFor(sig,cycle)} / watch=${expectedWatchItems(sig,cycle).length} / replyVerified=${replyDownloadedSignature===sig&&replyDownloadedCycle===cycle} / month=${a.month||'-'} / total=${a.total} / current=${a.current}`}
function trySync(reason){
  const sig=signature(),cycle=currentCycle();if(!sig||!cycle||(sig===completedSignature&&cycle===completedCycle)||(sig===runningSignature&&cycle===runningCycle))return;
  const a=analysisState(),snap=snapshotFor(sig,cycle);
  if(window.hd24SafeReflectSuccessSignature!==sig||actionExportSignature!==sig||actionExportCycle!==cycle||!snap||!a.ready){const state=stateText(a,sig,cycle);if(state!==lastState){lastState=state;logSafe('후속조치 패키지 대기: '+state)}return;}
  if(Number(a.month)!==Number(snap.month)){logSafe(`후속조치 패키지 대기: 현재 선택월 ${a.month}월 ≠ 분석파일 스냅샷 ${snap.month}월`);return;}
  const watch=expectedWatchItems(sig,cycle);if(!watch.length){completedSignature=sig;completedCycle=cycle;runningSignature='';runningCycle=0;logSafe(`후속조치 패키지 완료: cycle ${cycle} 관리대상 KPI 없음 — Preview/회신 Excel 생성 생략`);return;}
  runningSignature=sig;runningCycle=cycle;
  if(previewReady(sig,cycle)){
    requestReply(sig,cycle);
    if(replyDownloadedSignature===sig&&replyDownloadedCycle===cycle){completeIfReady(sig,cycle,{count:previewMeta(sig,cycle).count,month:snap.month,plant:plantName(),fileName:'verified',rows:expectedWatchRows(sig,cycle),cycle})}
    else if(replyRequestedSignature!==sig||replyRequestedCycle!==cycle){runningSignature='';runningCycle=0;}
    return;
  }
  const stale=$('hd24Preview');if(stale&&stale.style.display!=='none'&&(!stale.dataset.hd24Signature||Number(stale.dataset.hd24Cycle)!==cycle))stale.style.display='none';
  const mailBtn=$('btnMailWatch');if(!mailBtn||mailBtn.disabled){runningSignature='';runningCycle=0;return;}
  lastState='';
  try{
    logSafe(`후속조치 패키지 실행: cycle ${cycle} ${reason} — ${snap.month}월 분석스냅샷 ${snap.items.length}건 / 관리대상 ${watch.length}건 exact-set 고정 후 Preview/회신 Excel 생성`);
    if(!withSnapshot(sig,cycle,()=>mailBtn.click()))throw new Error('분석스냅샷 고정 실패');
    let checks=0;
    const verify=()=>{
      if(currentCycle()!==cycle||signature()!==sig){runningSignature='';runningCycle=0;return;}
      checks++;const shown=$('hd24Preview'),meta=previewMeta(sig,cycle);
      if(shown&&shown.style.display!=='none'&&meta?.valid&&tagPreview(sig,cycle)){
        requestReply(sig,cycle);
        if(replyRequestedSignature!==sig&&replyDownloadedSignature!==sig){runningSignature='';runningCycle=0;}
        return;
      }
      if(checks<8)setTimeout(verify,100);else{runningSignature='';runningCycle=0;logSafe('후속조치 패키지 재시도 대기: Preview 월/사업장/관리대상 건수/cycle 검증 실패')}
    };
    setTimeout(verify,0);
  }catch(e){runningSignature='';runningCycle=0;logSafe('후속조치 패키지 오류: '+(e?.message||e));}
}
function hardReset(reason){
  const oldSig=replyPin?.sig,oldCycle=replyPin?.cycle;if(oldSig&&oldCycle)restoreReplyPin(oldSig,oldCycle);
  activeSignature=signature();activeCycle=currentCycle();completedSignature='';completedCycle=0;runningSignature='';runningCycle=0;actionExportSignature='';actionExportCycle=0;replyRequestedSignature='';replyRequestedCycle=0;replyDownloadedSignature='';replyDownloadedCycle=0;replyAttempts={};lastState='';replyFiles.clear();
  clearPreview();const cycle=activeCycle;[0,100,300,700,1500,3000,6000,10000,15000].forEach(ms=>setTimeout(()=>{if(currentCycle()===cycle)trySync(reason)},ms));
}
function safeComplete(){const sig=signature(),cycle=currentCycle();if(!sig||!cycle)return;if(activeSignature!==sig||activeCycle!==cycle)hardReset('safe reflect complete/new upload cycle');else trySync('safe reflect complete')}
function actionExportComplete(e){
  const sig=signature(),cycle=currentCycle(),d=e?.detail||{},eventSig=d.signature||'',eventCycle=Number(d.cycle)||0,month=Number(d.month)||0,items=Array.isArray(d.items)?d.items:[];
  if(!sig||!cycle||eventSig!==sig||eventCycle!==cycle)return;
  if(!(month>=1&&month<=12)||!items.length||items.some(x=>Number(x.month)!==month||!Number(x.masterRow))){logSafe('후속조치 패키지 차단: action-export 분석스냅샷 검증 실패');return;}
  window.hd24FollowupSnapshot={signature:sig,cycle,month,items:items.map(x=>({...x})),capturedAt:new Date().toISOString(),fileName:d.fileName||''};
  actionExportSignature=sig;actionExportCycle=cycle;logSafe(`후속조치 분석스냅샷 고정: cycle ${cycle} / ${month}월 ${items.length}건 / 관리대상 ${expectedWatchItems(sig,cycle).length}건 / ${d.fileName||'분석후속조치본'}`);trySync('action export complete');
}
function wire(){
  ['srcFile','masterFile','plantSelect'].forEach(id=>$(id)?.addEventListener('change',()=>hardReset(id+' change')));
  window.addEventListener('hd24-safe-reflect-complete',safeComplete);window.addEventListener('hd24-action-export-complete',actionExportComplete);
  const rc=$('resultCard');if(rc)new MutationObserver(()=>trySync('analysis result updated')).observe(rc,{attributes:true,childList:true,subtree:true});
  setInterval(()=>trySync('watchdog'),1000);hardReset('startup');
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',wire,{once:true});else wire();
})();