(()=>{
'use strict';

const REPLY_KEY='hd24_kpi_reply_history_v2';
const MAIL_KEY='hd24_kpi_mail_history_v2';
const CONFIG_KEY='hd24_mail_endpoint_v1';
const MISS_FILL='FFFBE9E7', STATUS_FILL='FFE2E8F0';
function plantLabelForFile(){return isEn()?pname():pnameKo();}
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
function tags(r, ko){const out=[];if(ko){if(!r.achieved)out.push('목표 미달');if(r.streak>=3)out.push(`${r.streak}개월 연속 미달성`);else if(r.streak>=2)out.push('일시적/연속 미달성');if(r.trend==='down')out.push('악화 추세');const rec=recurrenceFor(r);if(rec?.isRecurrence)out.push(`반복 이슈 x${rec.sameCauseCount}`);}else{if(!r.achieved)out.push('Current Month: Target Miss');if(r.streak>=3)out.push(`Cumulative: ${r.streak} Consecutive Months Missed`);else if(r.streak>=2)out.push('Cumulative: 2 Consecutive Months Missed');if(r.trend==='down')out.push('Current Month: Worsening');const rec=recurrenceFor(r);if(rec?.isRecurrence)out.push(`Repeated Issue x${rec.sameCauseCount}`);}return out;}
function statusRich(r){const xs=tags(r,false),richText=[];xs.forEach((v,i)=>{if(i)richText.push({text:' / ',font:{color:{argb:'FF64748B'}}});let color='FF334155';if(v.includes('Current Month: Target Miss'))color='FFB42318';else if(v.includes('Consecutive Months Missed'))color='FFB54708';else if(v.includes('Current Month: Worsening'))color='FF7A3E9D';else if(v.startsWith('Repeated Issue'))color='FF0F6B78';richText.push({text:v,font:{bold:true,color:{argb:color}}})});return {richText}}
function isEn(){try{return currentLang==='en'}catch(_){return false}}
function pnameKo(){return pkey()==='india'?'인도':pkey()==='brazil'?'브라질':pkey()==='ulsan'?'울산':pname()}
function missSummary(items){const months=[...new Set(items.map(r=>Number(r.month)))].sort((a,b)=>a-b),by=new Map();for(const r of items){if(r.achieved)continue;const k=norm(r.kpiEn||r.kpi);if(!k)continue;if(!by.has(k))by.set(k,new Set());by.get(k).add(Number(r.month))}const unique=by.size,common=[...by.values()].filter(ms=>months.length>1&&months.every(m=>ms.has(m))).length,individual=unique-common;return {months,unique,common,individual}}
function subject(items){
  const en=isEn();
  const monthsText = (typeof itemsMonthLabel==='function') ? itemsMonthLabel(items, en) : (en?`${month()}M`:`${month()}월`);
  const ms=missSummary(items);
  return en
    ? `[HDPS KPI Action Required] ${pname()} - ${monthsText} (${ms.unique} unique missed KPI${ms.unique===1?'':'s'})`
    : `[HDPS KPI 조치필요] ${pnameKo()} - ${monthsText} (중복제거 미달성 KPI ${ms.unique}개)`;
}
function body(items){
  const en=isEn();
  const monthsText = (typeof itemsMonthLabel==='function') ? itemsMonthLabel(items, en) : (en?`${month()}M`:`${month()}월`);
  const repeated=items.filter(r=>recurrenceFor(r)?.isRecurrence).length;
  const ms=missSummary(items),miss=ms.unique;
  const lines=en?[
    `Dear Team,`,'',
    `Please review the ${pname()} HDPS KPI results for ${monthsText} in the attached Excel file, and reply with the reason, root cause, and recovery plan for each KPI marked as Target Miss / Consecutive Miss / Worsening.`,
    '',
    ms.months.length>1?`Summary: ${miss} unique KPI(s) not achieved across the selected months (common KPIs: ${ms.common}, month-specific KPIs: ${ms.individual}).`:`Summary: ${miss} KPI(s) not achieved (${repeated} repeated issue${repeated===1?'':'s'}).`,
    '',
    `REQUIRED \u2014 please fill in and return the attached file with:`,
    `1. Reason for the miss / deterioration`,
    `2. Root cause`,
    `3. Recovery / catch-up plan (with target completion date)`,
    '',
    `The attached Excel already lists every KPI with its target, actual, and status \u2014 the Reason / Root Cause / Recovery Plan columns there are pre-created and highlighted for your input.`,
    '',
    `NOTE — Lean KPI daily management monitoring is not limited to tracking actual results or whether targets were missed. Proper management requires an integrated cycle: root-cause analysis, establishment of recovery actions, actual elimination of the root cause, and continued monitoring of the KPI trend to verify that performance has changed and recovered.`,
    '',
    `Thank you for your cooperation.`,
  ]:[
    `안녕하세요,`,'',
    `${pnameKo()} 사업장 ${monthsText} HDPS KPI 결과를 첨부 엑셀 파일로 안내드립니다. 목표 미달성/연속 미달성/악화로 표시된 지표별로 사유·근본원인·만회대책을 회신 부탁드립니다.`,
    '',
    ms.months.length>1?`요약: 선택월 전체에서 중복을 제거한 미달성 KPI ${miss}개 (모든 선택월 공통 미달성: ${ms.common}개, 특정 월 미달성: ${ms.individual}개)`:`요약: 미달성 KPI ${miss}건 (반복 재발 ${repeated}건)`,
    '',
    `필수 회신 \u2014 첨부 파일에 아래 내용을 작성하여 회신 부탁드립니다:`,
    `1. 미달성/악화 사유`,
    `2. 근본 원인`,
    `3. 만회대책 (완료 목표일 포함)`,
    '',
    `첨부된 엑셀 파일에는 KPI별 목표/실적/판정이 이미 정리되어 있고, 사유·근본원인·만회대책을 입력하실 칸도 미리 만들어져 있습니다(노란색 표시).`,
    '',
    `특기사항 — Lean 성과지표 일상관리 모니터링은 단순히 지표의 실적 및 미달성 여부만 관리하는 것을 의미하지 않습니다. 근본원인 분석 → 만회대책 수립 → 실제 근본원인 제거 → 이후 KPI 트렌드 변화 및 회복 여부 확인까지 하나의 사이클로 통합 관리되어야 제대로 된 일상관리가 이루어진다고 판단합니다.`,
    '',
    `협조 부탁드립니다. 감사합니다.`,
  ];
  return lines.join('\n');
}
function mailEventTime(x){return x?.sentAt||x?.mailOpenedAt||x?.preparedAt||''}
function lastMailFor(r,targetMonth=month()){const xs=load(MAIL_KEY).filter(x=>x.plant===pkey()&&x.targetMonth===targetMonth&&norm(x.kpiEn||x.kpi)===norm(r.kpiEn||r.kpi));const sent=xs.filter(x=>x.status==='sent'||!!x.sentAt).sort((a,b)=>String(mailEventTime(b)).localeCompare(String(mailEventTime(a))))[0];if(sent)return sent;return xs.sort((a,b)=>String(mailEventTime(b)).localeCompare(String(mailEventTime(a))))[0]||{};}
async function buildReplyFile(items){if(typeof ExcelJS==='undefined')throw new Error('ExcelJS unavailable');const buildPlant=pkey(),buildMonth=month(),buildState=JSON.stringify(items.map(r=>[Number(r.month),norm(r.kpiEn||r.kpi),r.target??null,r.actual??null,replyHistoryFor(r).map(x=>[x.replyReceivedAt||'',x.rootCause||x.reason||'',x.recoveryPlan||''])]));
  const isKo = typeof currentLang!=='undefined' && currentLang==='ko';
  const wb=new ExcelJS.Workbook();const seen=new Set(),uniqueItems=items.filter(r=>{const k=[pkey(),Number(r.month),norm(r.kpiEn||r.kpi)].join('|');if(seen.has(k)){logSafe(`회신 Excel KPI×월 중복 차단: ${k}`);return false}seen.add(k);return true});const months=[...new Set(uniqueItems.map(r=>Number(r.month)))].sort((a,b)=>a-b);const hasReplyHistory=items.some(r=>replyHistoryFor(r).length>0);const hasPrevious=items.some(r=>{const x=recurrenceFor(r)?.latest||{};return !!String(x.rootCause||x.reason||x.recoveryPlan||'').trim()});
  // 언어 설정에 맞춰 KPI명 칸을 하나만 두고(한글 or 영문), 나머지 헤더도 그 언어로 통일한다
  const cols = isKo
    ? ['사업장','대상월','KPI','단위','목표','실적','상태/추세','반복이슈',...(hasPrevious?['이전 사유/근본원인','이전 만회대책']:[]),'미달성 사유','근본원인','만회대책','담당자','완료예정일']
    : ['Plant','Target Month','KPI','Unit','Target','Actual','Status / Trend',...(hasReplyHistory?['반복이슈']:[]),...(hasPrevious?['Previous Reason / Root Cause','Previous Countermeasure']:[]),'Reason for Miss / Deterioration','Root Cause','Recovery / Catch-up Plan','Action Owner','Planned Completion Date'];
  for(const m of months){const ws=wb.addWorksheet(String(m).padStart(2,'0')+' Month');const monthItems=uniqueItems.filter(r=>Number(r.month)===m);
  ws.columns=cols.map((h,i)=>({header:h,key:'c'+i,width:[12,12,36,10,12,12,24,18,32,32,22,22,22,34,34,36,20,22,24,20][i]}));const hr=ws.getRow(1);hr.font={bold:true,color:{argb:'FFFFFFFF'}};hr.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF2B4A63'}};hr.alignment={vertical:'middle',horizontal:'center',wrapText:true};hr.height=32;
  monthItems.forEach((r,idx)=>{const rec=recurrenceFor(r),last=rec?.latest||{},mh=lastMailFor(r,Number(r.month)||month());const isPct=r.unit==='%';const kpiName = isKo ? (r.kpi||r.kpiEn||'') : (r.kpiEn||r.kpi||'');const row=ws.addRow([plantLabelForFile(),r.month,kpiName,r.unit||'',isPct?(typeof r.target==='number'?r.target:null):(r.target??''),isPct?(typeof r.actual==='number'?r.actual:null):(r.actual??''),tags(r,isKo).join(' / '),...(hasReplyHistory?[rec?.isRecurrence?(isKo?`예 (동일사유 x${rec.sameCauseCount})`:`YES (same cause x${rec.sameCauseCount})`):(isKo?'아니오':'NO')]:[]),...(hasPrevious?[last.rootCause||last.reason||'',last.recoveryPlan||'']:[]), '', '', '', '', '']);
    if(isPct){row.getCell(5).numFmt='0.0%';row.getCell(6).numFmt='0.0%'}else{row.getCell(5).numFmt='0.00';row.getCell(6).numFmt='0.00'}
    for(let ci=1;ci<=cols.length;ci++)row.getCell(ci).fill={type:'pattern',pattern:'solid',fgColor:{argb:MISS_FILL}};
    // 웹 화면의 "7개월 연속 미달성"/"최근 악화" 배지처럼, 심각한 상태는 셀 자체를 굵은 진한
    // 빨강 배경+흰 글씨로 강조해서 표에서 바로 눈에 띄게 한다 (그냥 평범한 텍스트면 놓치기 쉬움)
    const statusCell = row.getCell(7);
    statusCell.value = statusRich(r);
    statusCell.fill = {type:'pattern', pattern:'solid', fgColor:{argb:STATUS_FILL}};
    if (r.streak>=3 || r.trend==='down'){
      statusCell.fill = {type:'pattern', pattern:'solid', fgColor:{argb:'FFB0362B'}};
      statusCell.font = {bold:true, color:{argb:'FFFFFFFF'}};
    }
    Array.from({length:5},(_,i)=>8+(hasReplyHistory?1:0)+(hasPrevious?2:0)+i).forEach(ci=>{row.getCell(ci).fill={type:'pattern',pattern:'solid',fgColor:{argb:'FFFFFF99'}};row.getCell(ci).alignment={wrapText:true,vertical:'top'}});
  });
  const lastRow = monthItems.length + 1;
  if (lastRow > 1) {
    // Target/Actual 칸에 엑셀 자체 막대그래프(Data Bar) 서식을 넣어서, 파일을 열자마자
    // 웹 화면의 목표 대비 실적 막대와 같은 느낌을 바로 볼 수 있게 한다 (mailto는
    // 스크린샷/첨부를 지원하지 않아서, 엑셀 자체를 시각적으로 만드는 쪽으로 대신함).
    ws.addConditionalFormatting({ ref: `E2:E${lastRow}`, rules: [{ type:'dataBar', color:{argb:'FFB9C6D6'}, cfvo:[{type:'min'},{type:'max'}], gradient:true }] });
    ws.addConditionalFormatting({ ref: `F2:F${lastRow}`, rules: [{ type:'dataBar', color:{argb:'FFCE5A4F'}, cfvo:[{type:'min'},{type:'max'}], gradient:true }] });
  }
  ws.views=[{state:'frozen',ySplit:1,xSplit:4}];ws.autoFilter={from:'A1',to:{row:1,column:cols.length}};}
  const buf=await wb.xlsx.writeBuffer();const currentState=JSON.stringify(items.map(r=>[Number(r.month),norm(r.kpiEn||r.kpi),r.target??null,r.actual??null,replyHistoryFor(r).map(x=>[x.replyReceivedAt||'',x.rootCause||x.reason||'',x.recoveryPlan||''])]));if(pkey()!==buildPlant||month()!==buildMonth||currentState!==buildState){logSafe('회신 Excel stale 생성 차단: 사업장/분석월/KPI/회신이력 변경 감지');throw new Error('회신 Excel 생성 중 분석 상태가 변경되었습니다. 다시 생성해주세요.')}const monthsInFile=months.join('-');const fname=`HDPS_KPI_Response_${pname()}_${monthsInFile||month()}M.xlsx`;return {buf,fname,file:new File([buf],fname,{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'})};}
function downloadFile(file){if(!file||!file.size)throw new Error('다운로드 파일이 비어 있습니다.');const u=URL.createObjectURL(file),a=document.createElement('a');a.href=u;a.download=file.name;a.style.display='none';document.body.appendChild(a);try{a.click()}finally{a.remove();setTimeout(()=>URL.revokeObjectURL(u),30000)}return {name:file.name,size:file.size}}
function ensureUi(){if($('hd24FollowupPanel'))return;const host=$('resultCard')||document.querySelector('main');if(!host)return;const sec=document.createElement('section');sec.id='hd24FollowupPanel';sec.className='panel';sec.style.marginTop='16px';sec.innerHTML=`<h2 style="display:flex;align-items:center;justify-content:space-between;gap:12px"><span>메일 미리보기 · 회신 이력관리</span><span class="lang-toggle" style="font-size:13px"><button id="hd24LangKo" type="button" class="filt-lang active">한글</button><button id="hd24LangEn" type="button" class="filt-lang">English</button></span></h2><div class="field-row"><label>메일 상태</label><div id="hd24MailStatus">분석 후 관리대상 메일 Preview가 자동 준비됩니다.</div></div><div id="hd24Preview" style="display:none;border:1px solid #dde1e6;border-radius:6px;padding:16px;margin:12px 0;background:#fff"><div><b>To</b> <span id="hd24PreviewTo"></span></div><div style="margin-top:6px"><b>CC</b> <span id="hd24PreviewCc"></span></div><div style="margin-top:6px"><b>Subject</b> <span id="hd24PreviewSubject"></span></div><pre id="hd24PreviewBody" style="white-space:pre-wrap;background:#f7f8fa;padding:12px;border-radius:4px;max-height:320px;overflow:auto"></pre><div style="display:flex;align-items:flex-start;gap:12px;flex-wrap:wrap"><div class="actions" style="margin:0"><button id="hd24DownloadReply" class="ghost">회신용 Excel 다운로드</button><button id="hd24SendMail">발송</button></div><div id="hd24SendLog" style="flex:1;min-width:300px;max-height:92px;overflow:auto;border:1px solid #dde1e6;border-radius:6px;background:#f7f8fa;padding:8px 10px;font-size:12px;line-height:1.45;color:#17324d">발송 이력 없음</div></div><p class="hint">Preview 확인 전에는 발송되지 않습니다. 발송 버튼은 설정된 메일 API가 있으면 실제 발송하고 성공 응답 시 발송시점을 기록합니다. API가 없으면 Outlook용 .eml 패키지를 다운로드합니다. 패키지에는 To/CC/제목/본문/회신 Excel/KPI PNG가 포함되며, 다운로드된 .eml을 Outlook에서 열어 확인 후 보내기 합니다. 이 경우 HD-24는 실제 발송 완료 여부를 확인하지 않고 ‘Outlook 패키지 다운로드’로 구분 기록합니다.</p></div><hr style="border:none;border-top:1px solid #dde1e6;margin:18px 0"><div class="field-row"><label>회신 파일</label><input type="file" id="hd24ReplyFile" accept=".xlsx,.xlsm"></div><div class="actions"><button id="hd24ImportReply" class="ghost">회신파일 이력 반영</button></div><p class="hint">인도/브라질 영문 회신파일을 업로드하면 사업장 + KPI + 대상월 + 회신차수로 사유/근본원인/만회계획/Owner/완료예정일/차월목표/회신자/회신시점을 누적 저장합니다. 기존 이력은 덮어쓰지 않습니다.</p><div id="hd24HistorySummary" style="margin-top:12px"></div>`;host.appendChild(sec);wireUi();}
function renderSendLog(){const el=$('hd24SendLog');if(!el)return;const raw=load(MAIL_KEY).filter(x=>x.plant===pkey()&&(x.status==='sent'||x.status==='send-failed'||x.status==='outlook-package-downloaded'));const seen=new Set(),rows=[];for(const x of raw){const t=x.sentAt||x.failedAt||x.mailOpenedAt||x.preparedAt||'',k=[x.status,t,x.error||''].join('|');if(seen.has(k))continue;seen.add(k);rows.push(x);if(rows.length>=8)break}el.innerHTML=rows.length?rows.map(x=>{const ok=x.status==='sent',pack=x.status==='outlook-package-downloaded',label=ok?'발송 성공':pack?'Outlook 패키지':'발송 실패',t=x.sentAt||x.failedAt||x.mailOpenedAt||x.preparedAt||'',detail=x.error?' · '+String(x.error).replace(/[<>]/g,''):'';return '<div style="padding:3px 0;border-bottom:1px solid #e7eaee"><b>'+label+'</b> · '+(t?new Date(t).toLocaleString():'-')+detail+'</div>'}).join(''):'발송 이력 없음'}
function renderPreview(items,mode,preparedAt){const to=$('mailTo')?.value.trim()||'',cc=$('mailCc')?.value.trim()||'';previewState={items,mode,to,cc,subject:subject(items),body:body(items),preparedAt:preparedAt||nowIso()};$('hd24Preview').style.display='block';$('hd24PreviewTo').textContent=to||'(recipient not entered)';$('hd24PreviewCc').textContent=cc||'(none)';$('hd24PreviewSubject').textContent=previewState.subject;$('hd24PreviewBody').textContent=previewState.body;$('hd24MailStatus').textContent=`Preview ready · ${items.length} KPI(s) · prepared ${new Date(previewState.preparedAt).toLocaleString()}`;logSafe(`메일 미리보기 준비: ${items.length}건`);renderSendLog();}
function interceptMailButton(id,mode){const el=$(id);if(!el)return;el.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();const items=selectItems(mode);if(!items.length){alert('메일 대상 KPI가 없습니다.');return}const preparedAt=nowIso();renderPreview(items,mode,preparedAt);mailHistoryRecord(items,{status:'prepared',preparedAt})},true)}
function mailHistoryRecord(items,extra){const list=load(MAIL_KEY);for(const r of items)list.unshift({plant:pkey(),plantName:pname(),targetMonth:Number(r.month)||month(),kpi:r.kpi||'',kpiEn:r.kpiEn||'',preparedAt:extra.preparedAt||previewState?.preparedAt||nowIso(),...extra});save(MAIL_KEY,list.slice(0,3000));}
async function withTimeout(p,ms,label){let t;try{return await Promise.race([p,new Promise((_,rej)=>{t=setTimeout(()=>rej(new Error(label+' 시간초과')),ms)})])}finally{clearTimeout(t)}}
async function sendPreview(){if(!previewState)throw new Error('메일 Preview가 준비되지 않았습니다.');const to=$('mailTo')?.value.trim()||previewState.to,cc=$('mailCc')?.value.trim()||previewState.cc||'';if(!to){alert('담당자 이메일을 입력해주세요.');return}let file,fname;try{const built=await withTimeout(buildReplyFile(previewState.items),30000,'회신 Excel 생성');file=built.file;fname=built.fname;if(!file||file.size<1000)throw new Error('회신 Excel 파일이 비어 있습니다.');$('hd24MailStatus').textContent=`2/6 회신 Excel 생성 완료 · ${fname} · ${Math.ceil(file.size/1024)} KB`;logSafe(`메일 2/6 Excel 생성 완료: ${fname} · ${file.size} bytes`);}catch(e){throw new Error('2/6 Excel 생성 실패: '+(e?.message||e))}let shots=[];try{$('hd24MailStatus').textContent='3/6 KPI PNG 생성 중...';shots=await withTimeout(resultScreenshots(),90000,'KPI PNG 생성');if(!shots.length)throw new Error('생성된 KPI PNG가 없습니다.');const bad=shots.find(x=>!x?.file||x.file.size<1000||!x.base64);if(bad)throw new Error('비정상 KPI PNG 감지: '+(bad?.name||'unknown'));$('hd24MailStatus').textContent=`3/6 KPI PNG 생성 완료 · ${shots.length}개`;logSafe(`메일 3/6 KPI PNG 생성 완료: ${shots.length}개 · ${shots.reduce((n,x)=>n+(x.file?.size||0),0)} bytes`);}catch(e){throw new Error('3/6 KPI PNG 생성 실패: '+(e?.message||e))}const endpoint=(window.HD24_MAIL_ENDPOINT||localStorage.getItem(CONFIG_KEY)||'').trim();if(endpoint){$('hd24MailStatus').textContent='발송 중...';try{const payload={to,cc,subject:previewState.subject,body:previewState.body,plant:pkey(),targetMonth:month(),attachmentName:fname,attachmentBase64:await fileToBase64(file),attachments:[{name:fname,contentType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',base64:await fileToBase64(file)},...shots.map(x=>({name:x.name,contentType:'image/png',base64:x.base64}))]};const res=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});if(!res.ok)throw new Error(`HTTP ${res.status}`);const sentAt=nowIso();mailHistoryRecord(previewState.items,{status:'sent',sentAt});$('hd24MailStatus').textContent=`발송 완료 · ${new Date(sentAt).toLocaleString()}`;logSafe(`메일 발송 완료: ${to}`);renderSendLog();return}catch(e){const failedAt=nowIso();mailHistoryRecord(previewState.items,{status:'send-failed',failedAt,error:e.message});$('hd24MailStatus').textContent='메일 API 발송 실패: '+e.message;logSafe('메일 API 발송 실패: '+e.message);renderSendLog();return}}
 const openedAt=nowIso();$('hd24MailStatus').textContent='4/6 Outlook EML 패키지 생성 중...';const attachments=[{name:fname,contentType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',base64:await fileToBase64(file)},...shots.map(x=>({name:x.name,contentType:'image/png',base64:x.base64}))],eml=buildOutlookEml({to,cc,subject:previewState.subject,body:previewState.body,attachments}),emlName=`HDPS_KPI_${pname()}_${String(month()).padStart(2,'0')}M_Outlook.eml`,emlFile=new File([eml],emlName,{type:'message/rfc822'});if(!eml.includes('X-Unsent: 1')||!eml.includes('Content-Disposition: attachment')||emlFile.size<1000)throw new Error('4/6 Outlook EML 패키지 검증 실패');$('hd24MailStatus').textContent=`4/6 Outlook EML 생성 완료 · ${attachments.length}개 첨부 · ${Math.ceil(emlFile.size/1024)} KB`;logSafe(`메일 4/6 EML 생성 완료: ${emlName} · ${emlFile.size} bytes`);$('hd24MailStatus').textContent='5/6 Outlook EML 다운로드 시작...';const dl=downloadFile(emlFile);$('hd24MailStatus').textContent=`5/6 Outlook EML 다운로드 요청 완료 · ${dl.name} · ${Math.ceil(dl.size/1024)} KB · 다운로드 폴더에서 파일을 열어주세요`;logSafe(`메일 5/6 EML 다운로드 요청 완료: ${dl.name} · ${dl.size} bytes`);mailHistoryRecord(previewState.items,{status:'outlook-package-downloaded',mailOpenedAt:openedAt});$('hd24MailStatus').textContent=`Outlook 메일 패키지 다운로드 완료 · ${attachments.length}개 첨부 포함 · 다운로드된 .eml을 열어 확인 후 보내기`;logSafe(`Outlook EML 패키지 생성: ${emlName} · 첨부 ${attachments.length}개`);renderSendLog();}
function mimeB64Text(v){return btoa(unescape(encodeURIComponent(String(v??''))))}
function mimeLines(v){return String(v||'').replace(/\s+/g,'').match(/.{1,76}/g)?.join('\r\n')||''}
function safeHeader(v){return String(v??'').replace(/[\r\n]+/g,' ').trim()}
function asciiFileName(v){return safeHeader(v).replace(/[^\x20-\x7E]/g,'_').replace(/["\\]/g,'_')||'attachment.bin'}
function rfc5987(v){return encodeURIComponent(safeHeader(v)).replace(/['()*]/g,c=>'%'+c.charCodeAt(0).toString(16).toUpperCase())}
function buildOutlookEml({to,cc,subject,body,attachments}){const boundary='----=_HD24_'+Date.now().toString(36),lines=['X-Unsent: 1','MIME-Version: 1.0','To: '+safeHeader(to)];if(cc)lines.push('Cc: '+safeHeader(cc));lines.push('Subject: =?UTF-8?B?'+mimeB64Text(subject)+'?=','Content-Type: multipart/mixed; boundary="'+boundary+'"','', '--'+boundary,'Content-Type: text/plain; charset="UTF-8"','Content-Transfer-Encoding: base64','',mimeLines(mimeB64Text(body)));for(const a of attachments){const n=safeHeader(a.name),fallback=asciiFileName(n),encoded=rfc5987(n);lines.push('--'+boundary,'Content-Type: '+safeHeader(a.contentType||'application/octet-stream')+'; name="'+fallback+'"; name*=UTF-8\'\''+encoded,'Content-Transfer-Encoding: base64','Content-Disposition: attachment; filename="'+fallback+'"; filename*=UTF-8\'\''+encoded,'',mimeLines(a.base64));}lines.push('--'+boundary+'--','');return lines.join('\r\n')}
async function resultScreenshots(){
  if(typeof html2canvas!=='function')throw new Error('Screenshot renderer unavailable');
  const months=[...new Set((previewState?.items||[]).map(r=>Number(r.month)).filter(Boolean))].sort((a,b)=>a-b),captureMonths=months.length?months:[month()],originalMonth=month(),out=[],names=['Missed','Achieved'];
  const host=document.createElement('div');host.id='hd24CaptureHost';host.style.cssText='position:fixed;left:-20000px;top:0;width:1400px;background:#fff;color:#17324d;z-index:-1;display:block;visibility:visible;opacity:1;padding:16px;';document.body.appendChild(host);
  try{
    for(const mo of captureMonths){
      if(typeof selectedMonth!=='undefined')selectedMonth=mo;
      if(typeof renderTable==='function')renderTable();
      if(typeof updateStripActive==='function')updateStripActive();
      await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
      const live=[...document.querySelectorAll('.result-cols .result-col')].slice(0,2);
      if(live.length<2)throw new Error('판정결과 영역을 찾을 수 없습니다.');
      for(let i=0;i<2;i++){
        host.innerHTML='';const clone=live[i].cloneNode(true);clone.classList.remove('hd24-tab-hidden');clone.style.cssText+=';display:block!important;visibility:visible!important;opacity:1!important;width:1320px!important;max-width:none!important;height:auto!important;overflow:visible!important;background:#fff!important;color:#17324d!important;';host.appendChild(clone);
        await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
        const w=Math.max(clone.scrollWidth,clone.offsetWidth,1),fullH=Math.max(clone.scrollHeight,clone.offsetHeight,1),viewportH=900,scale=1,pageCount=Math.max(1,Math.ceil(fullH/viewportH));
        // 100% 배율을 유지한 채 긴 결과를 세로 스크롤 단위로 분할 캡처한다.
        // 전체를 한 장으로 축소하지 않으므로 각 PNG의 글자 크기는 실제 화면과 동일하게 유지된다.
        for(let page=0;page<pageCount;page++){
          const y=page*viewportH,h=Math.min(viewportH,fullH-y);
          const canvas=await html2canvas(clone,{backgroundColor:'#ffffff',scale,useCORS:true,logging:false,width:w,height:h,windowWidth:w,windowHeight:viewportH,scrollX:0,scrollY:-y,y,ignoreElements:el=>el.tagName==='IMG'&&!(el.complete&&el.naturalWidth>0)});
          if(!canvas.width||!canvas.height)throw new Error('empty screenshot canvas');
          const ctx=canvas.getContext('2d',{willReadFrequently:true});if(ctx){const d=ctx.getImageData(0,0,Math.min(canvas.width,64),Math.min(canvas.height,64)).data;let opaque=0;for(let k=3;k<d.length;k+=4)if(d[k]>0)opaque++;if(!opaque)throw new Error('transparent screenshot canvas');}
          const blob=await new Promise((resolve,reject)=>{try{canvas.toBlob(b=>b&&b.size>1000?resolve(b):reject(new Error('PNG encoder returned empty image')),'image/png')}catch(e){reject(e)}});
          const part=pageCount>1?`_P${String(page+1).padStart(2,'0')}`:'',file=new File([blob],`HDPS_KPI_${pname()}_${String(mo).padStart(2,'0')}M_${names[i]}${part}.png`,{type:'image/png'});
          out.push({file,name:file.name,base64:await fileToBase64(file),month:mo,type:names[i],page:page+1,pageCount});
        }
      }
    }
  }finally{host.remove();if(typeof selectedMonth!=='undefined')selectedMonth=originalMonth;if(typeof renderTable==='function')renderTable();if(typeof updateStripActive==='function')updateStripActive();}
  return out;
}
function fileToBase64(file){return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result).split(',')[1]||'');r.onerror=()=>reject(r.error);r.readAsDataURL(file)})}
function cellText(v){if(v==null)return '';if(typeof v==='object'){if(v.text!=null)return String(v.text);if(v.result!=null)return String(v.result);if(Array.isArray(v.richText))return v.richText.map(x=>x.text||'').join('')}return String(v)}
async function importReply(){const f=$('hd24ReplyFile')?.files?.[0];if(!f){alert('회신 파일을 선택해주세요.');return}if(typeof ExcelJS==='undefined')throw new Error('ExcelJS unavailable');const wb=new ExcelJS.Workbook();await wb.xlsx.load(await f.arrayBuffer());if(!wb.worksheets.length)throw new Error('회신 시트 없음');const list=load(REPLY_KEY),pending=[],receivedAt=nowIso();let added=0;for(const ws of wb.worksheets){const headers={};ws.getRow(1).eachCell((c,i)=>headers[norm(cellText(c.value))]=i);const find=(...names)=>{for(const n of names){const i=headers[norm(n)];if(i)return i}return 0};const cPlant=find('Plant','사업장'),cMonth=find('Target Month','대상월'),cKpi=find('KPI','KPI (KR)','KPI (EN)'),cReason=find('Reason for Miss / Deterioration','Reason for Not Achieving','미달성 사유'),cRoot=find('Root Cause','근본원인'),cPlan=find('Recovery / Catch-up Plan','Countermeasure / Due Date','만회대책'),cOwner=find('Action Owner','담당자'),cDue=find('Planned Completion Date','완료예정일'),cNext=find('Next-month Recovery Target','익월 회복목표'),cResp=find('Responder','응답자');if(!cPlant)throw new Error(`Plant column not found: ${ws.name}`);if(!cMonth)throw new Error(`Target Month column not found: ${ws.name}`);if(!cKpi)throw new Error(`KPI column not found: ${ws.name}`);if(!cReason&&!cRoot&&!cPlan)throw new Error(`Response columns not found: ${ws.name}`);ws.eachRow((row,rn)=>{if(rn===1)return;const val=i=>i?cellText(row.getCell(i).value).trim():'';const kpiName=val(cKpi),reason=val(cReason),rootCause=val(cRoot),recoveryPlan=val(cPlan);if(!kpiName||!(reason||rootCause||recoveryPlan))return;const rawPlant=val(cPlant).toLowerCase(),plant=rawPlant.includes('brazil')||rawPlant.includes('브라질')?'brazil':rawPlant.includes('india')||rawPlant.includes('인도')?'india':'';if(!plant){logSafe(`회신 파일 미인식 사업장 차단: ${kpiName} / ${val(cPlant)}`);return;}const rawMonth=val(cMonth),targetMonth=Number(rawMonth),key=norm(kpiName);if(!rawMonth||!Number.isInteger(targetMonth)||!(targetMonth>=1&&targetMonth<=12)||targetMonth>month()){logSafe(`회신 파일 미래/비정상 월 차단: ${kpiName} / ${targetMonth}M / 현재 분석월 ${month()}M`);return;}const prev=list.filter(x=>x.plant===plant&&x.targetMonth===targetMonth&&norm(x.kpiEn||x.kpi)===key);const sameReply=x=>x.replyFileName===f.name&&String(x.reason||'')===reason&&String(x.rootCause||'')===rootCause&&String(x.recoveryPlan||'')===recoveryPlan&&String(x.actionOwner||'')===val(cOwner)&&String(x.plannedCompletionDate||'')===val(cDue);const duplicate=prev.some(sameReply)||pending.some(x=>x.plant===plant&&x.targetMonth===targetMonth&&norm(x.kpiEn||x.kpi)===key&&sameReply(x));if(duplicate){logSafe(`동일 회신 재Import 차단: ${plant} / ${targetMonth}M / ${kpiName} / ${f.name}`);return;}const mail=load(MAIL_KEY).filter(x=>x.plant===plant&&x.targetMonth===targetMonth&&norm(x.kpiEn||x.kpi)===key).sort((a,b)=>String(b.sentAt||b.mailOpenedAt||b.preparedAt||'').localeCompare(String(a.sentAt||a.mailOpenedAt||a.preparedAt||'')))[0]||{};pending.push({plant,targetMonth,kpi:kpiName,kpiEn:kpiName,reason,rootCause,recoveryPlan,actionOwner:val(cOwner),plannedCompletionDate:val(cDue),nextMonthRecoveryTarget:val(cNext),responder:val(cResp),replyReceivedAt:receivedAt,replyFileName:f.name,replySequence:prev.length+pending.filter(y=>y.plant===plant&&y.targetMonth===targetMonth&&norm(y.kpiEn||y.kpi)===key).length+1,lastMailPreparedAt:mail.preparedAt||'',lastMailSentAt:mail.sentAt||'',lastMailOpenedAt:mail.mailOpenedAt||'',lastMailStatus:mail.status||''});added++});}list.unshift(...pending.reverse());save(REPLY_KEY,list.slice(0,4000));if(typeof invalidateReplyHistoryCache==='function')invalidateReplyHistoryCache();$('hd24HistorySummary').textContent=`회신 이력 반영 완료: ${added} KPI · 회신 수신시점 ${new Date(receivedAt).toLocaleString()} · ${f.name}`;logSafe(`회신 파일 이력 반영: ${added}건 / ${f.name}`);}
function uploadSignature(){const a=$('srcFile')?.files?.[0],b=$('masterFile')?.files?.[0];if(!b)return '';if(!a)return [pkey(),'(no-src)',b.name,b.size,b.lastModified].join('|');return [pkey(),a.name,a.size,a.lastModified,b.name,b.size,b.lastModified].join('|')}
async function tryAutoPackage(reason){if(window.hd24FollowupSyncOwnsAutoPackage){if(!legacyAutoSuppressedLogged){legacyAutoSuppressedLogged=true;logSafe('레거시 자동패키지 비활성화: follow-up sync가 단일 오케스트레이터로 실행');}return}const sig=uploadSignature(),judge=$('btnJudge');if(!sig||sig===lastAutoPackageSignature||!judge||judge.disabled)return;lastAutoPackageSignature=sig;try{logSafe(`자동분석 시작: ${reason}`);judge.click();await new Promise(r=>setTimeout(r,80));const items=selectItems('watch');if(!items.length){$('hd24MailStatus').textContent='자동분석 완료 · 메일 관리대상 KPI 없음';logSafe('자동분석 완료: 관리대상 KPI 없음');return}const preparedAt=nowIso();renderPreview(items,'watch',preparedAt);mailHistoryRecord(items,{status:'prepared',preparedAt,autoPrepared:true});const pack=await buildReplyFile(items);$('hd24MailStatus').textContent=`자동분석/메일 Preview 준비 완료 · ${items.length} KPI`;logSafe(`자동 메일 Preview 준비: ${pack.fname} / ${items.length}건 · 회신 Excel은 메일 발송 또는 수동 다운로드 시에만 추출`)}catch(e){lastAutoPackageSignature='';logSafe('자동분석 패키지 오류: '+(e?.message||e))}}
function scheduleAutoPackage(reason){[0,100,300,700,1500,3000,6000,10000].forEach(ms=>setTimeout(()=>tryAutoPackage(reason),ms))}
// 메일 발송 대상 월 체크박스가 바뀌었을 때(자동패키지의 파일서명 기준 중복방지 가드에
// 걸리지 않고) 미리보기를 즉시 다시 계산하기 위해 index.html에서 호출하는 훅.
window.hd24RefreshMailPreview = function(){
  const mode = previewState ? previewState.mode : 'watch';
  const items = selectItems(mode);
  if (items.length) renderPreview(items, mode, nowIso());
  else { $('hd24Preview').style.display='none'; $('hd24MailStatus').textContent='선택한 달에 해당하는 관리대상 KPI가 없습니다.'; }
};
function wireUi(){interceptMailButton('btnMailMonth','month');interceptMailButton('btnMailWatch','watch');interceptMailButton('btnMailAll','all');$('hd24DownloadReply')?.addEventListener('click',async()=>{if(!previewState)return;downloadFile((await buildReplyFile(previewState.items)).file)});$('hd24SendMail')?.addEventListener('click',()=>{const btn=$('hd24SendMail'),status=$('hd24MailStatus');if(btn?.disabled)return;if(btn){btn.disabled=true;btn.textContent='메일 준비 중...'}if(status)status.textContent='1/6 메일 패키지 준비 시작...';Promise.resolve().then(()=>sendPreview()).catch(e=>{if(status)status.textContent='메일 패키지 생성 실패: '+(e?.message||e);logSafe('메일 발송 버튼 처리 오류: '+(e?.stack||e?.message||e));alert('메일 패키지 생성 실패: '+(e?.message||e));}).finally(()=>{if(btn){btn.disabled=false;btn.textContent='발송'}})});$('hd24ImportReply')?.addEventListener('click',()=>importReply().catch(e=>{alert(e.message);logSafe('회신 파일 반영 오류: '+e.message)}));
  function switchLang(lang){try{if(typeof setLang==='function')setLang(lang);else currentLang=lang}catch(_){currentLang=lang}$('hd24LangKo')?.classList.toggle('active',lang==='ko');$('hd24LangEn')?.classList.toggle('active',lang==='en');if(previewState)renderPreview(previewState.items,previewState.mode,previewState.preparedAt)}
  $('hd24LangKo')?.addEventListener('click',()=>switchLang('ko'));
  $('hd24LangEn')?.addEventListener('click',()=>switchLang('en'));
  try{$('hd24LangKo')?.classList.toggle('active',(typeof currentLang==='undefined'?'ko':currentLang)==='ko');$('hd24LangEn')?.classList.toggle('active',currentLang==='en')}catch(_){}
  $('hd24ReplyFile')?.addEventListener('change',()=>{if($('hd24ReplyFile')?.files?.[0])importReply().catch(e=>{logSafe('회신 파일 자동 반영 오류: '+e.message)})});['srcFile','masterFile','plantSelect'].forEach(id=>$(id)?.addEventListener('change',()=>{lastAutoPackageSignature='';scheduleAutoPackage(id+' change')}));const judge=$('btnJudge');if(judge)new MutationObserver(()=>scheduleAutoPackage('analysis ready')).observe(judge,{attributes:true,attributeFilter:['disabled']});scheduleAutoPackage('startup')}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ensureUi,{once:true});else ensureUi();
})();