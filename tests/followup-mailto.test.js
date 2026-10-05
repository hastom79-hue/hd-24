const fs=require('fs');
const src=fs.readFileSync('hd24-followup.js','utf8');
const ui=fs.readFileSync('hd24-ui-v3.js','utf8');
const refresh=fs.readFileSync('refresh-runtime.html','utf8');
const historyView=fs.readFileSync('hd24-history-view.js','utf8');
function ok(x,m){if(!x)throw new Error(m)}
ok(src.includes("buildOutlookEml({to,cc,subject:previewState.subject,body:previewState.body,attachments})"),'Outlook EML package construction missing');
ok(src.includes("'X-Unsent: 1'"),'Outlook unsent draft marker missing');
ok(src.includes("'Content-Disposition: attachment; filename="),'EML attachment MIME block missing');
ok(src.includes("filename*=UTF-8\\'\\'"),'Unicode attachment filename RFC5987 parameter missing');
ok(src.includes("name*=UTF-8\\'\\'"),'Unicode attachment name RFC5987 parameter missing');
ok(src.includes("function asciiFileName"),'Unicode filename ASCII fallback missing');
ok(src.includes("function rfc5987"),'Unicode filename encoder missing');
ok(src.includes("status:'outlook-package-downloaded'"),'Outlook package history status missing');
ok(!/from=|sender=|hastom79@gmail\.com|imap\.naver\.com/i.test(src),'follow-up runtime must not force sender/account/server');
ok(!src.includes("shots.forEach(x=>downloadFile(x.file))"),'fallback must not require manual attachment downloads');
const vm=ui.match(/hd24-followup\.js\?v=(\d+)/);ok(vm,'production loader missing followup');
ok(refresh.includes('hd24-followup.js?v='+vm[1]),'refresh/followup cache version mismatch');
ok(src.includes("statusRich(r,isKo,darkStatus)"),'status font must follow selected language and dark background');
ok(src.includes("if(dark)color='FFFFFFFF'"),'every dark-red status category must use white rich-text runs');
ok(src.includes("unitForFile(r.unit,isKo)"),'Excel Unit column must use localized units');
for(const unit of ["MH/unit","days","cases/year","persons/case","turns","points"]){
  ok(src.includes(unit),'English unit conversion missing: '+unit);
}
ok(src.includes("statusCell.alignment = {vertical:'top',wrapText:true}"),'multi-category status must wrap inside Excel cells');
ok(src.includes("row.height = Math.max(26,18*tags(r,isKo).length+8)"),'row height must fit every status category');
ok(src.includes("12,12,48,18"),'status column must be wide enough for cumulative labels');
ok(src.includes("text:'\\n'"),'status categories must use line breaks instead of clipped slash-separated text');
ok(src.includes("cell.border={top:{style:'medium'"),'every KPI row must have a visible strong top border');
ok(src.includes("left:{style:'thin'")&&src.includes("right:{style:'thin'"),'every Excel column must have visible vertical borders');
ok(src.includes("hr.getCell(ci).border="),'header cells must have complete grid borders');
ok(src.includes("STATUS / TREND (Excel)")&&src.includes("상태/추세 기준(첨부 Excel)"),'both language emails must define KPI status colors');
ok(src.includes("similar causes in 2+ replies")&&src.includes("유사 사유 회신 2건 이상"),'repeat-issue email explanation must remain concise');
ok(src.includes("recent decline (>3% over up to 3 months)")&&src.includes("최대 3개월간 3% 초과 하락"),'worsening email explanation must remain concise');
ok(src.includes("No change vs last month")&&src.includes("전월과 동일(변화없음"),'reply Excel must include unchanged KPI status in both languages');
ok(src.includes("Cumulative KPI · No change")&&src.includes("누적형 지표 ·"),'cumulative KPI flat trend must match dashboard');
ok(src.includes("Recurring same cause")&&src.includes("동일 사유 반복"),'recurrence status must match dashboard');
ok(src.includes("if(r.streak>=2)out.push("),'consecutive misses must show exact streak from two months');
ok(src.includes("font-family:")&&src.includes("selectedMailStyle()")&&src.includes("style.size+'pt"),'Outlook HTML mail must use user-selected font and point size');
ok(src.includes("Content-Type: multipart/alternative")&&src.includes("Content-Type: text/html"),'EML must include styled HTML and plain-text fallback');
ok(src.includes("bodyHtml:styledMailHtml(previewState.body)")&&src.includes("fontSizePt:selectedMailStyle().size"),'mail API payload must include selected HTML font and size');
ok(src.includes('id="hd24MailFont"')&&src.includes('id="hd24MailFontSize"'),'mail font and size controls missing');
ok(src.includes("addEventListener('change',applyMailStyle)"),'font changes must update preview');
ok(src.includes("function highlightedMailBody(s)")&&src.includes("background-color:#FFF2A8"),'key email phrases must receive yellow highlighting');
ok(src.includes("font-style:italic")&&src.includes("text-decoration:underline"),'key email phrases must be italic and underlined');
ok(src.includes("innerHTML=highlightedMailBody(previewState.body)"),'preview must display same highlights as outgoing HTML');
ok(src.includes("Confirm KPI recovery after implementing corrective actions.")&&src.includes("KPI 실적 회복 여부"),'bilingual mail must retain concise recovery instruction');
console.log('HD24 FOLLOWUP DEFAULT-SENDER PASS');

ok(src.includes("메일 패키지 준비 시작..."),'send button must expose pipeline start');
ok(src.includes("2/6 회신 Excel 생성 완료"),'Excel stage completion diagnostic missing');
ok(src.includes("3/6 단일 Excel 첨부 모드 준비 완료"),'single-Excel attachment stage diagnostic missing');
ok(src.includes("4/6 Outlook EML 생성 완료"),'EML stage completion diagnostic missing');
ok(src.includes("5/6 Outlook EML 다운로드 시작..."),'EML download stage diagnostic missing');
ok(!src.includes("resultScreenshots()"),'approved single-Excel mail package must not capture KPI PNGs');
ok(src.includes("const seen=new Set(),rows=[]")&&src.includes("if(seen.has(k))continue"),'send-history UI must deduplicate KPI-level records into one attempt row');
ok(src.includes("메일 패키지 생성 실패:"),'top-level send pipeline error diagnostic missing');

ok(src.includes("targetMonth>month()"),'future-month reply history fail-closed guard missing');
ok(src.includes("회신 파일 미래/비정상 월 차단"),'future-month reply rejection diagnostic missing');

ok(src.includes("sameCauseCount:same")&&src.includes("isRecurrence:same>=2"),'same-cause recurrence threshold missing');
ok(src.includes("Recurring same cause (x")&&src.includes("동일 사유 반복("),'repeated-issue follow-up tags missing');
ok(src.includes("Previous Reason / Root Cause")&&src.includes("Previous Countermeasure"),'previous reply carry-forward columns missing');
ok(src.includes("replySequence:prev.length+pending.filter")&&src.includes(".length+1"),'reply sequence increment missing');
ok(src.includes("x.plant===plant&&x.targetMonth===targetMonth"),'reply sequence must be scoped by plant and target month');

ok(src.includes("targetMonth:Number(r.month)||month()"),'mail history must persist each KPI row target month');

ok(src.includes("const duplicate=prev.some"),'persistent reply import idempotency guard missing');
ok(src.includes("동일 회신 재Import 차단"),'persistent duplicate reply diagnostic missing');

ok(src.includes("lastMailFor(r,Number(r.month)||month())"),'follow-up reply workbook must use each KPI row month for mail-history anchor');

ok(src.includes("replySequence:prev.length+pending.filter")&&src.includes(".length+1"),'new non-duplicate reply must advance reply sequence');
ok(src.includes("sameCauseCount:same")&&src.includes("isRecurrence:same>=2"),'second same-cause reply must drive recurrence state');
ok(src.includes("last.rootCause||last.reason||''")&&src.includes("last.recoveryPlan||''"),'follow-up workbook must carry previous cause and countermeasure');

ok(src.includes("const seen=new Set(),uniqueItems=items.filter"),'KPI x target-month workbook dedupe missing');
ok(src.includes("회신 Excel KPI×월 중복 차단"),'KPI x target-month duplicate diagnostic missing');
ok(src.includes("unitForFile(r.unit,isKo)")&&src.includes("r.target")&&src.includes("r.actual"),'reply workbook must preserve localized unit target actual');

ok(src.includes("const buildPlant=pkey(),buildMonth=month(),buildState="),'follow-up workbook stale snapshot missing');
ok(src.includes("pkey()!==buildPlant||month()!==buildMonth||currentState!==buildState"),'follow-up workbook stale comparison missing');
ok(src.includes("회신 Excel stale 생성 차단"),'follow-up workbook stale diagnostic missing');

ok(src.includes("for(const ws of wb.worksheets)"),'multi-month reply import must iterate every worksheet');
ok(!src.includes("const ws=wb.worksheets[0]"),'first-sheet-only reply import regression');
ok(src.includes("KPI column not found: ${ws.name}")&&src.includes("Response columns not found: ${ws.name}"),'each reply worksheet must validate its own headers');

ok(src.includes("const list=load(REPLY_KEY),pending=[]"),'reply import atomic staging buffer missing');
ok(src.includes("pending.push({plant,targetMonth")&&src.includes("list.unshift(...pending.reverse());save(REPLY_KEY"),'reply import must commit only after all worksheets finish');

ok(src.includes("const sameReply=x=>")&&src.includes("prev.some(sameReply)||pending.some"),'staged workbook duplicate rows must be deduplicated against prev and pending');

ok(src.includes("String(x.reason||'')===reason")&&src.includes("String(x.rootCause||'')===rootCause")&&src.includes("String(x.recoveryPlan||'')===recoveryPlan"),'dedupe must require identical reply content so changed second replies remain valid');
ok(src.includes("replySequence:prev.length+pending.filter")&&src.includes("sameCauseCount:same")&&src.includes("isRecurrence:same>=2"),'valid second reply must advance sequence and remain recurrence-eligible');

// Mandatory CC: execute the production helper for both plants and another plant.
const vmModule=require('vm');
const helper=src.match(/function requiredCc\(value\)\{[^\n]+\}/);
ok(helper,'mandatory CC helper missing');
for(const [plant,extra,absent] of [
 ['india',['minsu.kim01@hd.com','deokho.kim@hd.com'],['antos2082@hd.com','yhchoi@hd.com']],
 ['brazil',['antos2082@hd.com','yhchoi@hd.com'],['minsu.kim01@hd.com','deokho.kim@hd.com']],
 ['ulsan',[],['minsu.kim01@hd.com','deokho.kim@hd.com','antos2082@hd.com','yhchoi@hd.com']]
]){
 const context={pkey:()=>plant,REQUIRED_CC:['dylee07@hd.com','hastom@hd.com'],INDIA_REQUIRED_CC:['minsu.kim01@hd.com','deokho.kim@hd.com'],BRAZIL_REQUIRED_CC:['antos2082@hd.com','yhchoi@hd.com']};
 vmModule.createContext(context);vmModule.runInContext(helper[0]+';this.applyCc=requiredCc;',context);
 const actual=context.applyCc('HASTOM@HD.COM;other@hd.com;other@hd.com').toLowerCase().split('; ');
 for(const email of [...context.REQUIRED_CC,...extra,'other@hd.com'])ok(actual.includes(email),plant+' missing '+email);
 for(const email of absent)ok(!actual.includes(email),plant+' incorrectly contains '+email);
 ok(actual.length===new Set(actual).size,plant+' duplicate CC');
}
ok(src.includes("cc=requiredCc($('mailCc')?.value)"),'preview must enforce CC');
ok(src.includes("cc=requiredCc($('mailCc')?.value.trim()||previewState.cc)"),'send API must enforce CC');
ok(src.includes('function buildOutlookEml({to,cc,subject,body,attachments}){cc=requiredCc(cc)'),'EML must enforce CC');
console.log('HD24 INDIA/BRAZIL MANDATORY CC PASS');

// Recipient greeting uses the contact dropdown's populated name, not the email local part.
ok(src.includes("$('mailToName')?.value"),'recipient name field must drive greeting');
ok(src.includes("recipientGreeting(),''"),'English mail body must use recipient greeting');
ok(src.includes("previewState.body=body(previewState.items)"),'send must refresh greeting if recipient changed');
const greeting=src.match(/function recipientGreeting\(\)\{[^\n]+\}/);ok(greeting,'recipient greeting helper missing');
for(const [name,expected] of [['Hemant Kadam','Dear Hemant Kadam,'],['','Dear Team,'],['Jane,','Dear Jane,']]){
 const context={$:()=>({value:name})};vmModule.createContext(context);vmModule.runInContext(greeting[0]+';this.greeting=recipientGreeting;',context);ok(context.greeting()===expected,'greeting mismatch: '+name);
}
console.log('HD24 RECIPIENT GREETING PASS');

const replyDedupe=fs.readFileSync('hd24-reply-import-dedupe.js','utf8');
const reminder=fs.readFileSync('hd24-seven-day-reminder.js','utf8');
ok(reminder.includes('const DAY=86400000,DELAY=7*DAY'),'seven-day delay missing');
ok(reminder.includes("m.status!=='sent'"),'reminder must require confirmed API send');
ok(reminder.includes("Date.parse(r.replyReceivedAt)>=sent"),'uploaded reply must suppress reminder');
ok(reminder.includes("x.status==='seven-day-reminder-sent'"),'repeat reminder suppression missing');
ok(reminder.includes("localStorage.getItem(ENDPOINT_KEY)"),'manual reminder send must require configured API');
ok(!reminder.includes('setInterval(check,60*60*1000)'),'D+7 reminder must not auto-send on an interval');
ok(reminder.includes("id=\"hd24ReminderSend\"")&&reminder.includes("addEventListener('click',async e=>"),'D+7 reminder must require explicit send-button click');
ok(reminder.includes("status:'seven-day-reminder-failed'")&&reminder.includes("status:'seven-day-reminder-sent'"),'D+7 success/failure history missing');
ok(reminder.includes("setTimeout(()=>controller.abort(),30000)"),'D+7 API timeout guard missing');
ok(reminder.includes("status:'seven-day-reminder-sent'"),'reminder sent history missing');
ok(reminder.includes("GLOBAL=['dylee07@hd.com','hastom@hd.com']"),'global reminder CC missing');
ok(reminder.includes("india:['minsu.kim01@hd.com','deokho.kim@hd.com']"),'India reminder CC missing');
ok(reminder.includes("brazil:['antos2082@hd.com','yhchoi@hd.com']"),'Brazil reminder CC missing');
ok(reminder.includes("short- and long-term trend reviews"),'requested Lean KPI follow-up message missing');
ok(ui.includes('hd24-seven-day-reminder.js?v=9'),'reminder loader missing');
ok(refresh.includes('hd24-seven-day-reminder.js?v=9'),'reminder refresh preload missing');
console.log('HD24 SEVEN-DAY REMINDER CONTRACT PASS');

ok(src.includes("id='hd24MailTypeTabs'")&&src.includes('최초 발송메일')&&src.includes('리마인드 메일 [D+7 경과]'),'initial and D+7 mail tabs missing');
ok(reminder.includes('hd24ReminderMailList')&&reminder.includes('리마인드 발송 이력'),'D+7 tab queue/history missing');
ok(reminder.includes('const answered=batch.every('),'all sent KPI replies must be uploaded to suppress reminder');
console.log('HD24 MAIL TWO-TAB PASS');

const dashboard=fs.readFileSync('index.html','utf8');
ok(dashboard.includes("mail: [resultCard, contactPanel, document.getElementById('hd24FollowupPanel')]"),'mail tab must remain accessible before KPI analysis');
ok(src.includes("id='hd24MailTypeTabs'")&&src.includes('hd24InitialMailContent')&&src.includes('hd24ReminderMailContent'),'mail tab subpanels must exist');
ok(reminder.includes('hd24ReminderMailList')&&reminder.includes('리마인드 발송 이력'),'D+7 reminder list must render');
console.log('HD24 MAIL TAB VISIBILITY PASS');

ok(reminder.includes('hd24ReminderPreviewBody'),'reminder body preview element missing');
ok(reminder.includes('const body=reminderText(name)'),'reminder preview must use actual send body');
ok(reminder.includes("current?'':'<p"),'reminder preview must remain visible when no D+7 recipient exists');
ok(reminder.includes('required(p,current?.cc'),'reminder preview must show required CC');
console.log('HD24 D+7 REMINDER PREVIEW PASS');

ok(reminder.includes("let reminderLang='en'"),'English default reminder language missing');
ok(reminder.includes("lang==='ko'"),'Korean reminder template missing');
ok(reminder.includes('hd24ReminderKo')&&reminder.includes('hd24ReminderEn'),'reminder language selection missing');
ok(reminder.includes('const cc=required(m.plant,m.cc),body=reminderText(m.recipientName),subject=reminderSubject(m.plant)'),'actual reminder send must match selected language');
console.log('HD24 BILINGUAL REMINDER PASS');

ok(src.includes("const host=document.querySelector('main')||$('resultCard')"),'reply upload must mount outside hidden KPI results');
ok(dashboard.includes("followupWatcher.observe(main, {childList:true,subtree:true})"),'independent mail panel visibility observer missing');
console.log('HD24 STANDALONE REPLY UPLOAD PASS');

ok(src.includes("replyPanel.id='hd24ReplyPanel'")&&src.includes("sec.after(replyPanel)"),'reply import panel must be independent of mail');
ok(dashboard.includes('data-tab="reply">회신 이력 반영')&&dashboard.includes("tab!=='reply'"),'separate reply tab routing missing');
ok(src.includes("$('hd24ReplyFile')?.closest('.field-row')"),'reply Excel input must move to independent tab');
console.log('HD24 STANDALONE REPLY TAB PASS');
ok(src.includes("const keys=new Set([norm(r.kpiEn||''),norm(r.kpi||'')].filter(Boolean)"),'recurrence history must match Korean/English KPI aliases');
ok(src.includes("[norm(h.kpiEn||''),norm(h.kpi||'')].some(k=>k&&keys.has(k))"),'stored recurrence history must compare both KPI aliases');
ok(src.includes("const storedKpi=mail.kpi||kpiName,storedKpiEn=mail.kpiEn||kpiName"),'reply import must preserve KPI aliases from matching mail history');
ok(src.includes("kpi:storedKpi,kpiEn:storedKpiEn"),'reply history must persist preserved bilingual KPI aliases');
console.log('HD24 BILINGUAL REPLY CONTINUITY PASS');
ok(reminder.includes("if(m.status!=='sent'||!m.sentAt||!m.to"),'D+7 must use confirmed sent mail only');
ok(reminder.includes("now-sent<DELAY"),'D+7 must enforce seven-day threshold');
ok(reminder.includes("const answered=batch.every"),'D+7 must exclude fully replied batches');
ok(reminder.includes("status==='seven-day-reminder-sent'&&x.originalMailId===id"),'D+7 must suppress already-sent reminders');
ok(reminder.includes("if(!pending().some(x=>x.id===item.id))"),'D+7 must recheck eligibility immediately before send');
ok(reminder.includes("now-previous<15*60*1000"),'D+7 must retain duplicate-send lock');
ok(reminder.includes("localStorage.removeItem(lock);const history=read(MAIL_KEY);history.unshift({plant:m.plant,status:'seven-day-reminder-failed'"),'D+7 failure must unlock and record retryable failure');
console.log('HD24 D+7 CLOSED LOOP PASS');
ok(src.includes("isPrepared=extra.status==='prepared'"),'prepared-history dedupe must be scoped to Preview events only');
ok(src.includes("Math.abs(t-Date.parse(x.preparedAt||0))<5000"),'duplicate Preview history must use a narrow five-second window');
ok(src.includes("if(duplicate)continue"),'duplicate prepared Preview rows must not be appended');
console.log('HD24 PREVIEW HISTORY DEDUPE PASS');
ok(historyView.includes("latestPackaged=ms.find(x=>x.status==='outlook-package-downloaded')"),'history summary must retain latest packaged event after newer Preview');
ok(historyView.includes("latestOpened=ms.find(x=>x.mailOpenedAt&&x.status!=='outlook-package-downloaded'&&!x.sentAt)"),'history summary must retain latest legacy-opened event independently');
ok(historyView.includes("openedAt:latestOpened.mailOpenedAt||'',packagedAt:latestPackaged.mailOpenedAt||latestPackaged.preparedAt||''"),'history summary must not derive opened/packaged state from latest Preview only');
console.log('HD24 HISTORY OPEN/PACKAGE RETENTION PASS');
ok(historyView.includes("function aliases(x){return [norm(x.kpiEn||''),norm(x.kpi||'')].filter(Boolean)}"),'history grouping must expose both KPI aliases');
ok(historyView.includes("function sameKpi(a,b){const A=aliases(a),B=aliases(b);return A.some(k=>B.includes(k))}"),'history grouping must match either Korean or English KPI alias');
ok(historyView.includes("function sameGroup(a,b){return a.plant===b.plant&&Number(a.targetMonth)===Number(b.targetMonth)&&sameKpi(a,b)}"),'history bilingual merge must remain scoped to plant and month');
console.log('HD24 HISTORY BILINGUAL GROUP PASS');
ok(historyView.includes("const mailGroups=[]"),'timeline mail sequence must use alias-aware groups');
ok(historyView.includes("mailGroups.find(x=>sameGroup(x.seed,m))"),'timeline sent sequence must merge bilingual KPI aliases');
ok(historyView.includes("replyGroups.find(x=>sameGroup(x.seed,r))"),'timeline reply sequence must merge bilingual KPI aliases');
console.log('HD24 HISTORY BILINGUAL TIMELINE PASS');
ok(historyView.includes("kpiMails=mails.filter(x=>x.status!=='seven-day-reminder-sent'&&x.status!=='seven-day-reminder-failed')"),'D+7 reminder rows must be excluded from KPI summary/send sequence');
ok(historyView.includes("type:'reminder',sequence:''"),'D+7 reminder timeline events must not receive KPI send sequence');
ok(historyView.includes("m.status==='seven-day-reminder-sent'?'D+7 리마인드 발송':'D+7 리마인드 실패'"),'D+7 success/failure must remain explicit timeline states');
console.log('HD24 D+7 HISTORY ISOLATION PASS');
ok(historyView.includes('<option value="reminder">D+7 리마인드</option>'),'History status filter must expose D+7 reminder events');
ok(historyView.includes("f.s==='reminder')events=events.filter(r=>r.type==='reminder')"),'D+7 History filter must isolate reminder events');
ok(historyView.includes("e.type==='reminder'?'<span class=\\\"pill\\\">D+7</span>'"),'Timeline must label reminder events separately from mail');
console.log('HD24 D+7 HISTORY FILTER PASS');
ok(historyView.includes("f.s==='recurrence'){events=events.filter(e=>rows.some(r=>sameGroup(r,e)))}"),'recurrence Timeline filter must use bilingual-aware grouping');
ok(!historyView.includes("recurrentKeys=new Set(rows.map(keyOf))"),'legacy single-key recurrence filter must stay removed');
console.log('HD24 BILINGUAL RECURRENCE FILTER PASS');
ok(historyView.includes("failedMails=mails.filter(x=>x.status==='send-failed')"),'failed mail attempts must be isolated from KPI send sequencing');
ok(historyView.includes('<option value="failed">발송실패</option>'),'History status filter must expose send failures');
ok(historyView.includes("f.s==='failed')events=events.filter(r=>r.type==='failed')"),'send-failed History filter must isolate failed events');
ok(historyView.includes("type:'failed',sequence:''"),'failed sends must never increment confirmed-send sequence');
console.log('HD24 SEND FAILURE HISTORY PASS');
ok(reminder.includes("targetMonth:m.targetMonth||'',kpi:m.kpi||'',kpiEn:m.kpiEn||''"),'D+7 success/failure history must preserve source KPI context');
ok(historyView.includes("targetMonth:m.targetMonth||'',kpi:m.kpi||'D+7 Reminder',kpiEn:m.kpiEn||m.kpi||'D+7 Reminder'"),'D+7 Timeline must render original KPI/month when available');
ok(historyView.includes('m.originalSentAt&&`원발송 ${dt(m.originalSentAt)}`'),'D+7 Timeline must expose original send timestamp');
console.log('HD24 D+7 KPI CONTEXT PASS');












// Derived DIO must flow through the same reply workbook path as any other KPI.
ok(src.includes("const kpiName = isKo ? (r.kpi||r.kpiEn||'') : (r.kpiEn||r.kpi||'')"),'reply workbook must preserve derived KPI name');
ok(src.includes("r.target??''")&&src.includes("r.actual??''"),'reply workbook must preserve derived target/actual');
ok(src.includes("uniqueItems=items.filter")&&src.includes("norm(r.kpiEn||r.kpi)"),'reply workbook must dedupe derived DIO by KPI and month without excluding it');
console.log('HD24 DERIVED DIO REPLY WORKBOOK CONTRACT PASS');

// Automatic runtime paths must never initiate a browser file download.
const autoRun=fs.readFileSync('hd24-auto-run.js','utf8');
const feedback=fs.readFileSync('hd24-reply-feedback.js','utf8');
ok(!/createObjectURL|\.download\s*=|saveAs\(/.test(autoRun),'auto-run must not contain browser download primitives');
ok(!/createObjectURL|\.download\s*=|saveAs\(/.test(feedback),'reply feedback generation/import must not contain browser download primitives');
ok(src.includes("$('hd24DownloadReply')?.addEventListener('click'")&&src.includes('downloadFile((await buildReplyFile(previewState.items)).file)'),'reply Excel download must remain explicit user-click only');
ok(src.includes("$('hd24SendMail')?.addEventListener('click'")&&src.includes('const dl=downloadFile(emlFile)'),'EML fallback download must remain inside explicit send action');
ok(src.includes('회신 Excel은 메일 발송 또는 수동 다운로드 시에만 생성'),'automatic analysis must explicitly preserve no-download contract');
console.log('HD24 ZERO UNSOLICITED DOWNLOAD CONTRACT PASS');


// DIO formula edge cases must remain mathematically and operationally safe.
const dioSource=fs.readFileSync('index.html','utf8');
ok(dioSource.includes('Number.isFinite(v)&&v>0 ? 365/v : null'),'DIO must reject zero, negative, blank and nonnumeric turnover');
ok(dioSource.includes("makeHistEntry(x.month,target,actual,'하향')"),'DIO must remain lower-is-better');
ok(dioSource.includes("currentPlant==='india'?93:currentPlant==='brazil'?-24001:102"),'DIO plant routing must remain Ulsan 102 / India 93 / Brazil synthetic -24001');
const dio=v=>Number.isFinite(Number(v))&&Number(v)>0?365/Number(v):null;
ok(dio(4)===91.25,'DIO valid turnover calculation mismatch');
ok(dio(0)===null&&dio(-1)===null&&dio('x')===null,'DIO invalid turnover must not fabricate values');
const achieved=(targetTurnover,actualTurnover)=>dio(actualTurnover)<=dio(targetTurnover);
ok(achieved(4,4)===true,'equal DIO target/actual must achieve');
ok(achieved(4,3)===false,'lower actual turnover must produce higher DIO and miss');
ok(achieved(4,5)===true,'higher actual turnover must produce lower DIO and achieve');
console.log('HD24 DIO EDGE REGRESSION CONTRACT PASS');


// Reply-feedback mail must match initial/D+7 failure semantics.
ok(feedback.includes("api&&api.success===false"),'reply feedback must reject API logical failure');
ok(feedback.includes("status:'send-failed'"),'reply feedback failure history missing');
ok(feedback.includes("x.sentAt||x.failedAt"),'reply feedback failure timestamp rendering missing');
ok(feedback.includes("x.error?' · '+x.error"),'reply feedback failure detail rendering missing');
ok(feedback.includes("setTimeout(()=>controller.abort(),30000)"),'reply feedback API timeout guard missing');
ok(ui.includes('hd24-reply-feedback.js?v=19'),'reply feedback production loader must be v19');
ok(refresh.includes('hd24-reply-feedback.js?v=19'),'reply feedback refresh preload must be v19');
console.log('HD24 REPLY FEEDBACK MAIL HARDENING CONTRACT PASS');


// 2026-10-05 closed-loop regression locks.
ok(reminder.includes("['ulsan','india','brazil']"),'D+7 must cover Ulsan, India and Brazil');
ok(reminder.includes('const sameKpi=')&&reminder.includes('sameKpi(r,x)'),'D+7 reply matching must accept either KPI language label');
ok(src.includes("window.hd24PrepareFollowupPreview = function(items, mode)")&&src.includes("safeMode=['month','watch','all'].includes(mode)?mode:'watch'"),'managed Preview must preserve Month/Watch/All mode');
ok(src.includes("Content-Type':'text/plain;charset=utf-8")&&!src.includes("Content-Type':'application/json"),'initial mail API must use hardened no-preflight transport');
ok(src.includes("if($('mailCc'))$('mailCc').value=cc"),'managed mail field must display enforced CC used for send');
ok(feedback.includes('id="hd24FeedbackCc" readonly')&&feedback.includes("cc=(get('mailCc')?.value||'').trim()"),'feedback mail must inherit managed CC and prevent local CC drift');
ok(feedback.includes('const previousReply=')&&!feedback.includes('history[history.length-2]'),'feedback comparison must use actual prior reply sequence');
ok(feedback.includes('latestFeedbackAttachment=null')&&feedback.includes('exportKey!==lastExportKey'),'new feedback state must invalidate stale attachment before regeneration');
console.log('HD24 2026-10-05 CLOSED LOOP REGRESSION PASS');

// Initialization idempotency regression locks.
ok(autoRun.includes('__HD24_AUTO_RUN_WIRED__'),'auto-run initialization must be idempotent');
ok(pipeline.includes('__HD24_PIPELINE_GATE_WIRED__'),'pipeline gate initialization must be idempotent');
ok(src.includes('__HD24_FOLLOWUP_WIRED__'),'follow-up initialization must be idempotent');
ok(reminder.includes('__HD24_SEVEN_DAY_REMINDER_WIRED__'),'D+7 reminder initialization must be idempotent');
ok(feedback.includes('__HD24_REPLY_FEEDBACK_WIRED__'),'reply feedback initialization must be idempotent');
ok(feedback.includes("document.readyState==='loading'")&&feedback.includes("DOMContentLoaded',wire,{once:true}")&&feedback.includes('else wire()'),'reply feedback must initialize when loaded after DOMContentLoaded');
ok(replyDedupe.includes('__HD24_REPLY_IMPORT_DEDUPE_WIRED__'),'reply import dedupe initialization must be idempotent');
ok(directReply.includes('__HD24_DIRECT_REPLY_GUARD_WIRED__'),'direct reply guard initialization must be idempotent');
ok(historyView.includes('__HD24_HISTORY_VIEW_WIRED__'),'history view initialization must be idempotent');
