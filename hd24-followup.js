(()=>{
'use strict';

const REPLY_KEY='hd24_kpi_reply_history_v2';
const MAIL_KEY='hd24_kpi_mail_history_v2';
const CONFIG_KEY='hd24_mail_endpoint_v1';
let previewState=null;
let lastAutoPackageSignature='';
let legacyAutoSuppressedLogged=false;

const $=id=>document.getElementById(id);
const norm=v=>String(v??'').toLowerCase().replace(/\r?\n/g,' ').replace(/["'“”‘’]/g,'').replace(/[()\[\]{}%:/\\,_-]/g,' ').replace(/\s+/g,' ').trim();
const nowIso=()=>new Date().toISOString();
function load(key){try{return JSON.parse(localStorage.getItem(key)||'[]')}catch(_){return []}}
function save(key,v){localStorage.setItem(key,JSON.stringify(v))}
function pkey(){try{return currentPlant||$('plantSelect')?.value||''}catch(_){return $('plantSelect')?.value||''}}
function pname(){return pkey()==='india'?'India':pkey()==='brazil'?'Brazil':pkey()==='ulsan'?'Ulsan':pkey()}
function month(){try{return selectedMonth||0}catch(_){return 0}}
function current(){try{const months=(typeof selectedMailMonths!=='undefined'&&selectedMailMonths&&selectedMailMonths.size)?selectedMailMonths:new Set([month()]);return (allResults||[]).filter(r=>months.has(r.month))}catch(_){return []}}
function logSafe(msg){try{if(typeof log==='function')log(msg);else if($('log'))$('log').textContent+='\n'+msg}catch(_){}}
function similarity(a,b){a=norm(a);b=norm(b);if(!a||!b)return 0;if(a===b||a.includes(b)||b.includes(a))return 1;const A=new Set(a.split(' ').filter(x=>x.length>1)),B=new Set(b.split(' ').filter(x=>x.length>1));let hit=0;A.forEach(x=>B.has(x)&&hit++);return hit/Math.max(1,Math.min(A.size,B.size));}
function replyHistoryFor(r){const k=norm(r.kpiEn||r.kpi);return load(REPLY_KEY).filter(h=>h.plant===pkey()&&norm(h.kpiEn||h.kpi)===k).sort((a,b)=>String(b.replyReceivedAt||'').localeCompare(String(a.replyReceivedAt||'')));}
function recurrenceFor(r){const h=replyHistoryFor(r);if(h.length<2)return h.length?{history:h,latest:h[0],sameCauseCount:1,total:h.length,isRecurrence:false}:null;const latest=h[0],cause=latest.rootCause||latest.reason||'';const same=h.filter(x=>similarity(cause,x.rootCause||x.reason||'')>=0.6).length;return {history:h,latest,sameCauseCount:same,total:h.length,isRecurrence:same>=2};}
function isActionTarget(r){const rec=recurrenceFor(r);return !r.achieved||r.streak>=2||r.trend==='down'||!!rec?.isRecurrence;}
function selectItems(mode){const items=current();if(mode==='all')return items;if(mode==='month')return items.filter(r=>!r.achieved);return items.filter(isActionTarget);}
function tags(r, ko){const out=[];if(ko){if(!r.achieved)out.push('목표 미달');if(r.streak>=3)out.push(`${r.streak}개월 연속 미달성`);else if(r.streak>=2)out.push('일시적/연속 미달성');if(r.trend==='down')out.push('악화 추세');const rec=recurrenceFor(r);if(rec?.isRecurrence)out.push(`반복 이슈 x${rec.sameCauseCount}`);}else{if(!r.achieved)out.push('Target Miss');if(r.streak>=3)out.push(`${r.streak}M Consecutive Miss`);else if(r.streak>=2)out.push('Temporary / Consecutive Miss');if(r.trend==='down')out.push('Worsening');const rec=recurrenceFor(r);if(rec?.isRecurrence)out.push(`Repeated Issue x${rec.sameCauseCount}`);}return out;}
function isEn(){try{return currentLang==='en'}catch(_){return false}}
function pnameKo(){return pkey()==='india'?'인도':pkey()==='brazil'?'브라질':pkey()==='ulsan'?'울산':pname()}
function subject(items){
  const en=isEn();
  const monthsText = (typeof itemsMonthLabel==='function') ? itemsMonthLabel(items, en) : (en?`${month()}M`:`${month()}월`);
  return en
    ? `[HDPS KPI Action Required] ${pname()} - ${monthsText} (${items.length} item${items.length===1?'':'s'})`
    : `[HDPS KPI 조치필요] ${pnameKo()} - ${monthsText} (${items.length}건)`;
}
function body(items){
  const en=isEn();
  const monthsText = (typeof itemsMonthLabel==='function') ? itemsMonthLabel(items, en) : (en?`${month()}M`:`${month()}월`);
  const repeated=items.filter(r=>recurrenceFor(r)?.isRecurrence).length;
  const miss=items.filter(r=>!r.achieved).length;
  const lines=en?[
    `Dear Team,`,'',
    `Please review the ${pname()} HDPS KPI results for ${monthsText} in the attached Excel file, and reply with the reason, root cause, and recovery plan for each KPI marked as Target Miss / Consecutive Miss / Worsening.`,
    '',
    `Summary: ${items.length} KPI(s) require attention (${miss} not achieved, ${repeated} repeated issue${repeated===1?'':'s'}).`,
    '',
    `REQUIRED \u2014 please fill in and return the attached file with:`,
    `1. Reason for the miss / deterioration`,
    `2. Root cause`,
    `3. Recovery / catch-up plan (with target completion date)`,
    '',
    `The attached Excel already lists every KPI with its target, actual, and status \u2014 the Reason / Root Cause / Recovery Plan columns there are pre-created and highlighted for your input.`,
    '',
    `Thank you for your cooperation.`,
  ]:[
    `안녕하세요,`,'',
    `${pnameKo()} 사업장 ${monthsText} HDPS KPI 결과를 첨부 엑셀 파일로 안내드립니다. 목표 미달성/연속 미달성/악화로 표시된 지표별로 사유·근본원인·만회대책을 회신 부탁드립니다.`,
    '',
    `요약: 조치 필요 KPI ${items.length}건 (미달성 ${miss}건, 반복 재발 ${repeated}건)`,
    '',
    `필수 회신 \u2014 첨부 파일에 아래 내용을 작성하여 회신 부탁드립니다:`,
    `1. 미달성/악화 사유`,
    `2. 근본 원인`,
    `3. 만회대책 (완료 목표일 포함)`,
    '',
    `첨부된 엑셀 파일에는 KPI별 목표/실적/판정이 이미 정리되어 있고, 사유·근본원인·만회대책을 입력하실 칸도 미리 만들어져 있습니다(노란색 표시).`,
    '',
    `협조 부탁드립니다. 감사합니다.`,
  ];
  return lines.join('\n');
}
function lastMailFor(r,targetMonth=month()){return load(MAIL_KEY).filter(x=>x.plant===pkey()&&x.targetMonth===targetMonth&&norm(x.kpiEn||x.kpi)===norm(r.kpiEn||r.kpi)).sort((a,b)=>String(b.sentAt||b.mailOpenedAt||b.preparedAt||'').localeCompare(String(a.sentAt||a.mailOpenedAt||a.preparedAt||'')))[0]||{};}
async function buildReplyFile(items){if(typeof ExcelJS==='undefined')throw new Error('ExcelJS unavailable');
  const isKo = typeof currentLang!=='undefined' && currentLang==='ko';
  const wb=new ExcelJS.Workbook();const ws=wb.addWorksheet('KPI Response');
  // 언어 설정에 맞춰 KPI명 칸을 하나만 두고(한글 or 영문), 나머지 헤더도 그 언어로 통일한다
  const cols = isKo
    ? ['사업장','대상월','KPI','단위','목표','실적','상태/추세','반복이슈','이전 사유/근본원인','이전 만회대책','메일 준비시각','메일 발송시각','회신 수신시각','미달성 사유','근본원인','만회대책','담당자','완료예정일','익월 회복목표','응답자']
    : ['Plant','Target Month','KPI','Unit','Target','Actual','Status / Trend','Repeated Issue','Previous Reason / Root Cause','Previous Countermeasure','Last Mail Prepared At','Last Mail Sent At','Last Reply Received At','Reason for Miss / Deterioration','Root Cause','Recovery / Catch-up Plan','Action Owner','Planned Completion Date','Next-month Recovery Target','Responder'];
  ws.columns=cols.map((h,i)=>({header:h,key:'c'+i,width:[12,12,36,10,12,12,24,18,32,32,22,22,22,34,34,36,20,22,24,20][i]}));const hr=ws.getRow(1);hr.font={bold:true,color:{argb:'FFFFFFFF'}};hr.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF2B4A63'}};hr.alignment={vertical:'middle',horizontal:'center',wrapText:true};hr.height=32;
  const MISS_FILL='FFFBEBE7';
  const plantLabelForFile = isKo ? pnameKo() : pname();
  items.forEach((r,idx)=>{const rec=recurrenceFor(r),last=rec?.latest||{},mh=lastMailFor(r);const isPct=r.unit==='%';const kpiName = isKo ? (r.kpi||r.kpiEn||'') : (r.kpiEn||r.kpi||'');const row=ws.addRow([plantLabelForFile,r.month,kpiName,r.unit||'',isPct?(typeof r.target==='number'?r.target:null):(r.target??''),isPct?(typeof r.actual==='number'?r.actual:null):(r.actual??''),tags(r,isKo).join(' / '),rec?.isRecurrence?(isKo?`예 (동일사유 x${rec.sameCauseCount})`:`YES (same cause x${rec.sameCauseCount})`):(isKo?'아니오':'NO'),last.rootCause||last.reason||'',last.recoveryPlan||'',mh.preparedAt||'',mh.sentAt||mh.mailOpenedAt||'',last.replyReceivedAt||'','','','','','','','']);
    if(isPct){row.getCell(5).numFmt='0.0%';row.getCell(6).numFmt='0.0%'}else{row.getCell(5).numFmt='0.00';row.getCell(6).numFmt='0.00'}
    for(let ci=1;ci<=20;ci++)row.getCell(ci).fill={type:'pattern',pattern:'solid',fgColor:{argb:MISS_FILL}};
    // 웹 화면의 "7개월 연속 미달성"/"최근 악화" 배지처럼, 심각한 상태는 셀 자체를 굵은 진한
    // 빨강 배경+흰 글씨로 강조해서 표에서 바로 눈에 띄게 한다 (그냥 평범한 텍스트면 놓치기 쉬움)
    const statusCell = row.getCell(7);
    if (r.streak>=3 || r.trend==='down'){
      statusCell.fill = {type:'pattern', pattern:'solid', fgColor:{argb:'FFB0362B'}};
      statusCell.font = {bold:true, color:{argb:'FFFFFFFF'}};
    }
    [14,15,16,17,18,19,20].forEach(ci=>{row.getCell(ci).fill={type:'pattern',pattern:'solid',fgColor:{argb:'FFFFFF99'}};row.getCell(ci).alignment={wrapText:true,vertical:'top'}});
  });
  const lastRow = items.length + 1;
  if (lastRow > 1) {
    // Target/Actual 칸에 엑셀 자체 막대그래프(Data Bar) 서식을 넣어서, 파일을 열자마자
    // 웹 화면의 목표 대비 실적 막대와 같은 느낌을 바로 볼 수 있게 한다 (mailto는
    // 스크린샷/첨부를 지원하지 않아서, 엑셀 자체를 시각적으로 만드는 쪽으로 대신함).
    ws.addConditionalFormatting({ ref: `E2:E${lastRow}`, rules: [{ type:'dataBar', color:{argb:'FFB9C6D6'}, cfvo:[{type:'min'},{type:'max'}], gradient:true }] });
    ws.addConditionalFormatting({ ref: `F2:F${lastRow}`, rules: [{ type:'dataBar', color:{argb:'FFCE5A4F'}, cfvo:[{type:'min'},{type:'max'}], gradient:true }] });
  }
  ws.views=[{state:'frozen',ySplit:1,xSplit:4}];ws.autoFilter={from:'A1',to:'T1'};const buf=await wb.xlsx.writeBuffer();const monthsInFile=[...new Set(items.map(r=>r.month))].sort((a,b)=>a-b).join('-');const fname=`HDPS_KPI_Response_${pname()}_${monthsInFile||month()}M.xlsx`;return {buf,fname,file:new File([buf],fname,{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'})};}
function downloadFile(file){const u=URL.createObjectURL(file),a=document.createElement('a');a.href=u;a.download=file.name;a.click();setTimeout(()=>URL.revokeObjectURL(u),30000)}
function ensureUi(){if($('hd24FollowupPanel'))return;const host=$('resultCard')||document.querySelector('main');if(!host)return;const sec=document.createElement('section');sec.id='hd24FollowupPanel';sec.className='panel';sec.style.marginTop='16px';sec.innerHTML=`<h2 style="display:flex;align-items:center;justify-content:space-between;gap:12px"><span>메일 미리보기 · 회신 이력관리</span><span class="lang-toggle" style="font-size:13px"><button id="hd24LangKo" type="button" class="filt-lang active">한글</button><button id="hd24LangEn" type="button" class="filt-lang">English</button></span></h2><div class="field-row"><label>메일 상태</label><div id="hd24MailStatus">분석 후 관리대상 메일 Preview가 자동 준비됩니다.</div></div><div id="hd24Preview" style="display:none;border:1px solid #dde1e6;border-radius:6px;padding:16px;margin:12px 0;background:#fff"><div><b>To</b> <span id="hd24PreviewTo"></span></div><div style="margin-top:6px"><b>Subject</b> <span id="hd24PreviewSubject"></span></div><pre id="hd24PreviewBody" style="white-space:pre-wrap;background:#f7f8fa;padding:12px;border-radius:4px;max-height:320px;overflow:auto"></pre><div class="actions"><button id="hd24DownloadReply" class="ghost">회신용 Excel 다운로드</button><button id="hd24SendMail">발송</button></div><p class="hint">Preview 확인 전에는 발송되지 않습니다. 발송 버튼은 설정된 메일 API가 있으면 실제 발송하고 성공 응답 시 발송시점을 기록합니다. API가 없으면 기본 메일 앱을 열며 이 경우 실제 발송 완료시점은 확인할 수 없어 ‘메일앱 열림’으로 구분 기록합니다.</p></div><hr style="border:none;border-top:1px solid #dde1e6;margin:18px 0"><div class="field-row"><label>회신 파일</label><input type="file" id="hd24ReplyFile" accept=".xlsx,.xlsm"></div><div class="actions"><button id="hd24ImportReply" class="ghost">회신파일 이력 반영</button></div><p class="hint">인도/브라질 영문 회신파일을 업로드하면 사업장 + KPI + 대상월 + 회신차수로 사유/근본원인/만회계획/Owner/완료예정일/차월목표/회신자/회신시점을 누적 저장합니다. 기존 이력은 덮어쓰지 않습니다.</p><div id="hd24HistorySummary" style="margin-top:12px"></div>`;host.appendChild(sec);wireUi();}
function renderPreview(items,mode,preparedAt){const to=$('mailTo')?.value.trim()||'';previewState={items,mode,to,subject:subject(items),body:body(items),preparedAt:preparedAt||nowIso()};$('hd24Preview').style.display='block';$('hd24PreviewTo').textContent=to||'(recipient not entered)';$('hd24PreviewSubject').textContent=previewState.subject;$('hd24PreviewBody').textContent=previewState.body;$('hd24MailStatus').textContent=`Preview ready · ${items.length} KPI(s) · prepared ${new Date(previewState.preparedAt).toLocaleString()}`;logSafe(`메일 미리보기 준비: ${items.length}건`);}
function interceptMailButton(id,mode){const el=$(id);if(!el)return;el.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();const items=selectItems(mode);if(!items.length){alert('메일 대상 KPI가 없습니다.');return}const preparedAt=nowIso();renderPreview(items,mode,preparedAt);mailHistoryRecord(items,{status:'prepared',preparedAt})},true)}
function mailHistoryRecord(items,extra){const list=load(MAIL_KEY);for(const r of items)list.unshift({plant:pkey(),plantName:pname(),targetMonth:month(),kpi:r.kpi||'',kpiEn:r.kpiEn||'',preparedAt:extra.preparedAt||previewState?.preparedAt||nowIso(),...extra});save(MAIL_KEY,list.slice(0,3000));}
async function sendPreview(){if(!previewState)return;const to=$('mailTo')?.value.trim()||previewState.to;if(!to){alert('담당자 이메일을 입력해주세요.');return}const {file,fname}=await buildReplyFile(previewState.items);const endpoint=(window.HD24_MAIL_ENDPOINT||localStorage.getItem(CONFIG_KEY)||'').trim();if(endpoint){$('hd24MailStatus').textContent='발송 중...';try{const payload={to,subject:previewState.subject,body:previewState.body,plant:pkey(),targetMonth:month(),attachmentName:fname,attachmentBase64:await fileToBase64(file)};const res=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});if(!res.ok)throw new Error(`HTTP ${res.status}`);const sentAt=nowIso();mailHistoryRecord(previewState.items,{status:'sent',sentAt});$('hd24MailStatus').textContent=`발송 완료 · ${new Date(sentAt).toLocaleString()}`;logSafe(`메일 발송 완료: ${to}`);return}catch(e){$('hd24MailStatus').textContent='메일 API 발송 실패: '+e.message;logSafe('메일 API 발송 실패: '+e.message);return}}
 downloadFile(file);const openedAt=nowIso();mailHistoryRecord(previewState.items,{status:'mail-client-opened',mailOpenedAt:openedAt});window.location.href=`mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(previewState.subject)}&body=${encodeURIComponent(`[Attachment: ${fname} has been downloaded. Please attach it before sending.]\n\n${previewState.body}`)}`;$('hd24MailStatus').textContent=`메일 앱 열림 · ${new Date(openedAt).toLocaleString()} · 실제 발송완료 여부는 미확인`;}
function fileToBase64(file){return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result).split(',')[1]||'');r.onerror=()=>reject(r.error);r.readAsDataURL(file)})}
function cellText(v){if(v==null)return '';if(typeof v==='object'){if(v.text!=null)return String(v.text);if(v.result!=null)return String(v.result);if(Array.isArray(v.richText))return v.richText.map(x=>x.text||'').join('')}return String(v)}
async function importReply(){const f=$('hd24ReplyFile')?.files?.[0];if(!f){alert('회신 파일을 선택해주세요.');return}if(typeof ExcelJS==='undefined')throw new Error('ExcelJS unavailable');const wb=new ExcelJS.Workbook();await wb.xlsx.load(await f.arrayBuffer());const ws=wb.worksheets[0];if(!ws)throw new Error('회신 시트 없음');const headers={};ws.getRow(1).eachCell((c,i)=>headers[norm(cellText(c.value))]=i);const find=(...names)=>{for(const n of names){const i=headers[norm(n)];if(i)return i}return 0};const cPlant=find('Plant','사업장'),cMonth=find('Target Month','대상월'),cKpi=find('KPI','KPI (KR)','KPI (EN)'),cReason=find('Reason for Miss / Deterioration','Reason for Not Achieving','미달성 사유'),cRoot=find('Root Cause','근본원인'),cPlan=find('Recovery / Catch-up Plan','Countermeasure / Due Date','만회대책'),cOwner=find('Action Owner','담당자'),cDue=find('Planned Completion Date','완료예정일'),cNext=find('Next-month Recovery Target','익월 회복목표'),cResp=find('Responder','응답자');if(!cKpi)throw new Error('KPI column not found');if(!cReason&&!cRoot&&!cPlan)throw new Error('Response columns not found');const list=load(REPLY_KEY),receivedAt=nowIso();let added=0;ws.eachRow((row,rn)=>{if(rn===1)return;const val=i=>i?cellText(row.getCell(i).value).trim():'';const kpiName=val(cKpi),reason=val(cReason),rootCause=val(cRoot),recoveryPlan=val(cPlan);if(!kpiName||!(reason||rootCause||recoveryPlan))return;const rawPlant=val(cPlant).toLowerCase(),plant=rawPlant.includes('brazil')||rawPlant.includes('브라질')?'brazil':rawPlant.includes('india')||rawPlant.includes('인도')?'india':pkey(),targetMonth=Number(val(cMonth))||month(),key=norm(kpiName);const prev=list.filter(x=>x.plant===plant&&x.targetMonth===targetMonth&&norm(x.kpiEn||x.kpi)===key);const mail=load(MAIL_KEY).filter(x=>x.plant===plant&&x.targetMonth===targetMonth&&norm(x.kpiEn||x.kpi)===key).sort((a,b)=>String(b.sentAt||b.mailOpenedAt||b.preparedAt||'').localeCompare(String(a.sentAt||a.mailOpenedAt||a.preparedAt||'')))[0]||{};list.unshift({plant,targetMonth,kpi:kpiName,kpiEn:kpiName,reason,rootCause,recoveryPlan,actionOwner:val(cOwner),plannedCompletionDate:val(cDue),nextMonthRecoveryTarget:val(cNext),responder:val(cResp),replyReceivedAt:receivedAt,replyFileName:f.name,replySequence:prev.length+1,lastMailPreparedAt:mail.preparedAt||'',lastMailSentAt:mail.sentAt||'',lastMailOpenedAt:mail.mailOpenedAt||'',lastMailStatus:mail.status||''});added++});save(REPLY_KEY,list.slice(0,4000));if(typeof invalidateReplyHistoryCache==='function')invalidateReplyHistoryCache();$('hd24HistorySummary').textContent=`회신 이력 반영 완료: ${added} KPI · 회신 수신시점 ${new Date(receivedAt).toLocaleString()} · ${f.name}`;logSafe(`회신 파일 이력 반영: ${added}건 / ${f.name}`);}
function uploadSignature(){const a=$('srcFile')?.files?.[0],b=$('masterFile')?.files?.[0];if(!b)return '';if(!a)return [pkey(),'(no-src)',b.name,b.size,b.lastModified].join('|');return [pkey(),a.name,a.size,a.lastModified,b.name,b.size,b.lastModified].join('|')}
async function tryAutoPackage(reason){if(window.hd24FollowupSyncOwnsAutoPackage){if(!legacyAutoSuppressedLogged){legacyAutoSuppressedLogged=true;logSafe('레거시 자동패키지 비활성화: follow-up sync가 단일 오케스트레이터로 실행');}return}const sig=uploadSignature(),judge=$('btnJudge');if(!sig||sig===lastAutoPackageSignature||!judge||judge.disabled)return;lastAutoPackageSignature=sig;try{logSafe(`자동분석 시작: ${reason}`);judge.click();await new Promise(r=>setTimeout(r,80));const items=selectItems('watch');if(!items.length){$('hd24MailStatus').textContent='자동분석 완료 · 메일 관리대상 KPI 없음';logSafe('자동분석 완료: 관리대상 KPI 없음');return}const preparedAt=nowIso();renderPreview(items,'watch',preparedAt);mailHistoryRecord(items,{status:'prepared',preparedAt,autoPrepared:true});const pack=await buildReplyFile(items);downloadFile(pack.file);$('hd24MailStatus').textContent=`자동분석/파일추출/메일 Preview 준비 완료 · ${items.length} KPI`;logSafe(`자동 분석파일 추출: ${pack.fname} / 메일 Preview ${items.length}건`)}catch(e){lastAutoPackageSignature='';logSafe('자동분석 패키지 오류: '+(e?.message||e))}}
function scheduleAutoPackage(reason){[0,100,300,700,1500,3000,6000,10000].forEach(ms=>setTimeout(()=>tryAutoPackage(reason),ms))}
// 메일 발송 대상 월 체크박스가 바뀌었을 때(자동패키지의 파일서명 기준 중복방지 가드에
// 걸리지 않고) 미리보기를 즉시 다시 계산하기 위해 index.html에서 호출하는 훅.
window.hd24RefreshMailPreview = function(){
  const mode = previewState ? previewState.mode : 'watch';
  const items = selectItems(mode);
  if (items.length) renderPreview(items, mode, nowIso());
  else { $('hd24Preview').style.display='none'; $('hd24MailStatus').textContent='선택한 달에 해당하는 관리대상 KPI가 없습니다.'; }
};
function wireUi(){interceptMailButton('btnMailMonth','month');interceptMailButton('btnMailWatch','watch');interceptMailButton('btnMailAll','all');$('hd24DownloadReply')?.addEventListener('click',async()=>{if(!previewState)return;downloadFile((await buildReplyFile(previewState.items)).file)});$('hd24SendMail')?.addEventListener('click',sendPreview);$('hd24ImportReply')?.addEventListener('click',()=>importReply().catch(e=>{alert(e.message);logSafe('회신 파일 반영 오류: '+e.message)}));
  function switchLang(lang){try{if(typeof setLang==='function')setLang(lang);else currentLang=lang}catch(_){currentLang=lang}$('hd24LangKo')?.classList.toggle('active',lang==='ko');$('hd24LangEn')?.classList.toggle('active',lang==='en');if(previewState)renderPreview(previewState.items,previewState.mode,previewState.preparedAt)}
  $('hd24LangKo')?.addEventListener('click',()=>switchLang('ko'));
  $('hd24LangEn')?.addEventListener('click',()=>switchLang('en'));
  try{$('hd24LangKo')?.classList.toggle('active',(typeof currentLang==='undefined'?'ko':currentLang)==='ko');$('hd24LangEn')?.classList.toggle('active',currentLang==='en')}catch(_){}
  $('hd24ReplyFile')?.addEventListener('change',()=>{if($('hd24ReplyFile')?.files?.[0])importReply().catch(e=>{logSafe('회신 파일 자동 반영 오류: '+e.message)})});['srcFile','masterFile','plantSelect'].forEach(id=>$(id)?.addEventListener('change',()=>{lastAutoPackageSignature='';scheduleAutoPackage(id+' change')}));const judge=$('btnJudge');if(judge)new MutationObserver(()=>scheduleAutoPackage('analysis ready')).observe(judge,{attributes:true,attributeFilter:['disabled']});scheduleAutoPackage('startup')}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ensureUi,{once:true});else ensureUi();
})();