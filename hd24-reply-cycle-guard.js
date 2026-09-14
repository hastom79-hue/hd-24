(()=>{
'use strict';
// Fail-closed reply-workbook builder for sync-owned Preview downloads.
// It snapshots signature/cycle/plant/month/watch-items plus reply/mail-derived output state
// before ExcelJS async work begins and drops the file if any of that state changes before download.
const REPLY_KEY='hd24_kpi_reply_history_v2';
const MAIL_KEY='hd24_kpi_mail_history_v2';
const inflight=new Set();
const $=id=>document.getElementById(id);
const norm=v=>String(v??'').toLowerCase().replace(/\r?\n/g,' ').replace(/["'“”‘’]/g,'').replace(/[()\[\]{}%:/\\,_-]/g,' ').replace(/\s+/g,' ').trim();
function load(k){try{return JSON.parse(localStorage.getItem(k)||'[]')}catch(_){return []}}
function signature(){const p=$('plantSelect')?.value||'',a=$('srcFile')?.files?.[0],b=$('masterFile')?.files?.[0];if(!a||!b)return '';return [p,a.name,a.size,a.lastModified,b.name,b.size,b.lastModified].join('|')}
function cycle(){return Number(window.hd24ActionCycle)||0}
function plantKey(){return $('plantSelect')?.value||''}
function plantName(p=plantKey()){return p==='india'?'India':p==='brazil'?'Brazil':p==='ulsan'?'Ulsan':p}
function logSafe(m){try{if(typeof window.log==='function')window.log(m);else if($('log'))$('log').textContent+='\n'+m}catch(_){}}
function similarity(a,b){a=norm(a);b=norm(b);if(!a||!b)return 0;if(a===b||a.includes(b)||b.includes(a))return 1;const A=new Set(a.split(' ').filter(x=>x.length>1)),B=new Set(b.split(' ').filter(x=>x.length>1));let hit=0;A.forEach(x=>B.has(x)&&hit++);return hit/Math.max(1,Math.min(A.size,B.size))}
function recurrence(r,p){const k=norm(r.kpiEn||r.kpi),h=load(REPLY_KEY).filter(x=>x.plant===p&&norm(x.kpiEn||x.kpi)===k).sort((a,b)=>String(b.replyReceivedAt||'').localeCompare(String(a.replyReceivedAt||'')));if(h.length<2)return h.length?{latest:h[0],sameCauseCount:1,isRecurrence:false}:null;const latest=h[0],cause=latest.rootCause||latest.reason||'',same=h.filter(x=>similarity(cause,x.rootCause||x.reason||'')>=0.6).length;return {latest,sameCauseCount:same,isRecurrence:same>=2}}
function isWatch(r,p){const rec=recurrence(r,p);return !r.achieved||Number(r.streak)>=2||r.trend==='down'||!!rec?.isRecurrence}
function tags(r,p){const out=[];if(!r.achieved)out.push('Target Miss');if(Number(r.streak)>=3)out.push(`${Number(r.streak)}M Consecutive Miss`);else if(Number(r.streak)>=2)out.push('Temporary / Consecutive Miss');if(r.trend==='down')out.push('Worsening');const rec=recurrence(r,p);if(rec?.isRecurrence)out.push(`Repeated Issue x${rec.sameCauseCount}`);return out}
function lastMail(r,p,m){const k=norm(r.kpiEn||r.kpi);return load(MAIL_KEY).filter(x=>x.plant===p&&Number(x.targetMonth)===Number(m)&&norm(x.kpiEn||x.kpi)===k).sort((a,b)=>String(b.sentAt||b.mailOpenedAt||b.preparedAt||'').localeCompare(String(a.sentAt||a.mailOpenedAt||a.preparedAt||'')))[0]||{}}
function outputToken(items,p,m){
  return JSON.stringify(items.map(r=>{
    const rec=recurrence(r,p),last=rec?.latest||{},mh=lastMail(r,p,m);
    return [Number(r.masterRow),Number(r.month),r.kpi||'',r.kpiEn||'',r.target??null,r.actual??null,!!r.achieved,Number(r.streak)||0,r.trend||'',tags(r,p).join('|'),rec?.isRecurrence?rec.sameCauseCount:0,last.rootCause||last.reason||'',last.recoveryPlan||'',mh.preparedAt||'',mh.sentAt||mh.mailOpenedAt||'',last.replyReceivedAt||''];
  }).sort((a,b)=>a[0]-b[0]));
}
function context(){
  const sig=signature(),cy=cycle(),p=plantKey(),preview=$('hd24Preview'),snap=window.hd24FollowupSnapshot;
  if(!sig||!cy||!p||preview.style.display==='none'||preview.dataset.hd24Signature!==sig||Number(preview.dataset.hd24Cycle)!==cy)return null;
  if(!snap||snap.signature!==sig||Number(snap.cycle)!==cy||!(Number(snap.month)>=1&&Number(snap.month)<=12)||!Array.isArray(snap.items)||!snap.items.length)return null;
  if(snap.items.some(x=>Number(x.month)!==Number(snap.month)||!Number(x.masterRow)))return null;
  const items=snap.items.filter(r=>isWatch(r,p)).map(r=>({...r}));if(!items.length)return null;
  const rows=items.map(r=>Number(r.masterRow)).sort((a,b)=>a-b).join(',');if(preview.dataset.hd24Rows!==rows)return null;
  if(Number(preview.dataset.hd24Month)!==Number(snap.month)||Number(preview.dataset.hd24Count)!==items.length)return null;
  return {sig,cycle:cy,plant:p,plantName:plantName(p),month:Number(snap.month),items,rows,token:outputToken(items,p,Number(snap.month))};
}
function stillCurrent(c){
  const live=context();
  return !!(live&&live.sig===c.sig&&live.cycle===c.cycle&&live.plant===c.plant&&live.month===c.month&&live.rows===c.rows&&live.token===c.token);
}
async function buildAndDownload(c){
  if(typeof ExcelJS==='undefined')throw new Error('ExcelJS unavailable');
  const wb=new ExcelJS.Workbook(),ws=wb.addWorksheet('KPI Response');
  const cols=['Plant','Target Month','KPI (KR)','KPI (EN)','Target','Actual','Status / Trend','Repeated Issue','Previous Reason / Root Cause','Previous Countermeasure','Last Mail Prepared At','Last Mail Sent At','Last Reply Received At','Reason for Miss / Deterioration','Root Cause','Recovery / Catch-up Plan','Action Owner','Planned Completion Date','Next-month Recovery Target','Responder'];
  ws.columns=cols.map((h,i)=>({header:h,key:'c'+i,width:[12,12,34,38,12,12,24,18,32,32,22,22,22,34,34,36,20,22,24,20][i]}));
  const hr=ws.getRow(1);hr.font={bold:true,color:{argb:'FFFFFFFF'}};hr.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF2B4A63'}};hr.alignment={vertical:'middle',horizontal:'center',wrapText:true};
  for(const r of c.items){const rec=recurrence(r,c.plant),last=rec?.latest||{},mh=lastMail(r,c.plant,c.month),row=ws.addRow([c.plantName,c.month,r.kpi||'',r.kpiEn||'',r.target??'',r.actual??'',tags(r,c.plant).join(' / '),rec?.isRecurrence?`YES (same cause x${rec.sameCauseCount})`:'NO',last.rootCause||last.reason||'',last.recoveryPlan||'',mh.preparedAt||'',mh.sentAt||mh.mailOpenedAt||'',last.replyReceivedAt||'','','','','','','','']);[14,15,16,17,18,19,20].forEach(ci=>{row.getCell(ci).fill={type:'pattern',pattern:'solid',fgColor:{argb:'FFFFFF99'}};row.getCell(ci).alignment={wrapText:true,vertical:'top'}})}
  ws.views=[{state:'frozen',ySplit:1,xSplit:4}];ws.autoFilter={from:'A1',to:'T1'};
  const buf=await wb.xlsx.writeBuffer();
  if(!stillCurrent(c)){logSafe(`회신 Excel stale 생성 차단: cycle ${c.cycle} / 동일 cycle 내부 snapshot·KPI·회신이력 상태 변경 감지`);return false}
  const fname=`HDPS_KPI_Response_${c.plantName}_${c.month}M.xlsx`,file=new File([buf],fname,{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}),u=URL.createObjectURL(file),a=document.createElement('a');
  a.href=u;a.download=fname;a.click();setTimeout(()=>URL.revokeObjectURL(u),30000);return true;
}
function guardClick(e){
  const c=context();if(!c)return;
  e.preventDefault();e.stopImmediatePropagation();
  const key=`${c.cycle}::${c.sig}`;if(inflight.has(key)){logSafe(`회신 Excel 중복 생성 차단: cycle ${c.cycle}`);return}
  inflight.add(key);logSafe(`회신 Excel cycle-guard 생성 시작: cycle ${c.cycle} / ${c.plantName} ${c.month}M / ${c.items.length} KPI`);
  Promise.resolve().then(()=>buildAndDownload(c)).catch(err=>logSafe('회신 Excel cycle-guard 생성 실패: '+(err?.message||err))).finally(()=>inflight.delete(key));
}
function wire(){const b=$('hd24DownloadReply');if(b)b.addEventListener('click',guardClick,true)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',wire,{once:true});else wire();
})();