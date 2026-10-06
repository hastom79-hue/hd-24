(()=>{
'use strict';

const REPLY_KEY='hd24_kpi_reply_history_v2';
const MAIL_KEY='hd24_kpi_mail_history_v2';
const CONFIG_KEY='hd24_mail_endpoint_v1';
const REQUIRED_CC=['dylee07@hd.com','hastom@hd.com'];
function requiredCc(value){const addresses=String(value||'').split(/[;,\s]+/).map(s=>s.trim()).filter(Boolean);const seen=new Set();return [...REQUIRED_CC,...(pkey()==='india'?INDIA_REQUIRED_CC:pkey()==='brazil'?BRAZIL_REQUIRED_CC:[]),...addresses].filter(address=>{const key=address.toLowerCase();if(seen.has(key))return false;seen.add(key);return true}).join('; ')}
const INDIA_REQUIRED_CC=['minsu.kim01@hd.com','deokho.kim@hd.com'];
const BRAZIL_REQUIRED_CC=["antos2082@hd.com","yhchoi@hd.com"];
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
function replyHistoryFor(r){const keys=new Set([norm(r.kpiEn||''),norm(r.kpi||'')].filter(Boolean));return load(REPLY_KEY).filter(h=>h.plant===pkey()&&[norm(h.kpiEn||''),norm(h.kpi||'')].some(k=>k&&keys.has(k))).sort((a,b)=>String(b.replyReceivedAt||'').localeCompare(String(a.replyReceivedAt||'')));}
function recurrenceFor(r){const h=replyHistoryFor(r);if(h.length<2)return h.length?{history:h,latest:h[0],sameCauseCount:1,total:h.length,isRecurrence:false}:null;const latest=h[0],cause=latest.rootCause||latest.reason||'';const same=h.filter(x=>similarity(cause,x.rootCause||x.reason||'')>=0.6).length;return {history:h,latest,sameCauseCount:same,total:h.length,isRecurrence:same>=2};}
function isActionTarget(r){const rec=recurrenceFor(r);return !r.achieved||r.streak>=2||r.trend==='down'||!!rec?.isRecurrence;}
function selectItems(mode){const items=current();if(mode==='all')return items;if(mode==='month')return items.filter(r=>!r.achieved);return items.filter(isActionTarget);}
function tags(r, ko){
  const out=[];
  if(!r.achieved)out.push(ko?'목표 미달':'Current Month: Target Miss');
  if(r.streak>=2)out.push(ko?`${r.streak}개월 연속 미달성`:`Cumulative: ${r.streak} Consecutive Months Missed`);
  if(r.trend==='down')out.push(ko?'최근 악화':'Recent decline');
  const rec=recurrenceFor(r);
  if(rec?.isRecurrence)out.push(ko?`동일 사유 반복(${rec.sameCauseCount}회) · 중점관리`:`Recurring same cause (x${rec.sameCauseCount}) · Focus`);
  if(r.flatStreak>=1)out.push(r.isCumulative
    ?(ko?`누적형 지표 · ${r.flatStreak+1}개월째 변화없음`:`Cumulative KPI · No change for ${r.flatStreak+1}mo`)
    :(ko?`전월과 동일(변화없음 ${r.flatStreak+1}개월째)`:`No change vs last month (${r.flatStreak+1}mo flat)`));
  return out;
}
function statusRich(r,ko=false,dark=false){const xs=tags(r,ko),richText=[];xs.forEach((v,i)=>{if(i)richText.push({text:'\n',font:{color:{argb:dark?'FFFFFFFF':'FF64748B'}}});let color='FF334155';if(dark)color='FFFFFFFF';else if(v.includes('Target Miss')||v.includes('목표 미달'))color='FF9C251D';else if(v.includes('Consecutive')||v.includes('연속 미달'))color='FF8C4C00';else if(v.includes('Recent decline')||v.includes('악화'))color='FF65358B';else if(v.includes('Recurring')||v.includes('동일 사유'))color='FF075E67';richText.push({text:v,font:{bold:true,color:{argb:color}}})});return {richText}}
function unitForFile(unit,ko){const raw=String(unit??'').trim();if(ko)return raw;const compact=raw.replace(/\\s+/g,'');const translated={'MH/대':'MH/unit','일':'days','건/년':'cases/year','명/년':'persons/year','인/건':'persons/case','회전':'turns','점':'points','명':'persons','건':'cases','대분':'unit-min','시간':'hours','분':'minutes','원':'KRW','대':'units'};return translated[compact]||raw}
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
function recipientGreeting(){const name=String($('mailToName')?.value||'').trim().replace(/[\r\n<>]/g,' ').replace(/\s+/g,' ').replace(/[,]+$/,'');return name?'Dear '+name+',':'Dear Team,'}
function managementMailBody(items){
 const engine=window.HD24_RULE_MATRIX_V1;if(!engine)return null;
 let all=[];try{all=Array.isArray(allResults)?allResults:items}catch(_){all=items}
 const analyzed=engine.analyzeAll(all).filter(x=>items.includes(x.record));
 const trustedAnalyzed=analyzed.filter(x=>x.integrityGate?.state!=='BLOCK');
 const clusters=(engine.clusterFindings?engine.clusterFindings(all):[]).filter(x=>[...new Set(items.map(r=>Number(r.month)))].includes(Number(x.month)));
 const positives=trustedAnalyzed.filter(x=>['RECOVERING','RECOVERY_CONFIRMED'].includes(x.trend.state));
 const key=trustedAnalyzed.filter(x=>x.managementState!=='WATCH'||x.findings.some(f=>['DATA_INTEGRITY','PDCA','REPLY_VALIDATION'].includes(f.type)));
 const issueFollowups=engine.consolidateIssueFollowups?engine.consolidateIssueFollowups(trustedAnalyzed,clusters):[]; const questions=issueFollowups.length?issueFollowups.map(x=>x.question):[...new Set(trustedAnalyzed.flatMap(x=>x.questions))];
 const en=isEn(), greet=en?recipientGreeting():'안녕하세요,', monthsText=(typeof itemsMonthLabel==='function')?itemsMonthLabel(items,en):(en?month()+'M':month()+'월');
 const lines=[greet,'',en?`Please find below the management review of ${pname()} HDPS KPI results for ${monthsText}.`:`${pnameKo()} 사업장 ${monthsText} HDPS KPI에 대한 Management Review 결과를 공유드립니다.`,''];
 const section=(title,arr)=>{lines.push(title);if(arr.length)arr.forEach((v,i)=>lines.push((i+1)+'. '+v));else lines.push(en?'• No exceptional item requiring separate comment.':'• 별도 회신이 필요한 특이사항은 없습니다.');lines.push('')};
 section(en?'1. EXECUTIVE REVIEW SUMMARY':'1. Executive Review Summary',[
  en?`The review identified ${key.length} management-focus KPI(s), ${clusters.length} cross-KPI finding(s), and ${questions.length} point(s) requiring confirmation.`:`관리 중점 KPI ${key.length}건, Cross-KPI 분석 ${clusters.length}건, 확인이 필요한 논리 Gap ${questions.length}건이 도출되었습니다.`
 ]);
 section(en?'2. POSITIVE / RECOVERY FINDINGS':'2. Positive / Recovery Findings',positives.slice(0,6).map(x=>`${kpiOfMail(x.record)}: ${x.trend.state}`));
 const clusteredKpis=new Set(clusters.flatMap(x=>x.kpis||[]).map(norm));
 const issueKeys=new Map();
 key.filter(x=>!positives.includes(x)).forEach(x=>{const ik=engine.issueKeyFor?engine.issueKeyFor(x.record):'KPI:'+norm(kpiOfMail(x.record));if(!issueKeys.has(ik))issueKeys.set(ik,[]);issueKeys.get(ik).push(x)});
 const issueFindings=[...issueKeys.entries()].filter(([ik,xs])=>!xs.every(x=>clusteredKpis.has(norm(kpiOfMail(x.record))))).map(([ik,xs])=>{
   const names=[...new Set(xs.map(x=>kpiOfMail(x.record)))], states=[...new Set(xs.flatMap(x=>x.findings.map(f=>f.statement)))];
   return `[${names.join(' / ')}] ${states.join(' / ')}`;
 });
 section(en?'3. KEY ANALYTICAL FINDINGS':'3. Key Analytical Findings',[
  ...clusters.map(x=>`${x.cluster} — ${x.state}: ${x.statement}`),
  ...issueFindings.slice(0,8)
 ]);
 const implications=[...new Set([
  ...clusters.map(x=>x.statement),
  ...issueFollowups.map(x=>en?`Management validation remains open for ${x.kpis.join(' / ')} until the stated logic gap is clarified.`:`${x.kpis.join(' / ')}는 해당 논리 Gap이 확인될 때까지 Management Validation 대상으로 유지합니다.`)
 ])];
 section(en?'4. MANAGEMENT IMPLICATIONS':'4. Management Implications',implications.slice(0,6));
 section(en?'5. POINTS TO CONFIRM':'5. Points to Confirm',issueFollowups.length?issueFollowups.map(x=>`[${x.kpis.join(' / ')}] ${x.question}`):questions);
 section(en?'6. NEXT-MONTH FOLLOW-UP':'6. Next-Month Follow-up',[en?'Please update the existing reply/action fields only where the above confirmation points remain open. We will revalidate recovery, action effect and recurrence in the next monthly review.':'상기 확인 필요사항이 남아 있는 항목만 기존 회신/조치 필드를 갱신해 주시기 바랍니다. 차월 Review에서 실적 회복, 대책 효과 및 재발 여부를 재검증하겠습니다.']);
 lines.push(en?'Best Regards,':'감사합니다.',en?'Mr.Seoh':'서지철 드림');return lines.join('\n');
}
function kpiOfMail(r){return String(r?.kpiEn||r?.kpi||'').trim()}
function body(items){
  const structured=managementMailBody(items);if(structured)return structured;
  const en=isEn();
  const monthsText = (typeof itemsMonthLabel==='function') ? itemsMonthLabel(items, en) : (en?`${month()}M`:`${month()}월`);
  const repeated=items.filter(r=>recurrenceFor(r)?.isRecurrence).length;
  const ms=missSummary(items),miss=ms.unique;
  const lines=en?[
    recipientGreeting(),'',
    `Please review the attached ${pname()} HDPS KPI results for ${monthsText} and return the completed Excel.`,
    '',
    ms.months.length>1?`Summary: ${miss} unique KPI(s) not achieved across the selected months (common KPIs: ${ms.common}, month-specific KPIs: ${ms.individual}).`:`Summary: ${miss} KPI(s) not achieved (${repeated} repeated issue${repeated===1?'':'s'}).`,
    '',
    `STATUS / TREND (Excel):`,
    `• Dark red: 3+ consecutive misses or recent decline (>3% over up to 3 months).`,
    `• Target Miss: monthly target not met. Consecutive Miss: number of missed months.`,
    `• Recurring cause: similar causes in 2+ replies. No change: unchanged actuals.`,
    `• Multiple labels may apply to one KPI.`,
    '',
    `REQUIRED \u2014 please fill in and return the attached file with:`,
    `1. Reason for the miss / deterioration`,
    `2. Root cause`,
    `3. Recovery / catch-up plan (with target completion date)`,
    '',
    `Complete the highlighted Excel columns: Reason / Root Cause / Recovery Plan (with due date).`,
    '',
    `Confirm KPI recovery after implementing corrective actions.`,
    '',
    `Best Regards,`,
    `Mr.Seoh`,
  ]:[
    `안녕하세요,`,'',
    `${pnameKo()} 사업장 ${monthsText} HDPS KPI 결과를 확인하시고 첨부 Excel에 작성하여 회신 부탁드립니다.`,
    '',
    ms.months.length>1?`요약: 선택월 전체에서 중복을 제거한 미달성 KPI ${miss}개 (모든 선택월 공통 미달성: ${ms.common}개, 특정 월 미달성: ${ms.individual}개)`:`요약: 미달성 KPI ${miss}건 (반복 재발 ${repeated}건)`,
    '',
    `상태/추세 기준(첨부 Excel):`,
    `• 진한 붉은색: 3개월 이상 연속 미달 또는 최근 악화(최대 3개월간 3% 초과 하락).`,
    `• 당월 미달: 해당 월 목표 미달. 연속 미달: 연속 미달 개월 수.`,
    `• 동일 사유 반복: 유사 사유 회신 2건 이상. 변화 없음: 실적치 동일.`,
    `• 한 KPI에 여러 상태가 함께 표시될 수 있습니다.`,
    '',
    `필수 회신 \u2014 첨부 파일에 아래 내용을 작성하여 회신 부탁드립니다:`,
    `1. 미달성/악화 사유`,
    `2. 근본 원인`,
    `3. 만회대책 (완료 목표일 포함)`,
    '',
    `Excel의 강조된 입력란에 미달 사유·근본원인·만회대책(완료예정일)을 작성해 주십시오.`,
    '',
    `조치 완료 후에도 KPI 실적 회복 여부를 확인해 주십시오.`,
    '',
    `감사합니다.`,
    `서지철 드림`,
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
    ? ['사업장','대상연도','대상월','KPI','단위','목표','실적','상태/추세','반복이슈',...(hasPrevious?['이전 사유/근본원인','이전 만회대책']:[]),'미달성 사유','근본원인','만회대책','담당자','완료예정일']
    : ['Plant','Target Year','Target Month','KPI','Unit','Target','Actual','Status / Trend',...(hasReplyHistory?['반복이슈']:[]),...(hasPrevious?['Previous Reason / Root Cause','Previous Countermeasure']:[]),'Reason for Miss / Deterioration','Root Cause','Recovery / Catch-up Plan','Action Owner','Planned Completion Date'];
  for(const m of months){const ws=wb.addWorksheet(String(m).padStart(2,'0')+' Month');const monthItems=uniqueItems.filter(r=>Number(r.month)===m);
  ws.columns=cols.map((h,i)=>({header:h,key:'c'+i,width:[12,12,36,14,12,12,48,18,32,32,22,22,22,34,34,36,20,22,24,20][i]}));const hr=ws.getRow(1);hr.font={bold:true,color:{argb:'FFFFFFFF'}};hr.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF2B4A63'}};hr.alignment={vertical:'middle',horizontal:'center',wrapText:true};hr.height=32;for(let ci=1;ci<=cols.length;ci++)hr.getCell(ci).border={top:{style:'thin',color:{argb:'FFCBD5E1'}},bottom:{style:'medium',color:{argb:'FF718096'}},left:{style:'thin',color:{argb:'FFCBD5E1'}},right:{style:'thin',color:{argb:'FFCBD5E1'}}};
  monthItems.forEach((r,idx)=>{const rec=recurrenceFor(r),last=rec?.latest||{},mh=lastMailFor(r,Number(r.month)||month());const isPct=r.unit==='%';const kpiName = isKo ? (r.kpi||r.kpiEn||'') : (r.kpiEn||r.kpi||'');const row=ws.addRow([plantLabelForFile(),2026,r.month,kpiName,unitForFile(r.unit,isKo),isPct?(typeof r.target==='number'?r.target:null):(r.target??''),isPct?(typeof r.actual==='number'?r.actual:null):(r.actual??''),tags(r,isKo).join(' / '),...(hasReplyHistory?[rec?.isRecurrence?(isKo?`예 (동일사유 x${rec.sameCauseCount})`:`YES (same cause x${rec.sameCauseCount})`):(isKo?'아니오':'NO')]:[]),...(hasPrevious?[last.rootCause||last.reason||'',last.recoveryPlan||'']:[]), '', '', '', '', '']);
    if(isPct){row.getCell(5).numFmt='0.0%';row.getCell(6).numFmt='0.0%'}else{row.getCell(5).numFmt='0.00';row.getCell(6).numFmt='0.00'}
    for(let ci=1;ci<=cols.length;ci++){
      const cell=row.getCell(ci);
      cell.fill={type:'pattern',pattern:'solid',fgColor:{argb:MISS_FILL}};
      cell.border={top:{style:'medium',color:{argb:'FF718096'}},bottom:{style:'thin',color:{argb:'FF9AA7B4'}},left:{style:'thin',color:{argb:'FFCBD5E1'}},right:{style:'thin',color:{argb:'FFCBD5E1'}}};
      cell.alignment={...(cell.alignment||{}),vertical:'top'};
    }
    // 웹 화면의 "7개월 연속 미달성"/"최근 악화" 배지처럼, 심각한 상태는 셀 자체를 굵은 진한
    // 빨강 배경+흰 글씨로 강조해서 표에서 바로 눈에 띄게 한다 (그냥 평범한 텍스트면 놓치기 쉬움)
    const statusCell = row.getCell(7);
    const darkStatus = r.streak>=3 || r.trend==='down';
    statusCell.value = statusRich(r,isKo,darkStatus);
    statusCell.alignment = {vertical:'top',wrapText:true};
    row.height = Math.max(26,18*tags(r,isKo).length+8);
    statusCell.fill = {type:'pattern', pattern:'solid', fgColor:{argb:STATUS_FILL}};
    if (darkStatus){
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
function ensureUi(){
  if(window.__HD24_FOLLOWUP_WIRED__)return;
  window.__HD24_FOLLOWUP_WIRED__=true;if($('hd24FollowupPanel'))return;const host=document.querySelector('main')||$('resultCard');if(!host)return;const sec=document.createElement('section');sec.id='hd24FollowupPanel';sec.className='panel';sec.style.marginTop='16px';sec.innerHTML=`<h2 style="display:flex;align-items:center;justify-content:space-between;gap:12px"><span>메일 미리보기 · 회신 이력관리</span><span class="lang-toggle" style="font-size:13px"><button id="hd24LangKo" type="button" class="filt-lang active">한글</button><button id="hd24LangEn" type="button" class="filt-lang">English</button></span></h2><div class="field-row"><label>메일 상태</label><div id="hd24MailStatus">분석 후 관리대상 메일 Preview가 자동 준비됩니다.</div></div><div id="hd24Preview" style="display:none;border:1px solid #dde1e6;border-radius:6px;padding:16px;margin:12px 0;background:#fff"><div><b>To</b> <span id="hd24PreviewTo"></span></div><div style="margin-top:6px"><b>CC</b> <span id="hd24PreviewCc"></span></div><div style="margin-top:6px"><b>Subject</b> <span id="hd24PreviewSubject"></span></div><div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap;margin:10px 0"><label for="hd24MailFont">메일 글꼴</label><select id="hd24MailFont" style="min-width:150px"><option value="Malgun Gothic">맑은 고딕</option><option value="Arial">Arial</option><option value="Calibri">Calibri</option><option value="Noto Sans">Noto Sans</option><option value="Times New Roman">Times New Roman</option></select><label for="hd24MailFontSize">글자 크기</label><select id="hd24MailFontSize"><option value="9">9pt</option><option value="10">10pt</option><option value="11" selected>11pt</option><option value="12">12pt</option><option value="14">14pt</option><option value="16">16pt</option><option value="18">18pt</option></select></div><pre id="hd24PreviewBody" style="white-space:pre-wrap;background:#f7f8fa;padding:12px;border-radius:4px;max-height:320px;overflow:auto"></pre><div style="display:flex;align-items:flex-start;gap:12px;flex-wrap:wrap"><div class="actions" style="margin:0"><button id="hd24DownloadReply" class="ghost">회신용 Excel 다운로드</button><button id="hd24SendMail">발송</button></div><div id="hd24SendLog" style="flex:1;min-width:300px;max-height:92px;overflow:auto;border:1px solid #dde1e6;border-radius:6px;background:#f7f8fa;padding:8px 10px;font-size:12px;line-height:1.45;color:#17324d">발송 이력 없음</div></div><p class="hint">Preview 확인 전에는 발송되지 않습니다. 발송 버튼은 설정된 메일 API가 있으면 실제 발송하고 성공 응답 시 발송시점을 기록합니다. API가 없으면 Outlook용 .eml 패키지를 다운로드합니다. 패키지에는 To/CC/제목/본문/회신 Excel 1개가 포함되며, 다운로드된 .eml을 Outlook에서 열어 확인 후 보내기 합니다. 이 경우 HD-24는 실제 발송 완료 여부를 확인하지 않고 ‘Outlook 패키지 다운로드’로 구분 기록합니다.</p></div><hr style="border:none;border-top:1px solid #dde1e6;margin:18px 0"><div class="field-row"><label>회신 파일</label><input type="file" id="hd24ReplyFile" accept=".xlsx,.xlsm"></div><div class="actions"><button id="hd24ImportReply" class="ghost">회신파일 이력 반영</button></div><p class="hint">인도/브라질 영문 회신파일을 업로드하면 사업장 + KPI + 대상월 + 회신차수로 사유/근본원인/만회계획/Owner/완료예정일/차월목표/회신자/회신시점을 누적 저장합니다. 기존 이력은 덮어쓰지 않습니다.</p><div id="hd24HistorySummary" style="margin-top:12px"></div>`;host.appendChild(sec);
const tabs=document.createElement('div');tabs.id='hd24MailTypeTabs';tabs.setAttribute('role','tablist');tabs.style.cssText='display:flex;gap:8px;margin:14px 0;border-bottom:1px solid #cbd5e1';
tabs.innerHTML='<button type="button" id="hd24InitialMailTab" role="tab" aria-selected="true" style="padding:10px 18px;font-weight:700;border-bottom:3px solid #185b88">최초 발송메일</button><button type="button" id="hd24ReminderMailTab" role="tab" aria-selected="false" style="padding:10px 18px;font-weight:700">리마인드 메일 [D+7 경과]</button>';
const initial=document.createElement('div');initial.id='hd24InitialMailContent';initial.setAttribute('role','tabpanel');
const reminder=document.createElement('div');reminder.id='hd24ReminderMailContent';reminder.setAttribute('role','tabpanel');reminder.hidden=true;reminder.style.display='none';
reminder.innerHTML='<h3 style="margin:8px 0">D+7 미회신 리마인드</h3><p class="hint">최초 메일 발송 후 7일이 경과했으나 회신 결과가 업로드되지 않은 건을 표시합니다. D+7 대상은 자동 감지되지만 실제 발송은 리마인드 탭의 발송 버튼을 눌러야 실행됩니다.</p><div id="hd24ReminderMailList">대상 확인 중...</div>';
const heading=sec.firstElementChild;heading.after(tabs);while(tabs.nextSibling)initial.appendChild(tabs.nextSibling);sec.append(initial,reminder);
// Reply upload/history is a separate top-level tab, independent of KPI analysis and mail composition.
const replyPanel=document.createElement('section');replyPanel.id='hd24ReplyPanel';replyPanel.className='panel hd24-tab-hidden';replyPanel.style.marginTop='16px';
replyPanel.innerHTML='<h2>회신 이력 반영</h2><p class="hint">해외사업장 회신 Excel을 바로 등록합니다. 최초 KPI 파일 재업로드는 필요하지 않습니다.</p>';
const replyRow=$('hd24ReplyFile')?.closest('.field-row');
if(replyRow){const separator=replyRow.previousElementSibling;if(separator?.tagName==='HR')separator.remove();while(replyRow.nextSibling)replyPanel.appendChild(replyRow.nextSibling);replyPanel.insertBefore(replyRow,replyPanel.children[2]||null);}
sec.after(replyPanel);
function selectMailType(which){const isReminder=which==='reminder';initial.hidden=isReminder;initial.style.display=isReminder?'none':'';reminder.hidden=!isReminder;reminder.style.display=isReminder?'':'none';for(const [id,active] of [['hd24InitialMailTab',!isReminder],['hd24ReminderMailTab',isReminder]]){const btn=$(id);btn.setAttribute('aria-selected',String(active));btn.style.borderBottom=active?'3px solid #185b88':'3px solid transparent';}if(isReminder)window.hd24SevenDayReminder?.render?.();}
$('hd24InitialMailTab').addEventListener('click',()=>selectMailType('initial'));$('hd24ReminderMailTab').addEventListener('click',()=>selectMailType('reminder'));
try{const font=localStorage.getItem(MAIL_FONT_KEY),size=localStorage.getItem(MAIL_SIZE_KEY);if(MAIL_FONTS.includes(font))$('hd24MailFont').value=font;if([9,10,11,12,14,16,18].includes(Number(size)))$('hd24MailFontSize').value=size}catch(_){}['hd24MailFont','hd24MailFontSize'].forEach(id=>$(id)?.addEventListener('change',applyMailStyle));applyMailStyle();wireUi();}
function renderSendLog(){const el=$('hd24SendLog');if(!el)return;const raw=load(MAIL_KEY).filter(x=>x.plant===pkey()&&(x.status==='sent'||x.status==='send-failed'||x.status==='outlook-package-downloaded'));const seen=new Set(),rows=[];for(const x of raw){const t=x.sentAt||x.failedAt||x.mailOpenedAt||x.preparedAt||'',k=[x.status,t,x.to||'',x.cc||'',x.error||''].join('|');if(seen.has(k))continue;seen.add(k);rows.push(x);if(rows.length>=8)break}el.innerHTML=rows.length?rows.map(x=>{const ok=x.status==='sent',pack=x.status==='outlook-package-downloaded',label=ok?'발송 성공':pack?'Outlook 패키지':'발송 실패',t=x.sentAt||x.failedAt||x.mailOpenedAt||x.preparedAt||'',detail=x.error?' · '+String(x.error).replace(/[<>]/g,''):'',route=(x.to?' · To '+String(x.to).replace(/[<>]/g,''):'')+(x.cc?' · CC '+String(x.cc).replace(/[<>]/g,''):'');return '<div style="padding:3px 0;border-bottom:1px solid #e7eaee"><b>'+label+'</b> · '+(t?new Date(t).toLocaleString():'-')+route+detail+'</div>'}).join(''):'발송 이력 없음'}
function renderPreview(items,mode,preparedAt){const to=$('mailTo')?.value.trim()||'',cc=requiredCc($('mailCc')?.value);if($('mailCc'))$('mailCc').value=cc;previewState={items,mode,to,cc,subject:subject(items),body:body(items),preparedAt:preparedAt||nowIso()};$('hd24Preview').style.display='block';$('hd24PreviewTo').textContent=to||'(recipient not entered)';$('hd24PreviewCc').textContent=cc||'(none)';$('hd24PreviewSubject').textContent=previewState.subject;$('hd24PreviewBody').innerHTML=highlightedMailBody(previewState.body);$('hd24MailStatus').textContent=`Preview ready · ${items.length} KPI(s) · prepared ${new Date(previewState.preparedAt).toLocaleString()}`;logSafe(`메일 미리보기 준비: ${items.length}건`);renderSendLog();}
function interceptMailButton(id,mode){const el=$(id);if(!el)return;el.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();const items=selectItems(mode);if(!items.length){alert('메일 대상 KPI가 없습니다.');return}const preparedAt=nowIso();renderPreview(items,mode,preparedAt);mailHistoryRecord(items,{status:'prepared',preparedAt})},true)}
function mailHistoryRecord(items,extra){const list=load(MAIL_KEY),preparedAt=extra.preparedAt||previewState?.preparedAt||nowIso(),isPrepared=extra.status==='prepared',mode=extra.managedMode||previewState?.mode||'';for(const r of items){const row={plant:pkey(),plantName:pname(),targetMonth:Number(r.month)||month(),kpi:r.kpi||'',kpiEn:r.kpiEn||'',preparedAt,...extra};if(isPrepared){const key=norm(r.kpiEn||r.kpi),t=Date.parse(preparedAt),duplicate=list.some(x=>x.status==='prepared'&&x.plant===row.plant&&Number(x.targetMonth)===Number(row.targetMonth)&&norm(x.kpiEn||x.kpi)===key&&(x.managedMode||'')===mode&&Math.abs(t-Date.parse(x.preparedAt||0))<5000);if(duplicate)continue}list.unshift(row)}save(MAIL_KEY,list.slice(0,3000));}
async function withTimeout(p,ms,label){let t;try{return await Promise.race([p,new Promise((_,rej)=>{t=setTimeout(()=>rej(new Error(label+' 시간초과')),ms)})])}finally{clearTimeout(t)}}
async function sendPreview(){if(!previewState)throw new Error('메일 Preview가 준비되지 않았습니다.');const to=$('mailTo')?.value.trim()||previewState.to,cc=requiredCc($('mailCc')?.value.trim()||previewState.cc);if($('mailCc'))$('mailCc').value=cc;if(!to){alert('담당자 이메일을 입력해주세요.');return}previewState.body=body(previewState.items);let file,fname;try{const built=await withTimeout(buildReplyFile(previewState.items),30000,'회신 Excel 생성');file=built.file;fname=built.fname;if(!file||file.size<1000)throw new Error('회신 Excel 파일이 비어 있습니다.');$('hd24MailStatus').textContent=`2/6 회신 Excel 생성 완료 · ${fname} · ${Math.ceil(file.size/1024)} KB`;logSafe(`메일 2/6 Excel 생성 완료: ${fname} · ${file.size} bytes`);}catch(e){throw new Error('2/6 Excel 생성 실패: '+(e?.message||e))}$('hd24MailStatus').textContent='3/6 단일 Excel 첨부 모드 준비 완료';logSafe('메일 3/6 단일 첨부 모드: KPI PNG 첨부 생략 · 회신용 Excel 1개만 사용');const endpoint=(window.HD24_MAIL_ENDPOINT||localStorage.getItem(CONFIG_KEY)||'').trim();if(endpoint){$('hd24MailStatus').textContent='발송 중...';try{const attachmentBase64=await fileToBase64(file);const payload={to,cc,subject:previewState.subject,body:previewState.body,bodyHtml:styledMailHtml(previewState.body),fontFamily:selectedMailStyle().family,fontSizePt:selectedMailStyle().size,plant:pkey(),targetMonth:month(),attachmentName:fname,attachmentBase64:attachmentBase64,attachments:[{name:fname,contentType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',base64:attachmentBase64}]};const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),30000);let res;try{res=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify(payload),signal:controller.signal})}catch(err){if(err?.name==='AbortError')throw new Error('메일 API 응답 시간초과(30초)');throw new Error('메일 API 연결 실패: '+(err?.message||err))}finally{clearTimeout(timer)}let responseText='';try{responseText=await res.text()}catch(_){}if(!res.ok)throw new Error(`HTTP ${res.status}${responseText?' · '+responseText.slice(0,180):''}`);let responseJson=null;try{responseJson=responseText?JSON.parse(responseText):null}catch(_){}if(responseJson&&responseJson.success===false)throw new Error('메일 API 발송 거부: '+(responseJson.error||responseJson.message||'success=false'));const sentAt=nowIso();mailHistoryRecord(previewState.items,{status:'sent',sentAt,to,cc,recipientName:$('mailToName')?.value.trim()||''});$('hd24MailStatus').textContent=`발송 완료 · ${new Date(sentAt).toLocaleString()}`;logSafe(`메일 발송 완료: ${to}`);renderSendLog();return}catch(e){const failedAt=nowIso();mailHistoryRecord(previewState.items,{status:'send-failed',failedAt,error:e.message});$('hd24MailStatus').textContent='메일 API 발송 실패: '+e.message;logSafe('메일 API 발송 실패: '+e.message);renderSendLog();return}}
 const openedAt=nowIso();$('hd24MailStatus').textContent='4/6 Outlook EML 패키지 생성 중...';const attachments=[{name:fname,contentType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',base64:await fileToBase64(file)}],eml=buildOutlookEml({to,cc,subject:previewState.subject,body:previewState.body,attachments}),emlName=`HDPS_KPI_${pname()}_${String(month()).padStart(2,'0')}M_Outlook.eml`,emlFile=new File([eml],emlName,{type:'message/rfc822'});if(!eml.includes('X-Unsent: 1')||!eml.includes('Content-Disposition: attachment')||emlFile.size<1000)throw new Error('4/6 Outlook EML 패키지 검증 실패');$('hd24MailStatus').textContent=`4/6 Outlook EML 생성 완료 · ${attachments.length}개 첨부 · ${Math.ceil(emlFile.size/1024)} KB`;logSafe(`메일 4/6 EML 생성 완료: ${emlName} · ${emlFile.size} bytes`);$('hd24MailStatus').textContent='5/6 Outlook EML 다운로드 시작...';const dl=downloadFile(emlFile);$('hd24MailStatus').textContent=`5/6 Outlook EML 다운로드 요청 완료 · ${dl.name} · ${Math.ceil(dl.size/1024)} KB · 다운로드 폴더에서 파일을 열어주세요`;logSafe(`메일 5/6 EML 다운로드 요청 완료: ${dl.name} · ${dl.size} bytes`);mailHistoryRecord(previewState.items,{status:'outlook-package-downloaded',mailOpenedAt:openedAt,to,cc,recipientName:$('mailToName')?.value.trim()||''});$('hd24MailStatus').textContent=`Outlook 메일 패키지 다운로드 완료 · ${attachments.length}개 첨부 포함 · 다운로드된 .eml을 열어 확인 후 보내기`;logSafe(`Outlook EML 패키지 생성: ${emlName} · 첨부 ${attachments.length}개`);renderSendLog();}
function mimeB64Text(v){return btoa(unescape(encodeURIComponent(String(v??''))))}
function mimeLines(v){return String(v||'').replace(/\s+/g,'').match(/.{1,76}/g)?.join('\r\n')||''}
function safeHeader(v){return String(v??'').replace(/[\r\n]+/g,' ').trim()}
function asciiFileName(v){return safeHeader(v).replace(/[^\x20-\x7E]/g,'_').replace(/["\\]/g,'_')||'attachment.bin'}
function rfc5987(v){return encodeURIComponent(safeHeader(v)).replace(/['()*]/g,c=>'%'+c.charCodeAt(0).toString(16).toUpperCase())}
const MAIL_FONT_KEY='hd24_mail_font_v1',MAIL_SIZE_KEY='hd24_mail_size_v1';
const MAIL_FONTS=['Malgun Gothic','Arial','Calibri','Noto Sans','Times New Roman'];
function selectedMailStyle(){const raw=$('hd24MailFont')?.value||localStorage.getItem(MAIL_FONT_KEY)||'Malgun Gothic';const family=MAIL_FONTS.includes(raw)?raw:'Malgun Gothic';const n=Number($('hd24MailFontSize')?.value||localStorage.getItem(MAIL_SIZE_KEY)||11);return {family,size:[9,10,11,12,14,16,18].includes(n)?n:11}}
function applyMailStyle(){const s=selectedMailStyle(),p=$('hd24PreviewBody');if(p){p.style.fontFamily=s.family+', sans-serif';p.style.fontSize=s.size+'pt'}try{localStorage.setItem(MAIL_FONT_KEY,s.family);localStorage.setItem(MAIL_SIZE_KEY,String(s.size))}catch(_){}}
function escapeMailHtml(s){return String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')}
function highlightedMailBody(s){
  const keys=['Dark red:','Target Miss:','Consecutive Miss:','Recurring cause:','No change:','진한 붉은색:','당월 미달:','연속 미달:','동일 사유 반복:','변화 없음:','Reason / Root Cause / Recovery Plan','미달 사유·근본원인·만회대책','Confirm KPI recovery','KPI 실적 회복'];
  const emphasis=v=>'<span style="background-color:#FFF2A8;font-style:italic;font-weight:700;text-decoration:underline;padding:0 2px">'+v+'</span>';
  return String(s).split('\n').map(line=>{
    if(!line)return '<div style="height:10px"></div>';
    let safe=escapeMailHtml(line);
    if(/^Please review the attached .* HDPS KPI results for /.test(line))return '<div style="font-style:italic;line-height:1.5;margin:3px 0">'+safe+'</div>';
    if(/^Summary:/.test(line))return '<div style="font-weight:700;background-color:#FFF2A8;display:inline-block;padding:3px 5px;line-height:1.5;margin:5px 0">'+safe+'</div>';
    if(['STATUS / TREND (Excel):','상태/추세 기준(첨부 Excel):','REQUIRED — please fill in and return the attached file with:','필수 회신 — 첨부 파일에 아래 내용을 작성하여 회신 부탁드립니다:'].includes(line)){
      return '<div style="font-weight:700;color:#193e61;border-bottom:1px solid #cbd5e1;margin-top:10px;margin-bottom:5px">'+safe+'</div>';
    }
    for(const key of keys){const escaped=escapeMailHtml(key);safe=safe.split(escaped).join(emphasis(escaped))}
    return '<div style="line-height:1.45;margin:2px 0">'+safe+'</div>';
  }).join('');
}
function styledMailHtml(s){const style=selectedMailStyle(),family=style.family.replace(/'/g,'&#39;');return '<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body style="font-family:\''+family+'\',sans-serif;font-size:'+style.size+'pt;line-height:1.45;color:#172536;margin:0"><div style="font-family:\''+family+'\',sans-serif;font-size:'+style.size+'pt;white-space:normal">'+highlightedMailBody(s)+'</div></body></html>'}
function buildOutlookEml({to,cc,subject,body,attachments}){cc=requiredCc(cc);const boundary='----=_HD24_'+Date.now().toString(36),alt=boundary+'_alt',lines=['X-Unsent: 1','MIME-Version: 1.0','To: '+safeHeader(to)];if(cc)lines.push('Cc: '+safeHeader(cc));lines.push('Subject: =?UTF-8?B?'+mimeB64Text(subject)+'?=','Content-Type: multipart/mixed; boundary="'+boundary+'"','', '--'+boundary,'Content-Type: multipart/alternative; boundary="'+alt+'"','', '--'+alt,'Content-Type: text/plain; charset="UTF-8"','Content-Transfer-Encoding: base64','',mimeLines(mimeB64Text(body)),'--'+alt,'Content-Type: text/html; charset="UTF-8"','Content-Transfer-Encoding: base64','',mimeLines(mimeB64Text(styledMailHtml(body))),'--'+alt+'--');for(const a of attachments){const n=safeHeader(a.name),fallback=asciiFileName(n),encoded=rfc5987(n);lines.push('--'+boundary,'Content-Type: '+safeHeader(a.contentType||'application/octet-stream')+'; name="'+fallback+'"; name*=UTF-8\'\''+encoded,'Content-Transfer-Encoding: base64','Content-Disposition: attachment; filename="'+fallback+'"; filename*=UTF-8\'\''+encoded,'',mimeLines(a.base64));}lines.push('--'+boundary+'--','');return lines.join('\r\n')}
function fileToBase64(file){return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result).split(',')[1]||'');r.onerror=()=>reject(r.error);r.readAsDataURL(file)})}
function cellText(v){if(v==null)return '';if(typeof v==='object'){if(v.text!=null)return String(v.text);if(v.result!=null)return String(v.result);if(Array.isArray(v.richText))return v.richText.map(x=>x.text||'').join('')}return String(v)}
async function importReply(){const f=$('hd24ReplyFile')?.files?.[0];if(!f){alert('회신 파일을 선택해주세요.');return}if(typeof ExcelJS==='undefined')throw new Error('ExcelJS unavailable');const wb=new ExcelJS.Workbook();await wb.xlsx.load(await f.arrayBuffer());if(!wb.worksheets.length)throw new Error('회신 시트 없음');const list=load(REPLY_KEY),pending=[],receivedAt=nowIso();let added=0;for(const ws of wb.worksheets){const headers={};ws.getRow(1).eachCell((c,i)=>headers[norm(cellText(c.value))]=i);const find=(...names)=>{for(const n of names){const i=headers[norm(n)];if(i)return i}return 0};const cPlant=find('Plant','사업장'),cYear=find('Target Year','대상연도'),cMonth=find('Target Month','대상월'),cKpi=find('KPI','KPI (KR)','KPI (EN)'),cReason=find('Reason for Miss / Deterioration','Reason for Not Achieving','미달성 사유'),cRoot=find('Root Cause','근본원인'),cPlan=find('Recovery / Catch-up Plan','Countermeasure / Due Date','만회대책'),cOwner=find('Action Owner','담당자'),cDue=find('Planned Completion Date','완료예정일'),cNext=find('Next-month Recovery Target','익월 회복목표'),cResp=find('Responder','응답자'),cUnit=find('Unit','단위'),cTarget=find('Target','목표'),cActual=find('Actual','실적'),cStatus=find('Status / Trend','Status','Trend','상태','추세');if(!cPlant)throw new Error(`Plant column not found: ${ws.name}`);if(!cMonth)throw new Error(`Target Month column not found: ${ws.name}`);if(!cKpi)throw new Error(`KPI column not found: ${ws.name}`);if(!cReason&&!cRoot&&!cPlan)throw new Error(`Response columns not found: ${ws.name}`);ws.eachRow((row,rn)=>{if(rn===1)return;const val=i=>i?cellText(row.getCell(i).value).trim():'';const kpiName=val(cKpi),reason=val(cReason),rootCause=val(cRoot),recoveryPlan=val(cPlan);if(!kpiName||!(reason||rootCause||recoveryPlan))return;const rawPlant=val(cPlant).toLowerCase(),plant=rawPlant.includes('brazil')||rawPlant.includes('브라질')?'brazil':rawPlant.includes('india')||rawPlant.includes('인도')?'india':rawPlant.includes('ulsan')||rawPlant.includes('울산')?'ulsan':'';if(!plant){logSafe(`회신 파일 미인식 사업장 차단: ${kpiName} / ${val(cPlant)}`);return;}const rawYear=val(cYear),targetYear=rawYear?Number(rawYear):2026,rawMonth=val(cMonth),targetMonth=Number(rawMonth),key=norm(kpiName);if(!Number.isInteger(targetYear)||targetYear<2026||targetYear>2100){logSafe(`회신 파일 비정상 연도 차단: ${kpiName} / ${rawYear}`);return;}if(!rawMonth||!Number.isInteger(targetMonth)||!(targetMonth>=1&&targetMonth<=12)){logSafe(`회신 파일 비정상 월 차단: ${kpiName} / ${targetMonth}M`);return;}const sameKpi=x=>norm(x.kpiEn||'')===key||norm(x.kpi||'')===key;const prev=list.filter(x=>x.plant===plant&&(Number(x.targetYear)||2026)===targetYear&&x.targetMonth===targetMonth&&sameKpi(x));const sameReply=x=>x.replyFileName===f.name&&String(x.reason||'')===reason&&String(x.rootCause||'')===rootCause&&String(x.recoveryPlan||'')===recoveryPlan&&String(x.actionOwner||'')===val(cOwner)&&String(x.plannedCompletionDate||'')===val(cDue);const duplicate=prev.some(sameReply)||pending.some(x=>x.plant===plant&&(Number(x.targetYear)||2026)===targetYear&&x.targetMonth===targetMonth&&sameKpi(x)&&sameReply(x));if(duplicate){logSafe(`동일 회신 재Import 차단: ${plant} / ${targetMonth}M / ${kpiName} / ${f.name}`);return;}const mail=load(MAIL_KEY).filter(x=>x.plant===plant&&(Number(x.targetYear)||2026)===targetYear&&x.targetMonth===targetMonth&&sameKpi(x)).sort((a,b)=>String(b.sentAt||b.mailOpenedAt||b.preparedAt||'').localeCompare(String(a.sentAt||a.mailOpenedAt||a.preparedAt||'')))[0]||{};const storedKpi=mail.kpi||kpiName,storedKpiEn=mail.kpiEn||kpiName;const direction=(()=>{try{return window.HD24RuleMatrix?.direction?.({kpi:storedKpi,kpiEn:storedKpiEn,unit:val(cUnit),target:val(cTarget),actual:val(cActual)})||''}catch(_){return''}})();pending.push({plant,targetYear,targetMonth,kpi:storedKpi,kpiEn:storedKpiEn,direction,unit:val(cUnit),target:val(cTarget),actual:val(cActual),statusTrend:val(cStatus),reason,rootCause,recoveryPlan,actionOwner:val(cOwner),plannedCompletionDate:val(cDue),nextMonthRecoveryTarget:val(cNext),responder:val(cResp),replyReceivedAt:receivedAt,replyFileName:f.name,replySequence:prev.length+pending.filter(y=>y.plant===plant&&(Number(y.targetYear)||2026)===targetYear&&y.targetMonth===targetMonth&&sameKpi(y)).length+1,lastMailPreparedAt:mail.preparedAt||'',lastMailSentAt:mail.sentAt||'',lastMailOpenedAt:mail.mailOpenedAt||'',lastMailStatus:mail.status||''});added++});}list.unshift(...pending.reverse());save(REPLY_KEY,list.slice(0,4000));if(typeof invalidateReplyHistoryCache==='function')invalidateReplyHistoryCache();$('hd24HistorySummary').textContent=`회신 이력 반영 완료: ${added} KPI · 회신 수신시점 ${new Date(receivedAt).toLocaleString()} · ${f.name}`;logSafe(`회신 파일 이력 반영: ${added}건 / ${f.name}`);document.dispatchEvent(new CustomEvent('hd24:reply-imported',{detail:{added,fileName:f.name,receivedAt}}));}
function uploadSignature(){const a=$('srcFile')?.files?.[0],b=$('masterFile')?.files?.[0];if(!b)return '';if(!a)return [pkey(),'(no-src)',b.name,b.size,b.lastModified].join('|');return [pkey(),a.name,a.size,a.lastModified,b.name,b.size,b.lastModified].join('|')}
async function tryAutoPackage(reason){if(window.hd24FollowupSyncOwnsAutoPackage){if(!legacyAutoSuppressedLogged){legacyAutoSuppressedLogged=true;logSafe('레거시 자동패키지 비활성화: follow-up sync가 단일 오케스트레이터로 실행');}return}const sig=uploadSignature(),judge=$('btnJudge');if(!sig||sig===lastAutoPackageSignature||!judge||judge.disabled)return;lastAutoPackageSignature=sig;try{logSafe(`자동분석 시작: ${reason}`);judge.click();await new Promise(r=>setTimeout(r,80));const items=selectItems('watch');if(!items.length){$('hd24MailStatus').textContent='자동분석 완료 · 메일 관리대상 KPI 없음';logSafe('자동분석 완료: 관리대상 KPI 없음');return}const preparedAt=nowIso();renderPreview(items,'watch',preparedAt);mailHistoryRecord(items,{status:'prepared',preparedAt,autoPrepared:true});$('hd24MailStatus').textContent=`자동분석/메일 Preview 준비 완료 · ${items.length} KPI`;logSafe(`자동 메일 Preview 준비: ${items.length}건 · 회신 Excel은 메일 발송 또는 수동 다운로드 시에만 생성`)}catch(e){lastAutoPackageSignature='';logSafe('자동분석 패키지 오류: '+(e?.message||e))}}
function scheduleAutoPackage(reason){if(!uploadSignature())return;[0,1000].forEach(ms=>setTimeout(()=>{if(uploadSignature())tryAutoPackage(reason)},ms))}
// Legacy index.html mail fallback can hand its selected KPI set into the managed Preview.
// This keeps one visible Preview/send path and prevents any unsolicited download/mailto behavior.
window.hd24PrepareFollowupPreview = function(items, mode){
  const safeItems = Array.isArray(items) ? items.filter(Boolean) : [];
  if (!safeItems.length) {
    if ($('hd24Preview')) $('hd24Preview').style.display='none';
    if ($('hd24MailStatus')) $('hd24MailStatus').textContent='메일 Preview 대상 KPI가 없습니다.';
    logSafe('통합 메일 Preview 준비 생략: 대상 KPI 없음');
    return false;
  }
  const preparedAt=nowIso(),safeMode=['month','watch','all'].includes(mode)?mode:'watch';
  renderPreview(safeItems,safeMode,preparedAt);
  mailHistoryRecord(safeItems,{status:'prepared',preparedAt,managedFallback:true,managedMode:safeMode});
  if (window.hd24SwitchTab) window.hd24SwitchTab('mail');
  $('hd24FollowupPanel')?.scrollIntoView({behavior:'smooth',block:'start'});
  logSafe(\`통합 메일 Preview 연결 완료: \${safeItems.length}건\`);
  return true;
};
// 메일 발송 대상 월 체크박스가 바뀌었을 때(자동패키지의 파일서명 기준 중복방지 가드에
// 걸리지 않고) 미리보기를 즉시 다시 계산하기 위해 index.html에서 호출하는 훅.
window.hd24RefreshMailPreview = function(){
  const mode = previewState ? previewState.mode : 'watch';
  const items = selectItems(mode);
  if (items.length) renderPreview(items, mode, nowIso());
  else { $('hd24Preview').style.display='none'; $('hd24MailStatus').textContent='선택한 달에 해당하는 관리대상 KPI가 없습니다.'; }
};
function wireUi(){interceptMailButton('btnMailMonth','month');interceptMailButton('btnMailWatch','watch');interceptMailButton('btnMailAll','all');$('hd24DownloadReply')?.addEventListener('click',async()=>{if(!previewState)return;downloadFile((await buildReplyFile(previewState.items)).file)});$('hd24SendMail')?.addEventListener('click',()=>{const btn=$('hd24SendMail'),status=$('hd24MailStatus');if(btn?.disabled)return;logSafe('메일 발송 버튼 클릭 감지 → sendPreview 실행');if(btn){btn.disabled=true;btn.textContent='메일 준비 중...'}if(status)status.textContent='1/6 메일 패키지 준비 시작...';Promise.resolve().then(()=>sendPreview()).catch(e=>{if(status)status.textContent='메일 패키지 생성 실패: '+(e?.message||e);logSafe('메일 발송 버튼 처리 오류: '+(e?.stack||e?.message||e));alert('메일 패키지 생성 실패: '+(e?.message||e));}).finally(()=>{if(btn){btn.disabled=false;btn.textContent='발송'}})});$('hd24ImportReply')?.addEventListener('click',()=>importReply().catch(e=>{alert(e.message);logSafe('회신 파일 반영 오류: '+e.message)}));
  function switchLang(lang){try{if(typeof setLang==='function')setLang(lang);else currentLang=lang}catch(_){currentLang=lang}$('hd24LangKo')?.classList.toggle('active',lang==='ko');$('hd24LangEn')?.classList.toggle('active',lang==='en');if(previewState)renderPreview(previewState.items,previewState.mode,previewState.preparedAt)}
  $('hd24LangKo')?.addEventListener('click',()=>switchLang('ko'));
  $('hd24LangEn')?.addEventListener('click',()=>switchLang('en'));
  try{$('hd24LangKo')?.classList.toggle('active',(typeof currentLang==='undefined'?'ko':currentLang)==='ko');$('hd24LangEn')?.classList.toggle('active',currentLang==='en')}catch(_){}
  $('hd24ReplyFile')?.addEventListener('change',()=>{if($('hd24ReplyFile')?.files?.[0])importReply().catch(e=>{logSafe('회신 파일 자동 반영 오류: '+e.message)})});['srcFile','masterFile','plantSelect'].forEach(id=>$(id)?.addEventListener('change',()=>{lastAutoPackageSignature='';scheduleAutoPackage(id+' change')}));const judge=$('btnJudge');if(judge)new MutationObserver(()=>scheduleAutoPackage('analysis ready')).observe(judge,{attributes:true,attributeFilter:['disabled']});scheduleAutoPackage('startup')}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ensureUi,{once:true});else ensureUi();
})();