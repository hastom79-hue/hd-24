(()=>{'use strict';
const KEY='hd24_kpi_reply_history_v2',get=id=>document.getElementById(id);
let lang='ko',drafts={ko:'',en:''},draftKey='',demo=false,lastExportKey='',latestFeedbackAttachment=null;const SEND_LOG='hd24_reply_feedback_mail_v1';
const fields=[['reason','미달성 사유','Reason'],['rootCause','근본원인','Root cause'],['recoveryPlan','만회계획','Recovery plan'],['actionOwner','담당자','Action owner'],['plannedCompletionDate','완료예정일','Due date']];
const optionalFields=[['nextMonthRecoveryTarget','차월 회복목표','Next-month target']];
const txt=v=>String(v??'').trim(), esc=s=>txt(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const kpiKey=r=>txt(r?.kpiEn||r?.kpi).toLowerCase();
const sameKpi=(a,b)=>{if(!txt(a?.plant)||!txt(b?.plant)||txt(a.plant).toLowerCase()!==txt(b.plant).toLowerCase())return false;const keys=r=>[txt(r?.kpiEn).toLowerCase(),txt(r?.kpi).toLowerCase()].filter(Boolean);const A=keys(a),B=keys(b);return A.some(x=>B.includes(x))};
function requiredFeedbackCc(value){const seen=new Set();return String(value||'').split(/[;,\\s]+/).map(v=>v.trim()).filter(v=>/^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$/.test(v)).filter(v=>{const k=v.toLowerCase();if(seen.has(k))return false;seen.add(k);return true}).join('; ')}
const safeHeader=v=>txt(v).replace(/[\r\n]+/g,' ');
const mimeB64Text=v=>btoa(unescape(encodeURIComponent(txt(v))));
const mimeLines=v=>txt(v).match(/.{1,76}/g)?.join('\r\n')||'';
const asciiFileName=v=>safeHeader(v).replace(/[^A-Za-z0-9._-]+/g,'_')||'attachment.xlsx';
const rfc5987=v=>encodeURIComponent(safeHeader(v)).replace(/['()]/g,escape);
function feedbackEml({to,cc,subject,body,attachment,images=[]}){const boundary='----=_HD24_REPLY_'+Date.now().toString(36),related=boundary+'_related',alt=boundary+'_alternative',lines=['X-Unsent: 1','MIME-Version: 1.0','To: '+safeHeader(to)];if(cc)lines.push('Cc: '+safeHeader(cc));lines.push('Subject: =?UTF-8?B?'+mimeB64Text(subject)+'?=','Content-Type: multipart/mixed; boundary="'+boundary+'"','','--'+boundary,'Content-Type: multipart/related; boundary="'+related+'"; type="multipart/alternative"','','--'+related,'Content-Type: multipart/alternative; boundary="'+alt+'"','','--'+alt,'Content-Type: text/plain; charset="UTF-8"','Content-Transfer-Encoding: base64','',mimeLines(mimeB64Text(body)),'--'+alt,'Content-Type: text/html; charset="UTF-8"','Content-Transfer-Encoding: base64','',mimeLines(mimeB64Text(dashboardHtml(body,images))),'--'+alt+'--');images.forEach(img=>lines.push('--'+related,'Content-Type: image/png; name="'+asciiFileName(img.filename)+'"','Content-Transfer-Encoding: base64','Content-Disposition: inline; filename="'+asciiFileName(img.filename)+'"','Content-ID: <'+img.cid+'>','Content-Location: '+asciiFileName(img.filename),'',mimeLines(img.base64)));lines.push('--'+related+'--');const fallback=asciiFileName(attachment.filename),encoded=rfc5987(attachment.filename);lines.push('--'+boundary,'Content-Type: '+safeHeader(attachment.mimeType||'application/octet-stream')+'; name="'+fallback+'"; name*=UTF-8\'\''+encoded,'Content-Transfer-Encoding: base64','Content-Disposition: attachment; filename="'+fallback+'"; filename*=UTF-8\'\''+encoded,'',mimeLines(attachment.base64),'--'+boundary+'--','');return lines.join('\r\n')}
const HD24_CAPTURE_TRANSLATIONS=[
 ['를 나타냅니다','These figures represent'],['을 나타냅니다','These figures represent'],['를',''],['을',''],['입니다',''],['됩니다',''],['합니다',''],
 ['나타냅니다','represent'],['검증 대상','items reviewed'],
 ['월 연속 동일','consecutive months with the same'],
 ['개월 연속 동일','consecutive months with the same'],
 ['동일 사유','same reason'],['동일 근인','same root cause'],
 ['제거 효과','elimination effectiveness'],['제거','elimination'],
 ['효과','effectiveness'],['근인','root cause'],['사유','reason'],
 ['연속','consecutive'],['개월','months'],['검토','review'],
 ['대상','target'],['충분','Complete'],['핵심','key'],['정보','information'],
 ['전월','previous month'],['당월','current month'],['회신','reply'],
 ['분석','analysis'],['품질','quality'],['기한','due date'],['실행','execution'],
 ['관리','management'],['목표','target'],['달성','achieved'],['미달','missed'],
 ['확인','verify'],['필요','required'],['대책','action'],['반복','repeated'],
 ['지표','metric'],['전체','total'],['건','items']
];
const HD24_CAPTURE_TRANSLATIONS_ORDERED=[...HD24_CAPTURE_TRANSLATIONS].sort((a,b)=>b[0].length-a[0].length);
const HD24_DEEP_FINDING_TRANSLATIONS=[
 ['첨부자료 참조만으로는 원인 검증 불가','Root cause cannot be verified from attachment references alone'],
 ['타 KPI/이전 항목 참조형 회신 — KPI별 독립 근인 필요','Reply refers to another KPI or previous item; provide a specific root cause for this KPI'],
 ['근본원인 NA — 사유→근인 연결 검증 불가','Root cause marked N/A; the link between the reason and root cause cannot be verified'],
 ['반복관리/교육 중심 대책 — 완료조건·정량 효과 불명확','Recurring monitoring or training action lacks clear completion criteria and measurable effectiveness'],
 ['Action Owner 미지정','Action owner not assigned'],['완료예정일 미지정','Due date not specified'],
 ['동일 담당자 3개 기간 이상 완료기한 초과 반복 — 실행관리 및 부하/책임배분 점검 필요','Same owner has overdue actions across three or more periods; review execution control, workload and accountability'],
 ['동일 담당자 완료기한 초과 반복 — 조치 일정관리 점검 필요','Repeated overdue actions by the same owner; review action scheduling'],
 ['완료예정일이 회신 접수시점보다 이전 — 지연조치 상태 확인 필요','Due date predates reply receipt; verify overdue action status'],
 ['개월 연속 동일 사유 반복 — 원인분석 및 제거대책 재설계 필요',' consecutive months with the same reason; redesign root-cause analysis and elimination actions'],
 ['2개월 연속 동일 사유 반복 — 근인 제거 효과 재검증','Same reason repeated for two consecutive months; reverify root-cause elimination effectiveness'],
 ['개월 연속 동일 근본원인 반복 — 근인 제거 실패 가능성 높음',' consecutive months with the same root cause; elimination may have failed'],
 ['2개월 연속 동일 근본원인 반복','Same root cause repeated for two consecutive months'],
 ['개월 연속 동일 만회계획 반복 — 기존 대책 효과 미입증, 대책 재설계 필요',' consecutive months with the same recovery plan; action effectiveness unproven and redesign required'],
 ['2개월 연속 동일 만회계획 반복 — 실행 효과 확인 필요','Same recovery plan repeated for two consecutive months; verify implementation effectiveness'],
 ['전월 미달 후 차월도 미달이며 ','Target missed in consecutive months and '],
 ['근본원인·대책이 모두 반복','both root cause and corrective action were repeated'],
 ['문제해결 논리가 반복','problem-solving rationale was repeated'],
 [' — 기존 대책 효과 미입증',' — effectiveness of previous actions remains unproven'],
 ['전월 미달 후 차월도 미달 — 변경 대책의 실행성과와 추가 근인 확인 필요','Target missed again in the following month; verify revised action results and additional root causes'],
 ['전월 회신의 차월 회복목표 미달 — 약속 대비 실제성과 갭 검증 필요','Next-month recovery target from the prior reply was missed; verify the gap between commitment and actual performance'],
 ['생산귀책/초기 품질 결과는 미달·악화인데 ','Production-attributable or initial quality results missed target or deteriorated, while '],
 ['표준작업 준수 관리지표는 정상/목표 달성','standard work compliance indicators are on target'],
 ['비표준작업 재발지표는 0','nonstandard-work recurrence is zero'],
 ['관련 공정관리 지표는 정상/목표 달성','related process-control indicators are on target'],
 ['입니다. 점검대상·표본·판정기준 및 원인 연결을 교차 검증할 필요','; cross-check inspection scope, samples, criteria and causal linkage'],
 ['WIP 관리 준수율이 미달·악화인데 Cutting-to-Dispatch 제조 리드타임은 목표 달성·단축으로 나타납니다. 이는 곧바로 물리적 재공량 증가를 뜻하지 않습니다. WIP 지표의 단위·산식·측정범위, 실제 재공량과 Throughput, 리드타임의 시작·종료점 및 대상 물동량을 교차 검증할 필요','WIP management compliance missed target or deteriorated while Cutting-to-Dispatch manufacturing lead time met target or improved. This does not necessarily mean physical WIP increased. Cross-check WIP units, formulas and scope, actual WIP volume, throughput, lead-time boundaries and comparable production flow'],
 ['WIP/재공 지표가 미달·악화인데 Cutting-to-Dispatch 제조 리드타임은 목표 달성·단축으로 나타납니다. 이는 곧바로 물리적 재공량 증가를 뜻하지 않습니다. WIP 지표의 단위·산식·측정범위, 실제 재공량과 Throughput, 리드타임의 시작·종료점 및 대상 물동량을 교차 검증할 필요','WIP indicator missed target or deteriorated while Cutting-to-Dispatch manufacturing lead time met target or improved. This does not necessarily mean physical WIP increased. Cross-check WIP units, formulas and scope, actual WIP volume, throughput, lead-time boundaries and comparable production flow'],
 ['WIP/재공은 미달·악화인데 Cutting-to-Dispatch 제조 리드타임은 목표 달성·단축으로 나타납니다. 동일 범위·동일 물동량 기준인지 WIP 정의, Throughput, Lead Time 시작·종료점 및 재공 포함범위를 교차 검증할 필요','WIP missed target or deteriorated while Cutting-to-Dispatch manufacturing lead time met target or improved. Cross-check comparable scope and throughput, WIP definitions, lead-time boundaries and WIP inclusion'],
 ['Equipment Downtime Loss는 미달인데 MTBF는 정상입니다. 고장빈도와 비가동손실 산정범위를 교차 검증할 필요','Equipment downtime loss missed target while MTBF is on target; cross-check failure frequency and downtime-loss calculation scope'],
 ['MTTR/MTTD는 미달인데 Equipment Downtime Loss는 정상입니다. 고장건수·정지시간·탐지/복구 산식 범위를 확인할 필요','MTTR/MTTD missed target while equipment downtime loss is on target; verify failure counts, downtime, and detection/recovery calculation scope'],
 ['특이 검증사항 없음 — 차기 실적 효과 확인','No additional finding; verify effectiveness in next-period results'],
 ['대책 효과검증 미흡','Action Effectiveness Not Verified'],['KPI 간 모순','Cross-KPI Contradictions'],
 ['동일 사유 반복','Repeated Reason'],['동일 근본원인 반복','Repeated Root Cause'],['동일 만회계획 반복','Repeated Recovery Plan'],
 ['하향','Declining'],['상향','Improving']
];
const HD24_DEEP_FINDING_TRANSLATIONS_ORDERED=[...HD24_DEEP_FINDING_TRANSLATIONS].sort((a,b)=>b[0].length-a[0].length);
const HD24_DETAIL_TRANSLATIONS=[
 ['사유 · Root Cause · Recovery Plan · 담당/기한 · 보완요청을 KPI 단위로 확인','Review reasons, root causes, recovery plans, owners, due dates, and follow-up requests by KPI'],
 ['필수정보','Required Fields'],['회신 차수','Reply Round'],['회신','Reply'],
 ['담당/기한','Owner / Due Date'],['보완요청','Follow-up Request'],
 ['미달성 사유','Reason for Missing Target'],['근본원인','Root Cause'],
 ['만회계획','Recovery Plan'],['담당자','Action Owner'],
 ['완료예정일','Due Date'],['차월 회복목표','Next-Month Recovery Target'],
 ['검토 포인트','Review Findings'],['미기재','Not Provided'],
 ['필수 항목 기재 확인. 차기 실적에서 개선효과 검증 필요','Required fields are present. Verify corrective-action effectiveness against next-period results.'],
 ['필수 항목 기재 확인','Required fields are present'],
 ['차기 실적에서 개선효과 검증 필요','Verify corrective-action effectiveness against next-period results'],
 ['② KPI별 상세분석','② KPI-Level Detailed Analysis'],
 ['KPI별 검증 결과 · 문제 근거 · 필요한 보완조치 · 후속 확인사항을 확인합니다.','Review KPI-level validation findings, supporting evidence, required corrective actions, and follow-up checks.'],
 ['KPI별 검증결과','KPI validation findings'],['클릭하여 상세 확인','Click to review details'],
 ['사유 · 근본원인 · 만회계획 · 담당/기한 · 보완요청을 KPI 단위로 확인','Review reasons, root causes, recovery plans, owners, due dates, and follow-up requests by KPI'],
 ['회신 분석 완료 시 피드백 Excel 1개를 메일 첨부용으로 자동 생성합니다. 브라우저 다운로드는 실행하지 않습니다.','Once reply analysis is complete, one feedback Excel workbook is automatically prepared for email attachment. No browser download is initiated.'],
 ['KPI별 핵심 회신내용과 보완 필요사항을 확인합니다.','Review key reply information and required follow-up for each KPI.'],
 ['KPI별 상세분석 펼쳐보기 · 필요 시에만 확인','Expand KPI-Level Details · Open Only When Needed'],
 ['※ 기본 화면은 대시보드 중심으로 유지하고, KPI 상세는 접힌 상태에서 필요할 때만 펼쳐 내부 스크롤로 확인합니다.','Note: The dashboard remains the default view. Expand KPI details only when needed and scroll within the detail panel.'],
 ['샘플 분석 · 실제 회신 이력과 무관하며 저장·발송되지 않습니다.','Sample analysis only · Not related to actual reply history and not saved or sent.'],
 ['상단은 관리자가 즉시 판단할 핵심 신호만 요약하고, KPI별 회신 내용은 아래 상세분석 영역에서 분리해 확인합니다.','The top dashboard summarizes management signals. KPI-level reply findings are reviewed separately below.'],
 ['회신 상세분석 대시보드','Reply Detailed Analysis Dashboard']
];
const HD24_DETAIL_TRANSLATIONS_ORDERED=[...HD24_DETAIL_TRANSLATIONS].sort((a,b)=>b[0].length-a[0].length);
const HD24_DASHBOARD_TRANSLATIONS=[
 ['현재 선택 분석기간에 회신 검토 대상이 된 KPI 수','Number of KPIs reviewed during the selected analysis period'],
 ['핵심 회신정보가 갖춰지고 내용 품질·반복성·실행관리 검토에서도 추가 보완신호가 없는 KPI 수','Number of KPIs with complete reply information and no additional gaps in quality, recurrence, or execution management'],
 ['핵심정보는 대체로 갖췄으나 단일 필수항목 누락, 근인·대책 구체성 부족, 반복성 등 보완신호가 있는 KPI 수','Number of KPIs requiring follow-up due to a missing required field, insufficient root-cause or action detail, or recurring issues'],
 ['근인·대책·담당·기한 중 핵심항목 2개 이상 누락 또는 필수정보 67% 미만인 KPI 수. 반복근인·대책정체는 단독으로 중점보완을 만들지 않고 별도 실행관리 신호로 관리','Number of KPIs missing at least two key fields (root cause, action, owner, or due date), or with under 67% required information. Repeated causes and stagnant actions are monitored separately'],
 ['최초 회신파일 반영 시','On the first reply import'],
 ['으로 표시하고, 실제 재회신(replySequence 2 이상)부터 직전 회신과 비교 가능한 KPI를 OO건으로 표시','is shown. Comparison against the previous reply starts only from actual resubmissions (replySequence 2 or higher)'],
 ['전월 대비 동일 근본원인이 반복되어 근인 제거효과 재검증이 필요한 KPI 수','Number of KPIs with recurring root causes requiring verification of corrective effectiveness'],
 ['전월 대비 동일 만회대책이 반복되어 실행효과 확인이 필요한 KPI 수','Number of KPIs with repeated recovery actions requiring effectiveness checks'],
 ['완료예정일이 경과했으나 완료가 확인되지 않은 KPI 수','Number of KPIs past their due date without confirmed completion'],
 ['조치 결과·효과 검증 또는 차기 반영에 대한 회고가 부족한 KPI 수','Number of KPIs lacking review of action results, effectiveness, or carryover to the next period'],
 ['※ 품질등급 검산:','Quality classification reconciliation:'],
 ['정상','Balanced'],['집계 오류','Counting discrepancy'],
 ['각 숫자는 KPI 달성/미달 건수가 아니라','These figures do not represent KPI achievement or misses; they indicate'],
 ['회신 품질 및 실행관리 상태','reply quality and execution-management status'],
 ['관리 해석','Management Interpretation'],
 ['반복 원인, 동일 대책 정체, 기한 경과, 활동결과 회고 부족을 우선 관리합니다. 추가 자료는 판단에 필요한 최소 범위만 요청합니다.','Prioritize recurring causes, stagnant corrective actions, overdue commitments, and insufficient review of action results. Request only the minimum additional evidence needed for a decision.'],
 ['충분','Complete'],['보완 필요','Review Needed'],['중점 보완','Priority Review'],
 ['달성 여부와 별개로 전월→당월 동일 KPI 반복, 회신 품질, 조치 효과, KPI 간 논리 정합성을 검증합니다.','Independently of target achievement, this review checks recurring KPIs across months, reply quality, corrective-action effectiveness, and logical consistency across KPIs.'],
 ['전체 검증이슈','Total Validation Findings'],
 ['대책 효과검증 미흡','Action Effectiveness Not Verified'],
 ['전월 동일 사유','Repeated Reason from Previous Month'],
 ['전월 동일 근인','Repeated Root Cause from Previous Month'],
 ['전월 동일 대책','Repeated Action Plan from Previous Month'],
 ['판정 범례 · 집계 기준','Assessment Legend and Counting Rules'],
 ['근본원인/실행책임/회복약속 등 핵심 관리조건이 누락되거나 반복 실패하여 우선 확인이 필요한 이슈','Issues requiring priority review because critical management conditions (root cause, action ownership, or recovery commitment) are missing or repeated failures persist'],
 ['즉시 중대 오류는 아니나 원인·대책의 구체성 또는 실행효과 확인이 추가로 필요한 이슈','Issues requiring further confirmation of root-cause specificity, corrective-action detail, or execution results, although not immediately critical'],
 ['전월 미달/회신 이후 차월 실적에서도 개선이 확인되지 않거나 약속한 회복목표가 달성되지 않아 PDCA가 닫히지 않은 건','Cases where subsequent performance did not improve or the committed recovery target was missed, leaving the PDCA loop open'],
 ['서로 연관된 KPI의 실적·회신 논리가 동시에 성립하기 어려워 교차 확인이 필요한 건','Cases requiring cross-checks because related KPI results and reply explanations appear logically inconsistent'],
 ['동일 KPI에서 전월과 같은 미달 사유가 연속 반복된 건','Cases where the same reason for missing the target recurs for the same KPI in consecutive months'],
 ['동일 KPI에서 같은 근본원인이 반복되어 근인 제거 효과를 재검증해야 하는 건','Cases where the same root cause recurs for the same KPI and the effectiveness of root-cause elimination needs verification'],
 ['동일 KPI에서 같은 만회계획이 반복되어 기존 대책의 실행·효과 확인이 필요한 건','Cases where the same recovery plan recurs for the same KPI and its implementation and effectiveness require verification'],
 ['HIGH/MEDIUM 심층검증 + 폐루프 + KPI 교차검증에서 탐지된 전체 경고 건수','Total findings from HIGH/MEDIUM deep checks, open-loop checks, and cross-KPI consistency checks'],
 ['※ HIGH/MEDIUM은 KPI 달성·미달 자체의 등급이 아니라','Note: HIGH/MEDIUM does not rate KPI achievement; it indicates'],
 ['회신 및 문제해결 관리상 검증 우선순위','review priority for reply quality and problem-solving management'],
 ['검증이슈 상세목록 펼쳐보기 · 필요 시에만 확인','Expand Detailed Validation Findings · Open When Needed'],
 ['심층 분석 Excel 추출','Export Deep Analysis to Excel'],
 ['클릭하여 상세그리드 보기','Click to view the detail grid'],
 ['회신 품질 및 실행관리 핵심 신호','Reply Quality and Execution Management'],['상세내용은 아래 KPI별 분석에서 확인','See KPI-level analysis below'],['분석 KPI','KPIs Reviewed'],['충분 · 추가보완 없음','Complete · No Follow-up'],['보완 필요 · 단일/경미 결함','Review Needed · Minor Gap'],['중점 보완 · 복합/핵심 결함','Priority Review · Critical Gap'],['이전 회신 비교','Previous Reply Comparison'],['최초 시행','First Review'],['전월 반복 근인','Repeated Root Causes'],['전월 대책 정체','Stagnant Actions'],['기한 초과','Overdue Actions'],['회고 취약','Retrospective Gaps'],['지표 범례 · 집계 의미','Metric Definitions'],['실적 × 회신 심층 검증','Performance × Reply Deep Validation'],['달성 여부','Achievement Status'],['동일 KPI 반복','Repeated KPI'],['회신 품질','Reply Quality'],['조치 효과','Action Effectiveness'],['KPI 간 논리적 모순','Cross-KPI Contradictions'],['KPI 간 모순','Cross-KPI Contradictions'],['상세그리드','Detail Grid'],['상세 사유','Detailed Finding'],['미달성 사유','Reason for Miss'],['근본원인','Root Cause'],['만회계획','Recovery Plan'],['완료예정일','Due Date'],['담당자','Action Owner'],['회신차수','Reply Sequence'],['사업장','Plant'],['연도·월','Year / Month'],['관련 KPI','Related KPI'],['탐지유형','Detection Type'],['등급','Severity'],['대책','Action'],['회신','Reply'],['심층 검증','Deep Validation'],['반복','Repeated'],['미흡','Insufficient'],['위험','Risk'],['높음','High'],['중간','Medium'],['닫기','Close']
];
const HD24_EXEC_LEGEND_EN=[
 'Number of KPIs reviewed during the selected analysis period',
 'Number of KPIs with complete reply information and no additional gaps in quality, recurrence, or execution management',
 'Number of KPIs requiring follow-up due to missing mandatory information, insufficient root-cause or action specificity, or recurring issues',
 'Number of KPIs missing two or more essential fields (root cause, action, owner, due date), or having under 67% of mandatory information. Recurring causes and stagnant actions are monitored separately',
 'On the first reply import, show [First Review]. Compare with previous replies only for actual resubmissions (replySequence ≥ 2)',
 'Number of KPIs with recurring root causes requiring verification of root-cause elimination',
 'Number of KPIs with repeated recovery actions requiring verification of implementation effectiveness',
 'Number of KPIs with overdue due dates and no confirmed completion',
 'Number of KPIs lacking retrospective review of action results, effectiveness, or next-period follow-through'
];
const HD24_DEEP_LEGEND_EN=[
 ['HIGH','Critical management requirements (root cause, accountable owner, or recovery commitment) are missing, or repeated failure requires priority review.'],
 ['MEDIUM','Further verification of root-cause specificity, corrective-action detail, or effectiveness is required; no immediately critical error has been established.'],
 ['Action Effectiveness Not Verified','Performance has not improved after the previous reply, or the committed recovery target was missed, leaving the PDCA cycle open.'],
 ['Cross-KPI Contradictions','Related KPI results and reply explanations may be inconsistent; cross-validation is required.'],
 ['Repeated Reason from Previous Month','The same reason for missing the target recurs for the same KPI across consecutive months.'],
 ['Repeated Root Cause from Previous Month','The same root cause recurs for the same KPI; verify whether root-cause elimination was effective.'],
 ['Repeated Action Plan from Previous Month','The same recovery plan recurs for the same KPI; verify implementation and effectiveness.'],
 ['Total Validation Findings','Total warnings detected by HIGH/MEDIUM deep validation, open-loop checks, and cross-KPI consistency checks.']
];
function translateDeepLegend(root,lang){
 // Use the stable legend grid structure, not translated title text or prior text-node state.
 const grid=[...root.querySelectorAll('div[style*="grid-template-columns"]')]
  .find(el=>el.children.length===8&&el.children[0]?.textContent.includes('HIGH'));
 if(!grid)return;
 const panel=grid.parentElement;
 const cells=[...grid.children];
 const title=panel?.firstElementChild;
 if(title){if(!title.dataset.hd24KoHtml)title.dataset.hd24KoHtml=title.innerHTML;
  if(lang==='en')title.textContent='Assessment Legend and Counting Rules';
  else title.innerHTML=title.dataset.hd24KoHtml;
 }
 cells.forEach((cell,i)=>{
  if(!cell.dataset.hd24KoHtml)cell.dataset.hd24KoHtml=cell.innerHTML;
  if(lang==='en')cell.textContent=HD24_DEEP_LEGEND_EN[i][0]+' · '+HD24_DEEP_LEGEND_EN[i][1];
  else cell.innerHTML=cell.dataset.hd24KoHtml;
 });
 const foot=grid.nextElementSibling;
 if(foot){if(!foot.dataset.hd24KoHtml)foot.dataset.hd24KoHtml=foot.innerHTML;
  if(lang==='en')foot.textContent='Note: HIGH and MEDIUM indicate validation priority for reply quality and problem-solving management, not KPI target achievement.';
  else foot.innerHTML=foot.dataset.hd24KoHtml;
 }
 if(lang==='en'){
  const heading=root.querySelector('h3');
  if(heading){if(!heading.dataset.hd24KoText)heading.dataset.hd24KoText=heading.textContent;heading.textContent='Performance × Reply Deep Validation';}
  const description=root.querySelector('h3 + p');
  if(description){if(!description.dataset.hd24KoText)description.dataset.hd24KoText=description.textContent;description.textContent='Validate recurring KPI misses across months, reply quality, corrective-action effectiveness, and cross-KPI consistency independently of target achievement.';}
 }else{const heading=root.querySelector('h3'),description=root.querySelector('h3 + p');if(heading?.dataset.hd24KoText)heading.textContent=heading.dataset.hd24KoText;if(description?.dataset.hd24KoText)description.textContent=description.dataset.hd24KoText;}
}
function normalizeExecutiveEnglish(root){
 const title=[...root.querySelectorAll('b')].find(x=>x.textContent.trim()==='① Executive Dashboard');
 if(title){
  const head=title.parentElement;
  const subtitle=head?.querySelector('div');
  if(subtitle)subtitle.textContent='Reply Quality and Execution Management — Key Signals';
  const note=head?.parentElement?.lastElementChild;
  if(note&&note!==head)note.textContent='See KPI-level analysis below';
 }
 const labels={total:'KPIs Reviewed',complete:'Complete · No Follow-up',review:'Review Needed · Minor Gap',attention:'Priority Review · Critical Gap',history:'Previous Reply Comparison',recurring:'Repeated Root Causes',stagnant:'Stagnant Actions',overdue:'Overdue Actions',retrospective:'Retrospective Gaps'};
 for(const [key,value] of Object.entries(labels)){
  const card=root.querySelector('[data-exec-drill="'+key+'"]');
  const label=card?.querySelector('span');if(label)label.textContent=value;
  if(key==='history'){const count=card?.querySelector('b');if(count&&/최초/.test(count.textContent))count.textContent='[First Review]';}
 }
}
function translateExecutiveLegend(root,lang){
 const title=[...root.querySelectorAll('b')].find(el=>el.textContent.trim()==='지표 범례 · 집계 의미'||el.textContent.trim()==='Metric Definitions');
 if(!title)return;
 const panel=title.parentElement,grid=panel?.querySelector('div[style*="grid-template-columns"]');
 if(!grid)return;
 const cells=[...grid.children].filter(el=>el.tagName==='DIV');
 if(cells.length!==9)return;
 cells.forEach((cell,i)=>{
  if(!cell.dataset.hd24KoHtml)cell.dataset.hd24KoHtml=cell.innerHTML;
  if(lang==='en'){
   const label=['KPIs Reviewed','Complete','Review Needed','Priority Review','Previous Reply Comparison','Repeated Root Causes','Stagnant Actions','Overdue Actions','Retrospective Gaps'][i];
   cell.innerHTML='<b>'+label+'</b> · '+HD24_EXEC_LEGEND_EN[i];
  }else cell.innerHTML=cell.dataset.hd24KoHtml;
 });
 const foot=grid.nextElementSibling;
 if(foot){if(!foot.dataset.hd24KoHtml)foot.dataset.hd24KoHtml=foot.innerHTML;
  if(lang==='en'){const numbers=[...root.querySelectorAll('.hd24-kpi-strip .hd24-kpi-mini b')].map(x=>x.textContent.trim());foot.textContent='Quality classification reconciliation: Complete '+(numbers[1]||'0')+' + Review Needed '+(numbers[2]||'0')+' + Priority Review '+(numbers[3]||'0')+' = '+(numbers[0]||'0')+' KPIs. These counts reflect reply quality and execution management, not KPI achievement.'}
  else foot.innerHTML=foot.dataset.hd24KoHtml;
 }
}
const dashboardOriginalText=new WeakMap();
const HD24_DASHBOARD_TRANSLATIONS_ORDERED=[...HD24_DASHBOARD_TRANSLATIONS].sort((a,b)=>b[0].length-a[0].length);function englishFindingText(value){let out=String(value??'');for(const [ko,en] of HD24_DEEP_FINDING_TRANSLATIONS_ORDERED)out=out.split(ko).join(en);for(const [ko,en] of HD24_DETAIL_TRANSLATIONS_ORDERED)out=out.split(ko).join(en);return dashboardTranslateText(out)}
function dashboardTranslateText(value){let out=value;for(const [ko,en] of HD24_DASHBOARD_TRANSLATIONS_ORDERED)out=out.split(ko).join(en);return out.replace(/(\d+)건(?=\s|$|[·,.)])/g,'$1 items')}
function translateReplyAnalysisPanel(lang){
 const root=get('hd24ReplyAnalysisPanel');if(!root)return;
 const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);let node;
 while(node=walker.nextNode()){
  const parent=node.parentElement;
  if(!parent||parent.closest('#hd24DashboardLanguageControl,script,style,textarea,input,option,[contenteditable="true"]'))continue;
  if(!dashboardOriginalText.has(node))dashboardOriginalText.set(node,node.nodeValue);
  const original=dashboardOriginalText.get(node);
  let translated=original;
  if(lang==='en'){
   for(const [ko,en] of HD24_DEEP_FINDING_TRANSLATIONS_ORDERED)translated=translated.split(ko).join(en);
   for(const [ko,en] of HD24_DETAIL_TRANSLATIONS_ORDERED)translated=translated.split(ko).join(en);
   translated=dashboardTranslateText(translated);
  }
  if(node.nodeValue!==translated)node.nodeValue=translated;
 }
 const label=get('hd24DashboardLanguageControl')?.querySelector('label');
 if(label)label.textContent=lang==='en'?'Display language / 화면 언어':'화면 언어 / Display language';
}
function setDashboardLanguage(lang){lang=lang==='en'?'en':'ko';window.__HD24_DASHBOARD_LANG__=lang;try{sessionStorage.setItem('hd24_dashboard_language_v1',lang)}catch(_){};for(const id of ['hd24ExecutiveDashboard','hd24DeepValidation']){const root=get(id);if(!root)continue;const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);let node;while(node=walker.nextNode()){if(!dashboardOriginalText.has(node))dashboardOriginalText.set(node,node.nodeValue);const original=dashboardOriginalText.get(node);let translated=original;if(lang==='en'){for(const [ko,en] of HD24_DEEP_FINDING_TRANSLATIONS_ORDERED)translated=translated.split(ko).join(en);for(const [ko,en] of HD24_DETAIL_TRANSLATIONS_ORDERED)translated=translated.split(ko).join(en);translated=dashboardTranslateText(translated)}if(node.nodeValue!==translated)node.nodeValue=translated}}translateReplyAnalysisPanel(lang);const exec=get('hd24ExecutiveDashboard');if(exec){translateExecutiveLegend(exec,lang);if(lang==='en')normalizeExecutiveEnglish(exec);}const deep=get('hd24DeepValidation');if(deep)translateDeepLegend(deep,lang);document.querySelectorAll('[data-hd24-dashboard-language]').forEach(x=>{x.value=lang});const warning=get('hd24DashboardTranslationWarning');if(warning){const residual=[];if(lang==='en')for(const id of ['hd24Feedback']){const root=get(id);if(root){const text=root.textContent||'';const hits=text.match(/[가-힣]+/g);if(hits)residual.push(...hits)}}warning.textContent=residual.length?'Translation incomplete: '+[...new Set(residual)].slice(0,8).join(', ')+' · English email blocked until fully translated':'';warning.style.display=residual.length?'block':'none';warning.style.cssText='display:'+(residual.length?'block':'none')+';max-width:100%;flex-basis:100%;overflow-wrap:anywhere;color:#a13a2a;font-size:12px;padding:4px 0'}}
function ensureDashboardLanguageControl(){const host=get('hd24Feedback');if(!host)return;let control=get('hd24DashboardLanguageControl');if(!control){control=document.createElement('div');control.id='hd24DashboardLanguageControl';control.style.cssText='display:flex;justify-content:flex-end;align-items:center;flex-wrap:wrap;gap:8px;margin:8px 0';control.innerHTML='<label for="hd24DashboardLanguageSelect">화면 언어 / Display language</label><select id="hd24DashboardLanguageSelect" data-hd24-dashboard-language aria-label="Dashboard language"><option value="ko">한국어</option><option value="en">English</option></select>';control.insertAdjacentHTML('beforeend','<span id="hd24DashboardTranslationWarning" role="status" style="display:none;color:#a13a2a;font-size:12px"></span>');host.prepend(control);control.querySelector('select').onchange=e=>setDashboardLanguage(e.target.value)}let savedLanguage='ko';try{savedLanguage=sessionStorage.getItem('hd24_dashboard_language_v1')||'ko'}catch(_){}setDashboardLanguage(window.__HD24_DASHBOARD_LANG__||savedLanguage)}
document.addEventListener('hd24:deep-validation-ready',()=>setTimeout(ensureDashboardLanguageControl,80));
document.addEventListener('hd24:deep-validation-rendered',()=>ensureDashboardLanguageControl());
function englishDashboardClone(root){
 const replacements=[['회신 품질 및 실행관리 핵심 신호','Reply Quality and Execution Management'],['상세내용은 아래 KPI별 분석에서 확인','See KPI-level analysis below'],['분석 KPI','KPIs Reviewed'],['충분 · 추가보완 없음','Complete · No Follow-up'],['보완 필요 · 단일/경미 결함','Review Needed · Minor Gap'],['중점 보완 · 복합/핵심 결함','Priority Review · Critical Gap'],['이전 회신 비교','Previous Reply Comparison'],['최초 시행','First Review'],['전월 반복 근인','Repeated Root Causes'],['전월 대책 정체','Stagnant Actions'],['기한 초과','Overdue Actions'],['회고 취약','Retrospective Gaps'],['지표 범례 · 집계 의미','Metric Definitions']];
 const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);let node;while(node=walker.nextNode()){let value=node.nodeValue;for(const [ko,en] of HD24_DEEP_FINDING_TRANSLATIONS_ORDERED)value=value.split(ko).join(en);for(const [ko,en] of HD24_DETAIL_TRANSLATIONS_ORDERED)value=value.split(ko).join(en);value=dashboardTranslateText(value);for(const [ko,en] of HD24_CAPTURE_TRANSLATIONS_ORDERED)value=value.split(ko).join(en);node.nodeValue=value}
 const remaining=[...root.querySelectorAll('*')].filter(x=>x.children.length===0&&/[가-힣]/.test(x.textContent||'')).map(x=>(x.textContent||'').trim()).slice(0,5);if(remaining.length)throw new Error('영문 대시보드 미번역 문장 '+remaining.map(x=>x.slice(0,90)).join(' / ')+' — 메일 생성 차단');
}
async function captureFeedbackDashboards(){
 const defs=[['hd24ExecutiveDashboard','Executive_Dashboard.png','hd24-executive-dashboard'],['hd24DeepValidation','Deep_Validation_Dashboard.png','hd24-deep-validation-dashboard']],out=[],errors=[];
 if(typeof window.html2canvas!=='function')throw new Error('html2canvas 라이브러리가 로드되지 않았습니다.');
 for(const [id,filename,cid] of defs){
  const el=get(id);if(!el){errors.push(id+': 대시보드 DOM 없음');continue}
  let stage=null;
  try{
   stage=document.createElement('div');stage.style.cssText='position:fixed;left:0;top:0;width:1180px;height:auto;overflow:visible;background:#fff;z-index:-9999;pointer-events:none;visibility:visible';
   const copy=el.cloneNode(true);copy.style.display='block';copy.style.visibility='visible';copy.style.width='1120px';copy.style.maxWidth='none';copy.querySelectorAll('button,input,select,textarea,[contenteditable="true"],.hd24-dashboard-language-control,#hd24DashboardLanguageControl,#hd24DeepDetailBox,#hd24ExportDeepAnalysis').forEach(n=>n.remove());
if (id === 'hd24ExecutiveDashboard') {
  const interpretation = copy.lastElementChild;
  if (
    interpretation?.textContent?.includes('관리 해석') ||
    interpretation?.textContent?.includes('Management Interpretation')
  ) {
    interpretation.remove();
  }
}
stage.appendChild(copy);
document.body.appendChild(stage);
  ;if(id==='hd24ExecutiveDashboard'){translateExecutiveLegend(copy,'en');normalizeExecutiveEnglish(copy);}if(id==='hd24DeepValidation')translateDeepLegend(copy,'en');englishDashboardClone(copy);
   const canvas=await Promise.race([window.html2canvas(copy,{backgroundColor:'#ffffff',scale:1.2,useCORS:true,logging:false,windowWidth:1400,scrollX:0,scrollY:0}),new Promise((_,reject)=>setTimeout(()=>reject(new Error('캡처 시간 초과')),12000))]);
   const base64=canvas.toDataURL('image/png').split(',')[1];if(canvas.width<200||canvas.height<100||!base64?.startsWith('iVBORw0KGgo')||base64.length<1500)throw new Error('PNG 크기 또는 인코딩 불량');
   out.push({filename,cid,mimeType:'image/png',base64});
  }catch(e){errors.push(id+': '+(e?.message||String(e)))}finally{stage?.remove()}
 }
 if(out.length!==defs.length)throw new Error('대시보드 캡처 실패 '+out.length+'/'+defs.length+' — '+errors.join(' / '));
 return out;
}
function dashboardHtml(body,images=[]){const escHtml=v=>txt(v).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c])).replace(/\n/g,'<br>'),titles=['Executive Dashboard','Performance × Reply Deep Validation Dashboard'],shots=(Array.isArray(images)?images:[]).map((img,i)=>img?.cid?'<h3>'+titles[i]+'</h3><img src="cid:'+img.cid+'" style="max-width:100%;height:auto">':'').join('');return '<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.6"><div>'+escHtml(body)+'</div>'+(shots?'<hr><div style="margin-top:18px"><b>Dashboard / 대시보드</b></div>'+shots:'')+'</div>'}
function downloadFeedbackEml(file){const u=URL.createObjectURL(file),a=document.createElement('a');a.href=u;a.download=file.name;a.style.display='none';document.body.appendChild(a);try{a.click()}finally{a.remove();setTimeout(()=>URL.revokeObjectURL(u),30000)}}
const phraseNorm=v=>txt(v).toLowerCase().replace(/[^a-z0-9가-힣]+/g,' ').replace(/\s+/g,' ').trim();
function phraseSimilarity(a,b){a=phraseNorm(a);b=phraseNorm(b);if(!a||!b)return 0;if(a===b||a.includes(b)||b.includes(a))return 1;const A=new Set(a.split(' ').filter(x=>x.length>1)),B=new Set(b.split(' ').filter(x=>x.length>1));if(!A.size||!B.size)return 0;let hit=0;A.forEach(x=>B.has(x)&&hit++);return hit/Math.max(1,Math.min(A.size,B.size))}
const materiallySame=(a,b)=>{const x=phraseNorm(a),y=phraseNorm(b);if(!x||!y)return false;const ratio=Math.min(x.length,y.length)/Math.max(x.length,y.length);return ratio>=0.8&&phraseSimilarity(x,y)>=0.9;};
function qualityTier(r,a){const critical=['rootCause','recoveryPlan','actionOwner','plannedCompletionDate'].filter(k=>!txt(r[k])).length,structural=a.flags.filter(f=>['근본원인 미기재','만회계획 미기재','담당자 미지정','완료예정일 미지정'].includes(f[0])).length,execution=a.flags.filter(f=>['반복 근인','조치 정체','기한 초과'].includes(f[0])).length,content=a.flags.filter(f=>/동일 문구|매우 짧|설명이 짧|반복 기재|기한 구체화 필요/.test(f[0])).length;if(critical>=2||structural>=2||a.score<67)return '중점 보완';if(structural||execution||content||a.flags.some(f=>f[0]==='심층검증 HIGH'||f[0]==='심층검증 보완'))return '보완 필요';return '충분'};
const replyOrder=(a,b)=>{const pa=(Number(a?.targetYear)||2026)*12+Number(a?.targetMonth||0),pb=(Number(b?.targetYear)||2026)*12+Number(b?.targetMonth||0);if(pa!==pb)return pb-pa;const sa=Number(a?.replySequence)||0,sb=Number(b?.replySequence)||0;if(sa!==sb)return sb-sa;return String(b?.replyReceivedAt||'').localeCompare(String(a?.replyReceivedAt||''))};
const previousReply=(history,current)=>{const monthKey=r=>(Number(r?.targetYear)||2026)*12+Number(r?.targetMonth||0),currentMonth=monthKey(current);if(!Number(current?.targetMonth))return null;return history.filter(x=>x!==current&&Number(x?.targetMonth)&&monthKey(x)<currentMonth).sort(replyOrder)[0]||null;};
function analyze(r){
 const missing=fields.filter(([k])=>!txt(r[k]));
 const reason=txt(r.reason),root=txt(r.rootCause),plan=txt(r.recoveryPlan),owner=txt(r.actionOwner),due=txt(r.plannedCompletionDate),target=txt(r.nextMonthRecoveryTarget);
 const flags=[];
 if(!reason)flags.push(['원인 설명 없음','No reason for miss/deterioration']);
 if(!root)flags.push(['근본원인 미기재','Root cause is missing']);
 if(!plan)flags.push(['만회계획 미기재','Recovery plan is missing']);
 if(!owner)flags.push(['담당자 미지정','Action owner is not assigned']);
 if(!due)flags.push(['완료예정일 미지정','Due date is not specified']);
 if(due&&(/^(monthly|-|n\/?a)$/i.test(due)))flags.push(['기한 구체화 필요','Due timing is too broad; specify an actionable completion week/date']);
 if(reason&&root&&reason.toLowerCase()===root.toLowerCase())flags.push(['현상/사유와 근본원인이 동일 문구입니다. 근인 분석의 구체화가 필요','Reason and root cause are identical; please clarify the underlying cause']);
 if(plan&&plan.length<12)flags.push(['만회계획이 매우 짧아 실행방법·완료조건 확인 필요','Recovery plan is too brief; clarify execution method and completion criteria']);
 if(root&&root.length<8)flags.push(['근본원인 설명이 짧아 발생 메커니즘/근거 확인 필요','Root-cause description is brief; clarify mechanism and evidence']);
 if(plan&&!owner)flags.push(['만회계획은 있으나 실행 담당자가 없어 책임주체 지정 필요','Recovery plan exists but no action owner is assigned']);
 if(plan&&!due)flags.push(['만회계획은 있으나 완료예정일이 없어 실행기한 지정 필요','Recovery plan exists but no completion date is assigned']);
 if(root&&plan&&root.length>7&&plan.toLowerCase().includes(root.toLowerCase()))flags.push(['근본원인을 만회계획에 반복 기재했습니다. 원인 제거를 위한 구체적 실행조치 확인 필요','Recovery plan repeats the root cause; specify the concrete action that removes the cause']);
 const complete=fields.length-missing.length,score=Math.round(complete/fields.length*100);
 const level=score===100&&flags.length===0?'충분':score>=67?'보완 필요':'중점 보완';
 return {missing,flags,score,level,reason,root,plan,owner,due,target};
}

function dueState(r,a){
 const raw=txt(a?.due||r?.plannedCompletionDate).trim();
 const done=/완료|complete|done/i.test(txt(r?.actionStatus||r?.status||r?.completionStatus));
 if(!raw)return {kind:'missing',overdue:false};
 if(/^(monthly|-|n\/?a)$/i.test(raw))return {kind:'broad',overdue:false};
 if(/^(?:w(?:eek)?\s*)?[1-5]\s*[,\/-]?\s*[A-Za-z]{3,9}[-\s,]*20\d{2}$/i.test(raw)||/^w[1-5]\s*[,\/-]?\s*(?:0?[1-9]|1[0-2])[-\/]20\d{2}$/i.test(raw))return {kind:'week',overdue:false};
 const t=Date.parse(raw);
 return Number.isFinite(t)?{kind:'date',overdue:t<Date.now()&&!done}:{kind:'text',overdue:false};
}

function masterDefinitionEvidence(r){
 const lookup=window.hd24KpiDefinitionLookup;
 if(typeof lookup!=='function')return {status:'unavailable'};
 const result=lookup(r?.plant,txt(r?.kpiEn||r?.kpi));
 if(result?.status!=='unique-name-only')return {status:result?.status||'unavailable'};
 const normalize=v=>txt(v).trim().toLowerCase();
 const sourceUnit=normalize(r?.unit||r?.kpiUnit||r?.uom),masterUnit=normalize(result.unit);
 const direction=v=>['higher','up','increase','상향'].includes(normalize(v))?'higher':['lower','down','decrease','하향'].includes(normalize(v))?'lower':'';
 const sourceDirection=direction(r?.improvementDirection||r?.targetDirection||r?.betterDirection||r?.direction),masterDirection=direction(result.direction);
 if(!sourceUnit||!masterUnit||!sourceDirection||!masterDirection)return {status:'incomplete'};
 if(sourceUnit!==masterUnit||sourceDirection!==masterDirection)return {status:'conflict'};
 return {status:'consistent'};
}
function kpiPerformanceEvidence(r,history=[]){
 const master=masterDefinitionEvidence(r);
 if(master.status==='conflict')return 'KPI trend: source KPI definition conflicts with the plant master; comparison withheld pending reconciliation';
 if(master.status!=='consistent')return 'KPI trend: plant KPI master definition is '+master.status+'; comparison withheld pending verified unit and direction mapping';
 const prior=previousReply(history,r);
 if(!prior)return 'KPI trend: no earlier-month comparison available';
 const number=v=>{const raw=txt(v).replace(/,/g,'');return raw!==''&&/^-?\d+(?:\.\d+)?$/.test(raw)?Number(raw):null};
 const current=number(r?.actual),previous=number(prior?.actual);
 if(current===null||previous===null)return 'KPI trend: actual performance values unavailable or nonnumeric; direction not assessed';
 const unit=txt(r?.unit||r?.kpiUnit||r?.uom);
 const priorUnit=txt(prior?.unit||prior?.kpiUnit||prior?.uom);
 if(!unit||!priorUnit)return 'KPI trend: source unit is missing for one or both months; comparison withheld pending unit confirmation';
 if(unit.toLowerCase()!==priorUnit.toLowerCase())return 'KPI trend: source units differ across months ('+priorUnit+' vs '+unit+'); comparison withheld pending unit reconciliation';
 const direction=txt(r?.improvementDirection||r?.targetDirection||r?.betterDirection||r?.direction).toLowerCase();
 const previousDirection=txt(prior?.improvementDirection||prior?.targetDirection||prior?.betterDirection||prior?.direction).toLowerCase();
 const normalizeDirection=v=>['higher','up','increase','상향'].includes(v)?'higher':['lower','down','decrease','하향'].includes(v)?'lower':'';
 if(!normalizeDirection(direction)||!normalizeDirection(previousDirection))return 'KPI trend: improvement direction is missing or unrecognized for one or both months; comparison withheld';
 if(normalizeDirection(direction)!==normalizeDirection(previousDirection))return 'KPI trend: improvement direction differs across months; comparison withheld pending KPI definition review';

 const higher=normalizeDirection(direction)==='higher',delta=current-previous;
 const trend=delta===0?'unchanged':(higher?delta>0:delta<0)?'improved':'deteriorated';
 return 'KPI trend: '+trend+' ('+previous+(unit?' '+unit:'')+' -> '+current+(unit?' '+unit:'')+'); action effectiveness and causation remain unverified';
}
function crossMonthActionAssessment(r,a,history=[]){
 const prior=previousReply(history,r);
 if(!prior)return 'Cross-month cause/action review: no earlier KPI reply available; action effectiveness cannot be assessed';
 const prev=analyze(prior);
 const compare=(now,old,label)=>{
  if(!now||!old)return label+': one or both replies lack a documented statement';
  return label+': '+(materiallySame(now,old)?'similar wording across replies; confirm actual recurrence or action progress':'wording changed across replies; explain what was revised and why');
 };
 const evidence=[r?.actionCompletionEvidence,r?.completionEvidence,r?.effectivenessEvidence,r?.verificationEvidence].map(txt).filter(Boolean);
 const status=evidence.length?'execution/verification text is present but its validity and causal link to KPI results remain unverified':'no separately recorded completion or effectiveness evidence';
 return [
  'Cross-month cause/action review',
  compare(a.root,prev.root,'Root cause'),
  compare(a.plan,prev.plan,'Recovery action'),
  'Action effectiveness: '+status,
  'Required follow-up: compare actual KPI results with action execution dates, completion proof and sustained performance before attributing any improvement to the action'
 ].join('; ');
}
function analysisResultFor(r,a,history=[]){
 const k=/[가-힣]/.test(txt(r.kpiEn||r.kpi))?'This KPI':(txt(r.kpiEn||r.kpi)||'KPI'),parts=[];
 parts.push(`${k}: response completeness ${a.score}%`);
 parts.push(kpiPerformanceEvidence(r,history));
 parts.push(crossMonthActionAssessment(r,a,history));
 if(!a.reason)parts.push('miss/deterioration reason is not explained');
 if(!a.root)parts.push('root cause is not documented'); else if(a.root.length<8)parts.push('root cause is stated but mechanism/evidence is insufficient'); else parts.push('root cause is described; causal validity is not yet verified');
 if(!a.plan)parts.push('recovery action is absent'); else if(a.plan.length<12)parts.push('recovery action exists but execution method/completion criteria are insufficient'); else parts.push('recovery action is described; execution and effectiveness are not yet verified');
 if(!a.owner)parts.push('accountable owner is not assigned'); else parts.push('accountable owner is recorded in the source fields');
 if(!a.due)parts.push('committed completion date is absent'); else parts.push(/[가-힣]/.test(String(a.due))?'committed completion date is recorded in the source fields':`due: ${a.due}`);
 if(a.target)parts.push('next-month recovery target is recorded in the source fields');
 if(a.reason&&a.root&&a.reason.toLowerCase()===a.root.toLowerCase())parts.push('reason and root cause use the same statement, so causal depth is insufficient');
 const prior=previousReply(history,r),prev=prior?analyze(prior):null;
 if(prev&&a.root&&prev.root&&materiallySame(a.root,prev.root))parts.push('root-cause wording is similar to the previous reply; confirm whether the issue actually recurred');
 if(prev&&a.plan&&prev.plan&&materiallySame(a.plan,prev.plan))parts.push('recovery-action wording is similar to the previous reply; review progress and measured effect');
 const due=dueState(r,a);if(due.overdue)parts.push('planned completion date has passed without clear completion evidence');
 return parts.join('. ')+'.';
}

function reviewGapFor(r,a,history=[]){
 const gaps=[];
 if(!a.reason)gaps.push('회고분석 미흡: KPI 미달/악화 결과에 대한 사실기반 원인 회고가 없음');
 if(!a.root)gaps.push('근인분석 미흡: 현상에서 근본원인까지의 인과관계가 정의되지 않음');
 else if(a.reason&&a.reason.toLowerCase()===a.root.toLowerCase())gaps.push('근인분석 오류: 현상/미달사유를 근본원인으로 반복 기재함');
 if(!a.plan)gaps.push('대책수립 미흡: 확인된 근인을 제거하는 Recovery Action이 없음');
 else if(a.plan.length<12)gaps.push('대책수립 구체성 부족: 실행방법·완료조건·검증방법이 불명확함');
 if(!a.owner||!a.due)gaps.push('실행관리 미흡: 대책의 책임자 또는 완료기한이 없어 추적관리가 어려움');
 if(a.target&&!a.plan)gaps.push('지표-활동 연계 미흡: 회복목표는 있으나 이를 달성할 실행대책이 연결되지 않음');
 const prior=previousReply(history,r),prev=prior?analyze(prior):null;
 if(prev&&a.root&&prev.root&&materiallySame(a.root,prev.root))gaps.push('재발방지 미흡: 이전 회신과 동일 근인이 반복되었으나 재발방지 관점의 추가 분석이 없음');
 if(prev&&a.plan&&prev.plan&&materiallySame(a.plan,prev.plan))gaps.push('활동결과 회고 미흡: 이전과 동일 대책을 유지하면서 진척·효과·실패원인에 대한 회고가 없음');
 const due=dueState(r,a);if(due.overdue)gaps.push('기한관리 미흡: 완료예정일이 경과했으나 완료근거 또는 지연원인/재계획이 없음');
 return gaps.length?gaps.join(' | '):'주요 관리요소(회고분석·근인·대책·책임/기한)가 연결되어 있음. 차월 실적으로 대책 효과를 검증할 것';
}

function finalRequestFor(r,a,history=[]){
 const req=[];
 if(!a.root||a.root.length<8)req.push('근본원인 판단근거 보완(추가 자료 제출 자체보다 현상→원인의 논리와 확인근거 중심)');
 if(!a.plan||a.plan.length<12)req.push('근인 제거 대책의 실행방법·완료조건·효과확인 방법 보완(필요 최소한의 근거만 제시)');
 if(!a.owner)req.push('Action Owner 지정');
 if(!a.due)req.push('완료예정일 확정');

 const prior=previousReply(history,r),prev=prior?analyze(prior):null;
 if(prev&&a.root&&prev.root&&materiallySame(a.root,prev.root))req.push('반복 근인에 대한 재발방지 대책 및 추가 근인분석 제출');
 if(prev&&a.plan&&prev.plan&&materiallySame(a.plan,prev.plan))req.push('기존 대책의 진척·효과·미흡원인 회고 및 변경/추가조치 제출');
 const due=dueState(r,a);if(due.overdue)req.push('기한초과 사유, 현재 진척률 및 재설정 완료일 회신');
 return req.length?req.map((x,i)=>`${i+1}. ${x}`).join(' / '):'추가 필수 보완사항 없음. 차월 KPI 실적으로 Recovery Action 효과를 확인하고 결과를 회신';
}

function feedbackFor(r,a,history=[]){
 const k=/[가-힣]/.test(txt(r.kpiEn||r.kpi))?'This KPI':(txt(r.kpiEn||r.kpi)||'KPI'), out=[];
 if(!a.root)out.push(`${k}: Identify and substantiate the root cause with evidence, not only the symptom or result.`);
 if(a.root&&a.root.length<8)out.push(`${k}: Expand the root cause to explain the failure mechanism and supporting evidence.`);
 if(!a.plan)out.push(`${k}: Define a concrete recovery action linked to the stated root cause and verify the causal link.`);
 else if(a.plan.length<12)out.push(`${k}: Specify the recovery action, execution method and completion criteria in measurable terms.`);
 if(!a.owner)out.push(`${k}: Assign one accountable action owner for the recovery action.`);
 if(!a.due)out.push(`${k}: Set a committed completion date for the recovery action.`);

 if(a.reason&&a.root&&a.reason.toLowerCase()===a.root.toLowerCase())out.push(`${k}: Separate the observed reason/symptom from the underlying root cause and explain why the issue occurred.`);
 if(a.root&&a.plan&&a.plan.toLowerCase().includes(a.root.toLowerCase()))out.push(`${k}: Replace the repeated cause statement with a specific cause-removal action and verification method.`);
 return out.length?out.join(' '):`${k}: Response structure is complete. Confirm execution evidence and verify whether the next KPI result achieves the stated recovery target.`;
}

function reviewGapEnglish(r,a,history=[]){const gaps=[];if(!a.reason)gaps.push('No fact-based retrospective analysis of KPI miss or deterioration');if(!a.root)gaps.push('Root cause and causal mechanism not identified');else if(a.reason&&a.reason.toLowerCase()===a.root.toLowerCase())gaps.push('Symptom repeated as root cause');if(!a.plan)gaps.push('No recovery action addressing verified root cause');else if(a.plan.length<12)gaps.push('Execution method, completion criteria or verification unclear');if(!a.owner||!a.due)gaps.push('Action owner or committed due date missing');const prior=previousReply(history,r),prev=prior?analyze(prior):null;if(prev&&a.root&&prev.root&&materiallySame(a.root,prev.root))gaps.push('Similar root-cause wording; verify recurrence and prevention evidence');if(prev&&a.plan&&prev.plan&&materiallySame(a.plan,prev.plan))gaps.push('Similar recovery-action wording; verify progress and effectiveness evidence');if(dueState(r,a).overdue)gaps.push('Overdue action without closure evidence or revised plan');return gaps.join(' | ')||'Core management elements are connected; verify recovery effectiveness against the next KPI result'}
function finalRequestEnglish(r,a,history=[]){const req=[];if(!a.root||a.root.length<8)req.push('Clarify evidence and causal logic for the verified root cause');if(!a.plan||a.plan.length<12)req.push('Specify root-cause removal action, completion criteria and effectiveness verification');if(!a.owner)req.push('Assign an accountable action owner');if(!a.due)req.push('Confirm the committed completion date');if(dueState(r,a).kind==='broad')req.push('Specify a dated completion milestone and objective closure criteria for recurring timing');const prior=previousReply(history,r),prev=prior?analyze(prior):null;if(prev&&a.root&&prev.root&&materiallySame(a.root,prev.root))req.push('Check whether the similar root-cause description reflects an unresolved recurrence; confirm prevention measures');if(prev&&a.plan&&prev.plan&&materiallySame(a.plan,prev.plan))req.push('Verify prior action progress and measured effectiveness; explain any remaining recovery gap');if(dueState(r,a).overdue)req.push('Explain overdue status and confirm revised completion date');return req.length?req.map((x,i)=>(i+1)+'. '+x).join(' / '):'No mandatory supplement; verify recovery effectiveness in next-month KPI results'}
async function exportFeedbackWorkbook(rows,plant,expectedExportKey=lastExportKey){
 if(typeof ExcelJS==='undefined'||!rows.length)return;
 const wb=new ExcelJS.Workbook(),ws=wb.addWorksheet('Reply Feedback');
 const headers=['Plant','Target Year','Target Month','KPI','Reason for Miss / Deterioration (Original Reply)','Root Cause (Original Reply)','Recovery / Catch-up Plan (Original Reply)','Action Owner (Original Reply)','Planned Completion Date (Original Reply)','Next-Month Recovery Target (Original Reply)','HDPS Analysis Result','What Was Wrong / Management Review Gap','HDPS Feedback / Required Follow-up','Final Additional Request / Points to Supplement','Deep Validation / Closed-Loop Findings'];
 ws.columns=headers.map((h,i)=>({header:h,key:'c'+i,width:[14,12,14,34,34,34,38,20,22,24,48,62,58,58,68][i]}));
 const hr=ws.getRow(1);hr.font={bold:true,color:{argb:'FFFFFFFF'}};hr.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF1D4E7D'}};hr.alignment={vertical:'middle',horizontal:'center',wrapText:true};
 let saved=[];try{saved=JSON.parse(localStorage.getItem(KEY)||'[]').filter(x=>x.plant===plant)}catch{};saved.sort((a,b)=>String(b.replyReceivedAt||'').localeCompare(String(a.replyReceivedAt||''))||Number(b.replySequence||0)-Number(a.replySequence||0));rows.forEach(r=>{const a=analyze(r),history=saved.filter(x=>sameKpi(x,r)&&x!==r),feedback=feedbackFor(r,a,history),prior=previousReply(history,r),prev=prior?analyze(prior):null,deepFind=[...(a.flags||[]).map(x=>Array.isArray(x)?x[1]:''),...(prev&&a.root&&prev.root&&materiallySame(a.root,prev.root)?['Similar root-cause description in earlier KPI reply; verify whether the underlying issue actually recurred']:[]),...(prev&&a.plan&&prev.plan&&materiallySame(a.plan,prev.plan)?['Similar recovery plan in earlier KPI reply; check progress and measured effectiveness before judging adequacy']:[]),...(dueState(r,a).overdue?['Recovery action overdue; confirm closure evidence and revised due date']:[])].filter(Boolean);const row=ws.addRow([plant,Number(r.targetYear)||2026,r.targetMonth,r.kpiEn||r.kpi||'',a.reason,a.root,a.plan,a.owner,a.due,a.target,analysisResultFor(r,a,history),reviewGapEnglish(r,a,history),feedback,finalRequestEnglish(r,a,history),englishFindingText(deepFind.join(' | ')||'No additional deep-validation finding')]);const koreanCells=[...row.values].map((v,i)=>({v,i})).filter(x=>x.i>=11&&typeof x.v==='string'&&/[가-힣]/.test(x.v));if(koreanCells.length){throw new Error('영문 회신 Excel 번역 검증 실패: Reply Feedback '+(ws.rowCount-1)+'행, 열 '+koreanCells.map(x=>x.i).join(', ')+'에 한글이 남아 있습니다. 원문 번역 확인 전 메일 첨부 차단');} row.alignment={vertical:'top',wrapText:true};row.getCell(11).font={bold:true};row.getCell(12).font={bold:true};row.getCell(12).fill={type:'pattern',pattern:'solid',fgColor:{argb:'FFFFE2E2'}};row.getCell(13).fill={type:'pattern',pattern:'solid',fgColor:{argb:'FFFFF2CC'}};row.getCell(14).fill={type:'pattern',pattern:'solid',fgColor:{argb:'FFE2F0D9'}};row.getCell(14).font={bold:true}});
 ws.views=[{state:'frozen',ySplit:1,xSplit:3}];ws.autoFilter={from:'A1',to:'O1'};ws.getRow(1).height=34;ws.eachRow((row,n)=>{if(n>1)row.height=72});
 const deepApi=window.hd24DeepReplyValidation;if(!deepApi?.detailRows)throw new Error('심층검증 상세그리드 데이터 모듈을 불러오지 못했습니다.');const deepRows=deepApi.detailRows(saved),detail=wb.addWorksheet('Deep Validation Detail');const deepHeaders=['Plant','Year','Month','KPI (Source)','Related KPI (Source)','Severity','Detection Type','Detailed Finding','Reason for Miss (Source)','Root Cause (Source)','Recovery Plan (Source)','Action Owner (Source)','Due Date (Source)','Reply Sequence'];detail.columns=deepHeaders.map((h,i)=>({header:h,key:'d'+i,width:[15,10,10,38,36,14,28,76,48,48,48,24,24,16][i]}));detail.getRow(1).font={bold:true,color:{argb:'FFFFFFFF'}};detail.getRow(1).fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF1D4E7D'}};deepRows.forEach(x=>detail.addRow([x.plant,x.year,x.month,x.kpi,x.related,x.sev,englishFindingText(x.type),englishFindingText(x.msg),x.reason,x.root,x.plan,x.owner,x.due,x.seq]));detail.views=[{state:'frozen',ySplit:1,xSplit:4}];detail.autoFilter={from:'A1',to:'N1'};detail.eachRow((rr,n)=>{if(n>1){rr.alignment={vertical:'top',wrapText:true};rr.height=56}});if(detail.rowCount!==deepRows.length+1)throw new Error('심층검증 상세그리드 Excel 행수 불일치');
 const evidence=wb.addWorksheet('Source KPI Evidence');const evidenceHeaders=['Plant','Year','Month','KPI','Target','Actual','Status / Trend','Reason (Source)','Root Cause (Source)','Recovery Plan (Source)','Owner (Source)','Due Date (Source)','Next-Month Recovery Target','Reply Sequence','Reply Received At','Source Unit','Improvement Direction'];evidence.columns=evidenceHeaders.map((header,i)=>({header,width:[15,10,10,38,20,20,32,50,50,55,24,24,26,16,28,18,22][i]}));evidence.getRow(1).font={bold:true,color:{argb:'FFFFFFFF'}};evidence.getRow(1).fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF1D4E7D'}};saved.forEach(r=>evidence.addRow([r.plant,r.targetYear,r.targetMonth,r.kpiEn||r.kpi,r.target,r.actual,r.statusTrend,r.reason,r.rootCause,r.recoveryPlan,r.actionOwner,r.plannedCompletionDate,r.nextMonthRecoveryTarget,r.replySequence,r.replyReceivedAt,r.unit||r.kpiUnit||r.uom||'',r.improvementDirection||r.targetDirection||r.betterDirection||r.direction||'']));evidence.views=[{state:'frozen',ySplit:1,xSplit:4}];evidence.autoFilter={from:'A1',to:'Q1'};evidence.eachRow((rr,n)=>{if(n>1){rr.alignment={vertical:'top',wrapText:true};rr.height=54}});if(evidence.rowCount!==saved.length+1)throw new Error('원본 KPI 근거 시트 행수 불일치');
 const normalized=wb.addWorksheet('Normalized KPI Values');normalized.columns=[['Plant',16],['Year',10],['Month',10],['KPI',40],['Unit',12],['Target',18],['Actual',18],['Next-Month Recovery Target',26]].map(([header,width])=>({header,width}));normalized.getRow(1).font={bold:true,color:{argb:'FFFFFFFF'}};normalized.getRow(1).fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF1D4E7D'}};const asNumber=v=>{if(v===null||v===undefined||String(v).trim()==='')return null;const n=Number(String(v).replace(/,/g,'').replace(/%/g,'').trim());return Number.isFinite(n)?n:null};const percentagePoints=v=>{const n=asNumber(v);return n===null?null:(Math.abs(n)>0&&Math.abs(n)<1?n*100:n)};saved.forEach(r=>{const rate=/\brate\b/i.test(String(r.kpiEn||r.kpi||'')),unit=rate?'%':(r.unit||r.kpiUnit||r.uom||''),pct=String(unit).includes('%'),convert=pct?percentagePoints:asNumber;normalized.addRow([r.plant,r.targetYear,r.targetMonth,r.kpiEn||r.kpi,unit,...(pct&&asNumber(r.target)===1&&asNumber(r.actual)!==null&&Math.abs(asNumber(r.actual))>0&&Math.abs(asNumber(r.actual))<=2?[100,asNumber(r.actual)*100,convert(r.nextMonthRecoveryTarget)]:[convert(r.target),convert(r.actual),convert(r.nextMonthRecoveryTarget)])])});normalized.views=[{state:'frozen',ySplit:1,xSplit:4}];normalized.autoFilter={from:'A1',to:'H1'};normalized.eachRow((rr,n)=>{if(n>1){rr.getCell(6).numFmt='0.##';rr.getCell(7).numFmt='0.##';rr.getCell(8).numFmt='0.##'}});
 // Source KPI Evidence intentionally retains original-language source data; analytical sheets must be English.
 const untranslated=[];for(const sheet of [ws,detail])sheet.eachRow((rr,rowNo)=>{if(rowNo===1)return;rr.eachCell((cell,colNo)=>{const sourceColumn=sheet===ws?(colNo>=4&&colNo<=10):(colNo===4||colNo===5||(colNo>=9&&colNo<=13));if(!sourceColumn&&typeof cell.value==='string'&&/[가-힣]/.test(cell.value)&&untranslated.length<12)untranslated.push(sheet.name+'!'+cell.address)})});
 if(untranslated.length)throw new Error('영문 첨부파일 검증 실패: 분석 시트 한글 잔존 '+untranslated.join(', ')+' (원본 근거 시트는 원문 보존)');
 if(!rows.length||ws.rowCount!==rows.length+1||detail.rowCount!==deepRows.length+1||evidence.rowCount!==saved.length+1)throw new Error('Excel 시트별 행수 검증 실패');

 if(ws.rowCount!==rows.length+1)throw new Error('회신 분석 Excel 행수 불일치: '+(ws.rowCount-1)+' / '+rows.length);const buf=await wb.xlsx.writeBuffer(),name=`HDPS_KPI_Reply_Feedback_${plant}_${new Date().toISOString().slice(0,10)}.xlsx`;let binary='';const bytes=new Uint8Array(buf);for(let i=0;i<bytes.length;i+=0x8000)binary+=String.fromCharCode(...bytes.subarray(i,i+0x8000));if(expectedExportKey!==lastExportKey||(get('plantSelect')?.value||'india')!==plant)throw new Error('Excel 생성 중 분석 대상이 변경되었습니다. 최신 데이터를 다시 생성해야 합니다.');latestFeedbackAttachment={filename:name,mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',base64:btoa(binary),plant,exportKey:lastExportKey,createdAt:new Date().toISOString()};const file=new File([buf],name,{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});latestFeedbackAttachment.file=file;
 const st=get('hd24FeedbackExportStatus');if(st)st.textContent='피드백 Excel 자동 생성 완료 · '+name;
}
function ensureDedicatedPanels(){
 const main=document.querySelector('main');if(!main)return{};
 let analysis=get('hd24ReplyAnalysisPanel');if(!analysis){analysis=document.createElement('section');analysis.id='hd24ReplyAnalysisPanel';analysis.className='panel hd24-tab-hidden';main.append(analysis)}
 let mail=get('hd24ReplyMailPanel');if(!mail){mail=document.createElement('section');mail.id='hd24ReplyMailPanel';mail.className='panel hd24-tab-hidden';main.append(mail)}
 return{analysis,mail};
}
function execDrillRows(kind,analyses){return analyses.filter(x=>{const a=x.a,h=x.history||[],s=x.execSignals||{};if(kind==='total')return true;if(kind==='complete')return a.level==='충분';if(kind==='review')return a.level==='보완 필요';if(kind==='attention')return a.level==='중점 보완';if(kind==='history')return h.length>0;if(kind==='recurring')return !!s.recurring;if(kind==='stagnant')return !!s.stagnant;if(kind==='overdue')return !!s.overdue;if(kind==='retrospective')return !!s.retrospective;return false})}
function showExecDrill(kind,title,analyses){
 const data=execDrillRows(kind,analyses);let modal=get('hd24ExecDrillModal');if(!modal){modal=document.createElement('div');modal.id='hd24ExecDrillModal';document.body.append(modal)}
 modal.style.cssText='position:fixed;inset:0;z-index:99999;background:rgba(15,31,48,.48);display:flex;align-items:center;justify-content:center;padding:28px';
 modal.innerHTML='<div style="width:min(1500px,96vw);max-height:90vh;background:#fff;border-radius:14px;box-shadow:0 20px 60px rgba(0,0,0,.28);display:flex;flex-direction:column;overflow:hidden"><div style="padding:16px 20px;border-bottom:1px solid #d9e2eb;display:flex;justify-content:space-between;align-items:center"><div><b style="font-size:19px;color:#17324d">'+esc(title)+' 상세그리드</b><span style="margin-left:10px;color:#66788a">'+data.length+'건</span></div><button id="hd24ExecDrillClose" type="button">닫기</button></div><div style="padding:12px 16px;overflow:auto"><table style="border-collapse:collapse;width:100%;min-width:1450px;font-size:12px"><thead><tr>'+['사업장','연도·월','KPI','필수정보','판정','회신차수','미달성 사유','근본원인','만회계획','담당자','완료예정일','차월 회복목표','검토 포인트'].map(v=>'<th style="position:sticky;top:0;background:#eef3f8;border:1px solid #cbd6e2;padding:8px;text-align:left">'+v+'</th>').join('')+'</tr></thead><tbody>'+(data.length?data.map(x=>{const r=x.r,a=x.a;return '<tr>'+[r.plant,(Number(r.targetYear)||2026)+'-'+String(r.targetMonth).padStart(2,'0'),r.kpiEn||r.kpi,a.score+'%',a.level,x.history.length,a.reason,a.root,a.plan,a.owner,a.due,a.target,a.flags.map(f=>f[0]).join(' / ')||'특이사항 없음'].map(v=>'<td style="border:1px solid #dbe3eb;padding:7px;vertical-align:top;max-width:300px;white-space:normal">'+esc(v??'')+'</td>').join('')+'</tr>'}).join(''):'<tr><td colspan="13" style="padding:28px;text-align:center">해당 조건의 상세 데이터가 없습니다.</td></tr>')+'</tbody></table></div></div>';
 get('hd24ExecDrillClose').onclick=()=>modal.style.display='none';modal.onclick=e=>{if(e.target===modal)modal.style.display='none'};
}
function syncFeedbackRecipients(){const to=(get('mailTo')?.value||'').trim(),plant=(get('plantSelect')?.value||'india'),mandatory=['hastom@hd.com',...(plant==='india'?['wonjun.cho@hd.com','minsu.kim01@hd.com','deokho.kim@hd.com']:plant==='brazil'?['antos2082@hd.com','yhchoi@hd.com']:[])],extras=requiredFeedbackCc((get('mailCc')?.value||'').trim()).split(';').map(v=>v.trim()).filter(Boolean),seen=new Set([to.toLowerCase()]),cc=[...mandatory,...extras].filter(v=>{const k=v.toLowerCase();if(seen.has(k))return false;seen.add(k);return true}).join('; ');if(get('hd24FeedbackTo'))get('hd24FeedbackTo').value=to;if(get('hd24FeedbackCc'))get('hd24FeedbackCc').value=cc;return {to,cc}}
function render(){
 const dedicated=ensureDedicatedPanels(),analysisPanel=dedicated.analysis,mailPanel=dedicated.mail;if(!analysisPanel||!mailPanel)return;const panel=get('hd24ReplyPanel');let box=get('hd24Feedback');if(!box){box=document.createElement('section');box.id='hd24Feedback';analysisPanel.append(box)}else if(box.parentElement!==analysisPanel)analysisPanel.append(box)
 const plant=get('plantSelect')?.value||'india';let all=[];try{all=JSON.parse(localStorage.getItem(KEY)||'[]').filter(x=>x.plant===plant)}catch{}
 all.sort((a,b)=>String(b.replyReceivedAt||'').localeCompare(String(a.replyReceivedAt||''))||Number(b.replySequence||0)-Number(a.replySequence||0));
 const groups=[];all.forEach(r=>{const year=Number(r.targetYear)||2026;let g=groups.find(x=>x.year===year&&x.month===Number(r.targetMonth)&&sameKpi(x.rows[0],r));if(!g){g={year,month:Number(r.targetMonth),rows:[]};groups.push(g)}g.rows.push(r)});
 let rows=groups.map(g=>g.rows[0]);
 const nextKey=plant+'|'+JSON.stringify({rows,saved:all});
 if(nextKey!==draftKey){draftKey=nextKey;drafts={ko:'',en:''};if(rows.length)demo=false}
 if(!rows.length&&!demo){box.innerHTML='<h3>회신 상세 분석 및 피드백</h3><div style="padding:22px;border:1px dashed #a9b9ce;border-radius:10px;background:#f7faff;margin:12px 0"><strong>등록된 회신이 없습니다.</strong><p>회신 Excel을 등록하면 KPI별 사유·근본원인·만회계획·담당자·완료일을 구조적으로 분석하고 이전 회신과 비교합니다.</p><button type="button" id="hd24DemoPreview">샘플 분석 미리보기 (저장·발송 안 함)</button></div>';get('hd24DemoPreview').onclick=()=>{demo=true;render()};return}
 if(!rows.length&&demo){rows=[{plant,targetMonth:7,kpiEn:'Sample KPI (DEMO)',reason:'Production delay',rootCause:'',recoveryPlan:'Improve process',actionOwner:'',plannedCompletionDate:'',nextMonthRecoveryTarget:''}];groups=[{month:7,rows}]}
 const analyses=rows.map(r=>{const history=all.filter(x=>x!==r&&sameKpi(x,r)&&Number(x.replySequence||0)<Number(r.replySequence||0)).sort(replyOrder);const a=analyze(r),prev=previousReply(history,r);if(prev){const p=analyze(prev);if(a.root&&p.root&&materiallySame(a.root,p.root))a.flags.push(['반복 근인','이전 회신과 동일한 근본원인이 반복됩니다. 재발방지 조치와 효과검증 근거를 명확히 제시하십시오.']);if(a.plan&&p.plan&&materiallySame(a.plan,p.plan))a.flags.push(['조치 정체','이전 회신과 동일한 Recovery Plan입니다. 실행 진척·완료근거 또는 변경 조치를 제시하십시오.'])}const due=dueState(r,a);if(due.overdue)a.flags.push(['기한 초과','완료예정일이 경과했습니다. 현재 상태, 지연사유 및 재설정 완료일을 회신하십시오.']);return{r,a,history}});
 const deepExec=window.hd24DeepReplyValidation;
 const trendFlags=x=>deepExec?.flagsFor?.(x.r,all)||[];
 const loopFindings=deepExec?.closedLoop?.(all)||[];
 const crossFindings=deepExec?.contradictions?.(all)||[];
 const trendCount=(x,needle)=>trendFlags(x).some(f=>String(f[1]||'').includes(needle));
 const rowLoop=x=>loopFindings.filter(f=>norm(f.plant)===norm(x.r.plant)&&(Number(f.year)||2026)===(Number(x.r.targetYear)||2026)&&Number(f.month)===Number(x.r.targetMonth)&&sameKpi(x.r,{kpiEn:f.kpi,kpi:f.kpi}));
 const rowCross=x=>crossFindings.filter(f=>norm(f.plant)===norm(x.r.plant)&&(Number(f.year)||2026)===(Number(x.r.targetYear)||2026)&&Number(f.month)===Number(x.r.targetMonth)&&(sameKpi(x.r,{kpiEn:f.kpi,kpi:f.kpi})||sameKpi(x.r,{kpiEn:f.related,kpi:f.related})));
 const retrospectiveGap=x=>{const fs=trendFlags(x),loop=rowLoop(x);return fs.some(f=>/반복|효과|완료조건/.test(String(f[1]||'')))||loop.length>0};
 analyses.forEach(x=>{x.execSignals={recurring:trendCount(x,'근본원인 반복'),stagnant:trendCount(x,'만회계획 반복'),overdue:x.a.flags.some(f=>f[0]==='기한 초과')||trendFlags(x).some(f=>/완료기한 초과|완료예정일이 회신 접수시점보다 이전/.test(String(f[1]||''))),retrospective:retrospectiveGap(x)};const fs=trendFlags(x),loop=rowLoop(x),cross=rowCross(x);if(fs.some(f=>f[0]==='HIGH')||loop.some(f=>f.sev==='HIGH')||cross.some(f=>f.sev==='HIGH'))x.a.flags.push(['심층검증 HIGH','월간 추세/대책 효과검증/KPI 정합성에서 HIGH 관리신호가 확인되었습니다.']);else if(fs.length||loop.length||cross.length)x.a.flags.push(['심층검증 보완','월간 추세/대책 효과검증/KPI 정합성에서 추가 확인이 필요합니다.']);x.a.level=qualityTier(x.r,x.a);if(x.a.flags.some(f=>f[0]==='심층검증 HIGH')&&x.a.level==='충분')x.a.level='보완 필요'});
 const stats={total:analyses.length,complete:analyses.filter(x=>x.a.level==='충분').length,review:analyses.filter(x=>x.a.level==='보완 필요').length,attention:analyses.filter(x=>x.a.level==='중점 보완').length,history:analyses.filter(x=>x.history.length>0).length};const classificationOk=stats.complete+stats.review+stats.attention===stats.total;
 const gaps={root:analyses.filter(x=>!x.a.root||x.a.root.length<8).length,plan:analyses.filter(x=>!x.a.plan||x.a.plan.length<12).length,owner:analyses.filter(x=>!x.a.owner||!x.a.due).length};
 const signals={recurring:analyses.filter(x=>x.execSignals.recurring).length,stagnant:analyses.filter(x=>x.execSignals.stagnant).length,overdue:analyses.filter(x=>x.execSignals.overdue).length,retrospective:analyses.filter(x=>x.execSignals.retrospective).length};

 const exportKey=plant+'|'+JSON.stringify({rows,saved:all.filter(r=>r.plant===plant)});
 const deepMail=window.hd24DeepReplyValidation,deepLoop=deepMail?.closedLoop?.(all)||[],deepCross=deepMail?.contradictions?.(all)||[];
 const ko=['담당자님,','','본 내용은 해당 사업장의 Lean 성과지표 관리 및 활용 실태를 다각도로 검토하여 도출한 문제점 분석결과입니다. 단순한 KPI 목표 달성 여부뿐 아니라 지표의 일상관리, 실적 변화의 원인 분석, 개선활동과 성과 간 연계성 및 회복조치의 실효성을 종합적으로 살펴보았습니다.','제출해 주신 KPI 회신을 바탕으로 미달성 원인과 회복조치의 실행 상태를 검토한 결과를 공유드립니다.','핵심은 회신자료의 형식이 아니라 원인 분석의 타당성, 대책의 실효성, 실제 KPI 회복 여부입니다. 기존 회신과 현장 관리자료를 우선 활용해 주시기 바랍니다.','','[검토 요약]','- 분석 KPI: '+stats.total+'건','- 회신 품질: 충분 '+stats.complete+' / 보완 필요 '+stats.review+' / 중점 보완 '+stats.attention,'- 실행관리 신호: 전월 반복 근인 '+signals.recurring+' / 전월 대책 정체 '+signals.stagnant+' / 기한 초과 '+signals.overdue+' / 회고 취약 '+signals.retrospective+'건','','아래 KPI별 검토 의견을 확인하고, 원인과 대책이 연결되는지 및 조치 후 지표가 실제 회복되고 있는지 중심으로 검토해 주시기 바랍니다.',''];
 const en=['Dear Team,','','This report presents the findings of a multidimensional analysis of issues in the plant’s Lean performance indicator management and utilization. Beyond KPI target achievement, it examines daily performance management, root-cause analysis of performance trends, the link between improvement activities and results, and the effectiveness of recovery actions.','Please find below our review of the KPI responses submitted by your plant.','The focus is on the validity of root causes, effectiveness of recovery actions, and evidence of actual KPI recovery—not on the format or volume of additional reports. Please use existing responses and routine operating records wherever possible.','','[Review Summary]','- KPIs reviewed: '+stats.total,'- Response quality: Complete '+stats.complete+' / Review needed '+stats.review+' / Priority '+stats.attention,'- Execution signals: Repeated root causes '+signals.recurring+' / Stagnant actions '+signals.stagnant+' / Overdue '+signals.overdue+' / Retrospective gaps '+signals.retrospective,'','Please review the KPI-level findings, particularly whether each action addresses the stated root cause and whether performance is recovering after implementation.',''];
 const issuesKo=[],issuesEn=[];
 if(signals.recurring){issuesKo.push('- 동일 근본원인 반복 '+signals.recurring+'건: 원인 제거대책의 유효성을 재검토할 필요가 있습니다.');issuesEn.push('- Repeated root causes: '+signals.recurring+' cases; reassess whether corrective actions eliminate the underlying causes.')}
 if(signals.stagnant){issuesKo.push('- 회복대책 정체 '+signals.stagnant+'건: 기존 조치의 실행성과 및 변경 필요성을 점검해야 합니다.');issuesEn.push('- Stagnant recovery actions: '+signals.stagnant+' cases; verify implementation results and whether actions need revision.')}
 if(signals.overdue){issuesKo.push('- 조치기한 초과 '+signals.overdue+'건: 담당자별 실행현황과 완료일정을 재확인해야 합니다.');issuesEn.push('- Overdue actions: '+signals.overdue+' cases; reconfirm execution status, owners and completion dates.')}
 if(signals.retrospective){issuesKo.push('- 회고 검증 취약 '+signals.retrospective+'건: 조치 전후 실적을 비교하여 효과를 검증해야 합니다.');issuesEn.push('- Weak retrospective verification: '+signals.retrospective+' cases; compare KPI performance before and after actions.')}
 if(issuesKo.length){ko.push('[주요 문제점 및 검토 시사점]',...issuesKo,'');en.push('[Key Issues and Implications]',...issuesEn,'')}
 else{ko.push('[주요 문제점 및 검토 시사점]','- 현재 집계된 실행관리 신호만으로 특정 문제점을 단정하지 않습니다. KPI별 상세분석과 실적 추이를 함께 확인해 주시기 바랍니다.','');en.push('[Key Issues and Implications]','- No specific issue is inferred solely from the current execution-signal counts. Review the KPI-level findings together with performance trends.','')}
 ko.push('[대시보드 요약]','- Executive Dashboard와 실적 × 회신 심층검증 Dashboard를 메일 본문에 최신 화면 그대로 삽입합니다.','- 우선 확인: 중점 보완 '+stats.attention+'건 / 전월 반복 근인 '+signals.recurring+'건 / 전월 대책 정체 '+signals.stagnant+'건 / 기한 초과 '+signals.overdue+'건.','- KPI별 상세 사유·근인·대책·담당/기한·교차검증 결과는 첨부 분석파일을 확인해 주시기 바랍니다.','');
 en.push('[Dashboard Summary]','- The dashboard images are included only after capture validation succeeds.','- Priority review: '+stats.attention+' / repeated root causes '+signals.recurring+' / stagnant actions '+signals.stagnant+' / overdue '+signals.overdue+'.','- Please refer to the attached analysis file for KPI-level reasons, root causes, actions, owners/due dates, and cross-validation details.','');
 ko.push('[검토 및 후속조치 요청]','개별 KPI별로 별도의 소명자료나 추가 회신을 제출하실 필요는 없습니다. 다만, 해당 사업장에서는 공유된 분석결과와 검토 의견을 면밀히 확인하고, 미달성 원인과 회복조치의 적정성, 담당자·완료예정일 및 조치 후 KPI 회복 여부를 자체 점검하여 필요한 개선과 후속 대응을 추진해 주시기 바랍니다. 추가 증빙은 판단에 필요한 경우에만 최소 범위로 요청드리겠습니다.','','감사합니다.','서지철 드림');
 en.push('[Review and Follow-up Actions]','A separate written response or supporting explanation for each individual KPI is not required. However, the plant is expected to carefully review the shared findings, internally assess the validity of root causes, effectiveness of recovery actions, assigned owners and due dates, and whether KPI performance has recovered. Please take appropriate corrective and follow-up actions where necessary. Additional evidence will be requested only where essential for validation.','','Best Regards,','Mr.Seoh');
 if(!drafts.ko)drafts.ko=ko.join('\n');if(!drafts.en)drafts.en=en.join('\n');
 const subject=(lang==='ko'?'[HDPS KPI] 회신 상세 검토 및 후속조치 요청 - ':'[HDPS KPI] Detailed Reply Review and Follow-up - ')+({india:'India',brazil:'Brazil',ulsan:'Ulsan'}[plant]||plant);
 const retainedDeep=get('hd24DeepValidation');if(retainedDeep)retainedDeep.remove();box.innerHTML=`<div class="hd24-section-tag">REPLY ANALYTICS</div><h2>회신 상세분석 대시보드</h2><p class="hint">상단은 관리자가 즉시 판단할 핵심 신호만 요약하고, KPI별 회신 내용은 아래 상세분석 영역에서 분리해 확인합니다.</p><section id="hd24ExecutiveDashboard" style="padding:18px;border:1px solid #cbd8e6;border-radius:12px;background:#f7faff;margin:14px 0 24px"><div style="display:flex;justify-content:space-between;align-items:end;gap:12px;margin-bottom:12px"><div><b style="font-size:18px;color:#17324d">① Executive Dashboard</b><div style="margin-top:4px;color:#66788a;font-size:13px">회신 품질 및 실행관리 핵심 신호</div></div><div style="font-size:12px;color:#66788a">상세내용은 아래 KPI별 분석에서 확인</div></div><div class="hd24-kpi-strip"><div class="hd24-kpi-mini hd24-exec-drill" data-exec-drill="total"><span>분석 KPI</span><b>${stats.total}</b></div><div class="hd24-kpi-mini hd24-exec-drill" data-exec-drill="complete"><span>충분 · 추가보완 없음</span><b>${stats.complete}</b></div><div class="hd24-kpi-mini hd24-exec-drill" data-exec-drill="review"><span>보완 필요 · 단일/경미 결함</span><b>${stats.review}</b></div><div class="hd24-kpi-mini hd24-exec-drill" data-exec-drill="attention"><span>중점 보완 · 복합/핵심 결함</span><b>${stats.attention}</b></div></div><div style="margin-top:10px;display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:8px"><div class="hd24-kpi-mini hd24-exec-drill" data-exec-drill="history"><span>이전 회신 비교</span><b>${stats.history>0?stats.history+'건':'[최초 시행]'}</b></div><div class="hd24-kpi-mini hd24-exec-drill" data-exec-drill="recurring"><span>전월 반복 근인</span><b>${signals.recurring}</b></div><div class="hd24-kpi-mini hd24-exec-drill" data-exec-drill="stagnant"><span>전월 대책 정체</span><b>${signals.stagnant}</b></div><div class="hd24-kpi-mini hd24-exec-drill" data-exec-drill="overdue"><span>기한 초과</span><b>${signals.overdue}</b></div><div class="hd24-kpi-mini hd24-exec-drill" data-exec-drill="retrospective"><span>회고 취약</span><b>${signals.retrospective}</b></div></div><div style="margin-top:12px;padding:13px 14px;border:1px solid #d7e0e9;border-radius:9px;background:#fff"><b style="color:#17324d">지표 범례 · 집계 의미</b><div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px 18px;margin-top:9px;font-size:12.5px;line-height:1.5;color:#4d6276"><div><b>분석 KPI</b> · 현재 선택 분석기간에 회신 검토 대상이 된 KPI 수</div><div><b>충분</b> · 핵심 회신정보가 갖춰지고 내용 품질·반복성·실행관리 검토에서도 추가 보완신호가 없는 KPI 수</div><div><b>보완 필요</b> · 핵심정보는 대체로 갖췄으나 단일 필수항목 누락, 근인·대책 구체성 부족, 반복성 등 보완신호가 있는 KPI 수</div><div><b>중점 보완</b> · 근인·대책·담당·기한 중 핵심항목 2개 이상 누락 또는 필수정보 67% 미만인 KPI 수. 반복근인·대책정체는 단독으로 중점보완을 만들지 않고 별도 실행관리 신호로 관리</div><div><b>이전 회신 비교</b> · 최초 회신파일 반영 시 <b>[최초 시행]</b>으로 표시하고, 실제 재회신(replySequence 2 이상)부터 직전 회신과 비교 가능한 KPI를 OO건으로 표시</div><div><b>전월 반복 근인</b> · 전월 대비 동일 근본원인이 반복되어 근인 제거효과 재검증이 필요한 KPI 수</div><div><b>전월 대책 정체</b> · 전월 대비 동일 만회대책이 반복되어 실행효과 확인이 필요한 KPI 수</div><div><b>기한 초과</b> · 완료예정일이 경과했으나 완료가 확인되지 않은 KPI 수</div><div><b>회고 취약</b> · 조치 결과·효과 검증 또는 차기 반영에 대한 회고가 부족한 KPI 수</div></div><div style="margin-top:8px;font-size:12px;color:#718294">※ 품질등급 검산: 충분 ${stats.complete} + 보완 필요 ${stats.review} + 중점 보완 ${stats.attention} = ${stats.total}건 · ${classificationOk?"정상":"집계 오류"}. 각 숫자는 KPI 달성/미달 건수가 아니라 <b>회신 품질 및 실행관리 상태</b>를 나타냅니다.</div></div><div style="margin-top:12px;padding:11px 13px;border-left:4px solid #1d4e7d;background:#fff"><b>관리 해석</b><div style="margin-top:4px;color:#51657a">반복 원인, 동일 대책 정체, 기한 경과, 활동결과 회고 부족을 우선 관리합니다. 추가 자료는 판단에 필요한 최소 범위만 요청합니다.</div></div></section><section style="padding:18px;border:1px solid #d8e0e8;border-radius:12px;background:#fff"><div style="display:flex;justify-content:space-between;align-items:end;gap:12px;padding-bottom:12px;border-bottom:1px solid #e4e9ef"><div><b style="font-size:18px;color:#17324d">② KPI별 상세분석</b><div style="margin-top:4px;color:#66788a;font-size:13px">사유 · 근본원인 · 만회계획 · 담당/기한 · 보완요청을 KPI 단위로 확인</div></div></div>`+(demo?'<p style="color:#a45300;font-weight:bold">샘플 분석 · 실제 회신 이력과 무관하며 저장·발송되지 않습니다.</p>':'')+
 
 '<div id="hd24FeedbackAnalysisPurpose" style="margin:12px 0;padding:11px 13px;border-left:3px solid #1d4e7d;background:#f7f9fb;color:#435b73;font-size:13px">KPI별 검증 결과 · 문제 근거 · 필요한 보완조치 · 후속 확인사항을 확인합니다.</div><div id="hd24FeedbackExportStatus" aria-live="polite" style="display:none"></div><details id="hd24FeedbackDetailBox" style="margin-top:10px;border:1px solid #d8e0e8;border-radius:9px;background:#fbfdff"><summary style="cursor:pointer;padding:11px 13px;font-weight:800;color:#17324d">KPI별 상세분석 펼쳐보기 · 필요 시에만 확인</summary><div id="hd24FeedbackFindings" style="height:280px;max-height:36vh;overflow:auto;overscroll-behavior:contain;padding:4px 10px 8px;border-top:1px solid #eef2f6"></div></details><div style="margin-top:8px;font-size:12px;color:#718294">※ 기본 화면은 대시보드 중심으로 유지하고, KPI 상세는 접힌 상태에서 필요할 때만 펼쳐 내부 스크롤로 확인합니다.</div></section>';
 if(mailPanel&&!window.__HD24_FEEDBACK_SEND_BUSY__)mailPanel.innerHTML=`<div class="hd24-section-tag">REPLY FEEDBACK MAIL</div><h2>회신 피드백 메일</h2><p class="hint">회신 상세분석 결과와 재피드백 Excel을 첨부하여 별도로 발송합니다.</p><div style="margin:22px 0 10px;padding:14px 16px;border-left:5px solid #1d4e7d;background:#f3f7fb"><b style="font-size:18px">② 회신 분석결과 별도 메일링</b><div style="margin-top:4px;color:#51657a">위 분석결과를 기반으로 해외사업장에 보낼 피드백 메일입니다.</div></div><h4 style="margin:0 0 8px;font-size:17px">메일 작성 · 검토 · 발송</h4><p style="margin:6px 0 12px;color:#51657a">최초 KPI 메일과 별개로, 등록된 회신의 사유·근본원인·만회계획을 분석한 피드백 메일입니다.</p><div style="display:flex;gap:8px;margin:12px 0"><button type="button" id="hd24FeedbackKo">한글 · 영문 발송내용 검토</button><button type="button" id="hd24FeedbackEn">English · 해외 발송</button></div><label>메일 제목</label><input id="hd24FeedbackSubject" style="width:100%;padding:10px;margin:6px 0 12px"><label>메일 본문 (수정 가능)</label><textarea id="hd24FeedbackDraft" rows="18" style="width:100%;padding:16px;font-size:14px;line-height:1.7;border:1px solid #b9c9da;border-radius:8px;background:#fff"></textarea><div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:12px 0"><div><label>수신자</label><input id="hd24FeedbackTo" style="width:100%;padding:10px" readonly placeholder="실적분석 메일 수신자 자동 동기화"></div><div><label>참조(CC)</label><input id="hd24FeedbackCc" readonly style="width:100%;padding:10px;background:#f3f6f9;color:#51657a" placeholder="실적분석 메일 참조 자동 동기화"></div></div><div style="padding:12px 14px;background:#f7faff;border:1px solid #cbd8e6;border-radius:8px;margin:10px 0"><b>첨부파일</b><div id="hd24FeedbackAttachment">재피드백 Excel 생성상태 확인 중</div></div><div style="display:flex;gap:12px;align-items:flex-start;flex-wrap:wrap;margin-top:12px"><div style="display:flex;gap:8px;align-items:center"><button id="hd24FeedbackCopy" type="button">현재 언어 메일 복사</button><button id="hd24FeedbackSend" type="button">회신 피드백 메일 발송</button></div><div style="flex:1;min-width:300px"><div id="hd24FeedbackSendStatus" style="font-size:13px;color:#51657a;margin-bottom:6px">발송 대기</div><div id="hd24FeedbackMailLog" style="max-height:92px;overflow:auto;border:1px solid #dde1e6;border-radius:6px;background:#f7f8fa;padding:8px 10px;font-size:12px;line-height:1.45;color:#17324d">발송 이력 없음</div></div></div><p>한글은 검토용이며 실제 해외 발송은 영문을 사용합니다. 추가 자료는 분석상 필요한 최소 범위만 요청합니다.</p>`;
 box.querySelectorAll('.hd24-exec-drill').forEach(card=>{card.style.cursor='pointer';card.title='클릭하여 상세그리드 보기';card.onclick=()=>showExecDrill(card.dataset.execDrill,card.querySelector('span')?.textContent||'Executive Dashboard',analyses)});
 const detailSummary=get('hd24FeedbackDetailBox');if(detailSummary){const count=analyses.length;const summary=detailSummary.querySelector('summary');if(summary)summary.textContent='KPI별 검증결과 '+count+'건 · 클릭하여 상세 확인';}
 const findings=get('hd24FeedbackFindings');
 analyses.forEach(({r,a,history})=>{const d=document.createElement('details');d.open=false;d.style.cssText='margin:10px 0;border:1px solid #cbd8e6;border-radius:10px;background:#fff;box-shadow:0 2px 7px rgba(29,78,125,.07)';const s=document.createElement('summary');s.style.cssText='cursor:pointer;padding:14px 16px;font-weight:800;font-size:15px;color:#17324d';s.textContent=r.targetMonth+'M / '+(r.kpiEn||r.kpi)+' · '+a.level+' · 필수정보 '+a.score+'%'+(history.length>1?' · 회신 '+history.length+'차':'');d.append(s);const body=document.createElement('div');body.style.cssText='padding:4px 16px 16px;line-height:1.75;background:#fbfdff';const vals=[['미달성 사유',a.reason],['근본원인',a.root],['만회계획',a.plan],['담당자',a.owner],['완료예정일',a.due],['차월 회복목표',a.target]];body.innerHTML=vals.map(x=>'<div><b>'+x[0]+'</b> · '+esc(x[1]||'미기재')+'</div>').join('')+(a.flags.length?'<div style="margin-top:8px"><b>검토 포인트</b><ul>'+a.flags.map(x=>'<li>'+esc(x[0])+'</li>').join('')+'</ul></div>':'<div style="margin-top:8px"><b>검토 포인트</b> · 필수 항목 기재 확인. 차기 실적에서 개선효과 검증 필요</div>');d.append(body);findings.append(d)});
 const syncedRecipients=syncFeedbackRecipients();const linkedTo=syncedRecipients.to,linkedCc=syncedRecipients.cc;if(get('hd24FeedbackAttachment'))get('hd24FeedbackAttachment').textContent=latestFeedbackAttachment&&latestFeedbackAttachment.plant===plant?latestFeedbackAttachment.filename+' · 메일 첨부 준비 완료':'HDPS_KPI_Reply_Feedback_'+plant+'_YYYY-MM-DD.xlsx · 분석 완료 후 자동 생성';let mh=[];try{mh=JSON.parse(localStorage.getItem(SEND_LOG)||'[]')}catch{}if(get('hd24FeedbackMailLog')){const logs=mh.filter(x=>x.plant===plant).slice(0,8);get('hd24FeedbackMailLog').innerHTML=logs.length?logs.map(x=>{const ok=x.status==='sent',pack=x.status==='outlook-package-downloaded',label=ok?'발송 성공':pack?'Outlook 패키지':x.status==='send-unconfirmed'?'발송 여부 미확인':'발송 실패',t=x.sentAt||x.failedAt||x.packagedAt||'',route=(x.to?' · To '+esc(x.to):'')+(x.cc?' · CC '+esc(x.cc):''),err=x.error?' · '+esc(x.error):'';return '<div style="padding:3px 0;border-bottom:1px solid #e7eaee"><b>'+label+'</b> · '+(t?new Date(t).toLocaleString():'-')+route+err+'</div>'}).join(''):'발송 이력 없음'}get('hd24FeedbackSubject').value=subject;get('hd24FeedbackDraft').value=drafts[lang];get('hd24FeedbackDraft').oninput=e=>drafts[lang]=e.target.value;
 if(get('hd24FeedbackKo'))get('hd24FeedbackKo').onclick=()=>{drafts[lang]=get('hd24FeedbackDraft').value;lang='ko';render()};if(get('hd24FeedbackEn'))get('hd24FeedbackEn').onclick=()=>{drafts[lang]=get('hd24FeedbackDraft').value;lang='en';render()};
 if(retainedDeep)box.prepend(retainedDeep);else window.hd24DeepReplyValidation?.renderScheduled?.(0);ensureDashboardLanguageControl();
 get(lang==='ko'?'hd24FeedbackKo':'hd24FeedbackEn').style.cssText='background:#1d4e7d;color:#fff';
 if(!demo&&exportKey&&(!latestFeedbackAttachment||latestFeedbackAttachment.plant!==plant||exportKey!==lastExportKey)){lastExportKey=exportKey;latestFeedbackAttachment=null;setTimeout(()=>exportFeedbackWorkbook(rows,plant,exportKey).catch(e=>{if(lastExportKey!==exportKey)return;lastExportKey='';const st=get('hd24FeedbackExportStatus');if(st)st.textContent='피드백 Excel 추출 실패 · '+(e?.message||e)+' · '+String(e?.stack||'').split('\n').slice(1,3).map(x=>x.trim()).join(' | ');console.error('[HD24] feedback Excel export failure',e)}),80)}
  get('hd24FeedbackCopy').disabled=demo;get('hd24FeedbackCopy').onclick=()=>navigator.clipboard.writeText(get('hd24FeedbackSubject').value+'\n\n'+get('hd24FeedbackDraft').value);
 const send=get('hd24FeedbackSend'),status=get('hd24FeedbackSendStatus');if(send){const mailApiConfigured=!!(window.HD24_MAIL_ENDPOINT||localStorage.getItem('hd24_mail_endpoint_v1')||'').trim();send.textContent=mailApiConfigured?'회신 피드백 메일 발송':'Outlook 메일 파일 생성 (.eml)';send.disabled=demo;send.title=demo?'샘플 미리보기는 발송할 수 없습니다. 실제 회신 Excel을 등록하세요.':mailApiConfigured?'메일 서버를 통해 회신 피드백을 발송합니다.':'메일 서버가 연결되지 않아 Outlook용 미발송 파일을 생성합니다. 직접 열어 발송하세요.';send.onclick=async()=>{if(send.disabled)return;if(demo){status.textContent='샘플 미리보기는 발송할 수 없습니다. 실제 회신 Excel을 등록한 뒤 발송해주세요.';return}send.disabled=true;status.textContent=mailApiConfigured?'메일 발송 준비 중...':'Outlook 메일 파일 생성 준비 중...';window.__HD24_FEEDBACK_SEND_BUSY__=true;const endpoint=(window.HD24_MAIL_ENDPOINT||localStorage.getItem('hd24_mail_endpoint_v1')||'').trim();const subject=get('hd24FeedbackSubject').value.trim(),body=get('hd24FeedbackDraft').value.trim();if(!subject||!body){status.textContent='제목/본문을 확인해주세요.';send.disabled=false;window.__HD24_FEEDBACK_SEND_BUSY__=false;return}const syncedRecipients=syncFeedbackRecipients(),to=syncedRecipients.to,managedCc=syncedRecipients.cc;if(get('hd24FeedbackCc'))get('hd24FeedbackCc').value=managedCc;let priorUnconfirmed=[];try{priorUnconfirmed=JSON.parse(localStorage.getItem(SEND_LOG)||'[]')}catch{}if(priorUnconfirmed.some(x=>x.status==='send-unconfirmed'&&x.plant===plant&&x.to===to&&x.subject===subject)){status.textContent='발송 여부 미확인 이력이 있습니다. 중복 발송 방지를 위해 발송 로그 및 수신함 확인 후 진행하세요.';send.disabled=false;window.__HD24_FEEDBACK_SEND_BUSY__=false;return}if(!to){status.textContent='실적분석 메일의 담당자/수신자를 먼저 선택해주세요.';get('mailTo')?.focus();send.disabled=false;window.__HD24_FEEDBACK_SEND_BUSY__=false;return}if(!latestFeedbackAttachment||latestFeedbackAttachment.plant!==plant||latestFeedbackAttachment.exportKey!==exportKey){status.textContent='재피드백 Excel 자동 생성 중...';try{await exportFeedbackWorkbook(rows,plant)}catch(e){status.textContent='Excel 자동 생성 실패: '+(e?.message||e)+' · '+String(e?.stack||'').split('\n').slice(1,3).map(x=>x.trim()).join(' | ');console.error('[HD24] feedback Excel send-stage export failure',e);send.disabled=false;window.__HD24_FEEDBACK_SEND_BUSY__=false;return}if(!latestFeedbackAttachment||latestFeedbackAttachment.plant!==plant||latestFeedbackAttachment.exportKey!==exportKey){status.textContent='최신 회신 분석과 첨부 Excel의 데이터 버전이 일치하지 않습니다.';send.disabled=false;window.__HD24_FEEDBACK_SEND_BUSY__=false;return}}const activePlant=(get('plantSelect')?.value||plant).trim();if(activePlant!==plant){status.textContent='사업장이 변경되었습니다. 메일 화면을 갱신합니다.';resetForPlantChange();send.disabled=false;window.__HD24_FEEDBACK_SEND_BUSY__=false;return}status.textContent='대시보드 2개 캡처 중...';let dashboardImages=[];try{dashboardImages=await captureFeedbackDashboards()}catch(e){dashboardImages=[];status.textContent='발송 차단: '+(e?.message||'대시보드 캡처 실패');send.disabled=false;window.__HD24_FEEDBACK_SEND_BUSY__=false;return}if((get('plantSelect')?.value||plant)!==plant||lastExportKey!==exportKey||latestFeedbackAttachment?.exportKey!==exportKey||(()=>{try{const fresh=JSON.parse(localStorage.getItem(KEY)||'[]').filter(r=>r.plant===plant);fresh.sort((a,b)=>String(b.replyReceivedAt||'').localeCompare(String(a.replyReceivedAt||''))||Number(b.replySequence||0)-Number(a.replySequence||0));const freshGroups=[];fresh.forEach(r=>{const year=Number(r.targetYear)||2026;let g=freshGroups.find(x=>x.year===year&&x.month===Number(r.targetMonth)&&sameKpi(x.rows[0],r));if(!g){g={year,month:Number(r.targetMonth),rows:[]};freshGroups.push(g)}g.rows.push(r)});return plant+'|'+JSON.stringify({rows:freshGroups.map(g=>g.rows[0]),saved:fresh})!==exportKey}catch{return true}})()){status.textContent='발송 차단: 대시보드 캡처 중 사업장 또는 회신 데이터가 변경되었습니다. 다시 생성해주세요.';send.disabled=false;window.__HD24_FEEDBACK_SEND_BUSY__=false;return}if(dashboardImages.length!==2){status.textContent='발송 차단: 대시보드 이미지 '+dashboardImages.length+'/2개만 캡처되었습니다. 이미지가 없는 불완전한 메일은 생성하지 않습니다.';send.disabled=false;window.__HD24_FEEDBACK_SEND_BUSY__=false;return;}if(!endpoint){if(get('hd24FeedbackCc'))get('hd24FeedbackCc').value=managedCc;const eml=feedbackEml({to,cc:managedCc,subject,body,attachment:latestFeedbackAttachment,images:dashboardImages}),name=`HDPS_KPI_Reply_Feedback_${plant}_${new Date().toISOString().slice(0,10)}_Outlook.eml`,file=new File([eml],name,{type:'message/rfc822'});const validEml=eml.startsWith('X-Unsent: 1\r\nMIME-Version: 1.0\r\n')&&eml.includes('\r\nSubject: =?UTF-8?B?')&&eml.includes('\r\nContent-Type: multipart/mixed; boundary=')&&eml.includes('\r\n--')&&eml.includes('Content-Disposition: attachment')&&dashboardImages.every(img=>eml.includes('Content-ID: <'+img.cid+'>')&&dashboardHtml(body,dashboardImages).includes('cid:'+img.cid)&&eml.includes('Content-Type: image/png; name='));if(!validEml||file.size<1000){status.textContent='Outlook EML MIME 검증 실패 · 다운로드를 중단했습니다.';send.disabled=false;window.__HD24_FEEDBACK_SEND_BUSY__=false;return}downloadFeedbackEml(file);let h=[];try{h=JSON.parse(localStorage.getItem(SEND_LOG)||'[]')}catch{}h.unshift({plant,to,cc:managedCc,subject,packagedAt:new Date().toISOString(),status:'outlook-package-downloaded'});localStorage.setItem(SEND_LOG,JSON.stringify(h.slice(0,100)));status.textContent='Outlook 메일 패키지 다운로드 완료 · 첨부 Excel 포함 · .eml을 열어 확인 후 보내기';send.disabled=false;window.__HD24_FEEDBACK_SEND_BUSY__=false;return}send.disabled=true;status.textContent='회신 분석결과 발송 중...';try{const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),30000);let res;try{res=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({to,cc:managedCc,subject,body,plant,targetMonth:null,mailType:'reply-feedback',attachment:latestFeedbackAttachment&&latestFeedbackAttachment.plant===plant?{filename:latestFeedbackAttachment.filename,mimeType:latestFeedbackAttachment.mimeType,base64:latestFeedbackAttachment.base64,plant:latestFeedbackAttachment.plant,createdAt:latestFeedbackAttachment.createdAt}:null,dashboardImages,bodyHtml:dashboardHtml(body,dashboardImages)}),signal:controller.signal})}finally{clearTimeout(timer)}const t=await res.text();if(!res.ok)throw new Error('HTTP '+res.status+(t?' · '+t.slice(0,160):''));let api=null;try{api=t?JSON.parse(t):null}catch{throw new Error('메일 API 응답이 JSON 형식이 아닙니다. 발송 성공을 확인할 수 없습니다.')}if(!api||api.success!==true)throw new Error(api?.error||api?.message||'메일 API의 명시적 발송 성공 확인(success: true)이 없습니다.');let h=[];try{h=JSON.parse(localStorage.getItem(SEND_LOG)||'[]')}catch{}h.unshift({plant,to,cc:managedCc,subject,sentAt:new Date().toISOString(),status:'sent'});localStorage.setItem(SEND_LOG,JSON.stringify(h.slice(0,100)));status.textContent='회신 분석결과 메일 발송 성공 · '+new Date().toLocaleString();}catch(e){const uncertain=e?.name==='AbortError'||e instanceof TypeError;const error=(e?.name==='AbortError'?'30초 응답시간 초과 · 서버 처리 여부 미확인':e?.message||e);let h=[];try{h=JSON.parse(localStorage.getItem(SEND_LOG)||'[]')}catch{}h.unshift({plant,to,cc:managedCc,subject,failedAt:new Date().toISOString(),status:uncertain?'send-unconfirmed':'send-failed',error:String(error)});localStorage.setItem(SEND_LOG,JSON.stringify(h.slice(0,100)));status.textContent=(uncertain?'발송 결과 미확인 · 중복 발송 방지를 위해 로그와 수신함을 확인하세요 · ':'발송 실패 · ')+error}finally{send.disabled=demo;window.__HD24_FEEDBACK_SEND_BUSY__=false}}}
}
function resetForPlantChange(){drafts={ko:'',en:''};draftKey='';demo=false;lastExportKey='';latestFeedbackAttachment=null;const mail=get('hd24FeedbackMail');if(mail)mail.innerHTML='';render()}
function wire(){if(window.__HD24_REPLY_FEEDBACK_WIRED__)return;window.__HD24_REPLY_FEEDBACK_WIRED__=true;setTimeout(render,700);document.addEventListener('hd24:reply-imported',()=>setTimeout(render,50));document.addEventListener('input',e=>{if(e.target?.id==='mailTo'||e.target?.id==='mailCc')syncFeedbackRecipients()});document.addEventListener('change',e=>{if(e.target?.id==='plantSelect'){resetForPlantChange();return}if(e.target?.id==='mailTo'||e.target?.id==='mailCc'){syncFeedbackRecipients();return}if(e.target?.id==='contactSelect'){setTimeout(syncFeedbackRecipients,0);return}if(e.target?.id==='hd24ReplyFile')setTimeout(render,1200)});document.addEventListener('click',e=>{if(e.target?.id==='hd24ImportReply')setTimeout(render,1200)})}if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',wire,{once:true});else wire();
window.hd24ReplyFeedback={render};document.dispatchEvent(new CustomEvent('hd24:reply-feedback-ready'));
})();
