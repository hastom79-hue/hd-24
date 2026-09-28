const fs=require('fs');
const src=fs.readFileSync('hd24-followup.js','utf8');
const ui=fs.readFileSync('hd24-ui-v3.js','utf8');
const refresh=fs.readFileSync('refresh-runtime.html','utf8');
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
ok(src.includes("viewportH=900,scale=1,pageCount=Math.max(1,Math.ceil(fullH/viewportH))"),'100 percent paged screenshot sizing missing');
ok(src.includes("for(let page=0;page<pageCount;page++)"),'scroll-page screenshot loop missing');
ok(src.includes("const y=page*viewportH,h=Math.min(viewportH,fullH-y)"),'scroll-page boundary calculation missing');
ok(src.includes("scrollY:-y,y"),'paged screenshot vertical offset missing');
ok(src.includes("_P\${String(page+1).padStart(2,'0')}"),'paged screenshot filename suffix missing');
ok(src.includes("page:page+1,pageCount"),'paged screenshot metadata missing');
ok(src.includes("b&&b.size>1000"),'empty PNG guard missing');
const vm=ui.match(/hd24-followup\.js\?v=(\d+)/);ok(vm,'production loader missing followup');
ok(refresh.includes('hd24-followup.js?v='+vm[1]),'refresh/followup cache version mismatch');
console.log('HD24 FOLLOWUP DEFAULT-SENDER PASS');

ok(src.includes("메일 패키지 준비 시작..."),'send button must expose pipeline start');
ok(src.includes("2/6 회신 Excel 생성 완료"),'Excel stage completion diagnostic missing');
ok(src.includes("3/6 KPI PNG 생성 완료"),'PNG stage completion diagnostic missing');
ok(src.includes("4/6 Outlook EML 생성 완료"),'EML stage completion diagnostic missing');
ok(src.includes("5/6 Outlook EML 다운로드 시작..."),'EML download stage diagnostic missing');
ok(src.includes("메일 패키지 생성 실패:"),'top-level send pipeline error diagnostic missing');

ok(src.includes("targetMonth>month()"),'future-month reply history fail-closed guard missing');
ok(src.includes("회신 파일 미래/비정상 월 차단"),'future-month reply rejection diagnostic missing');

ok(src.includes("sameCauseCount:same")&&src.includes("isRecurrence:same>=2"),'same-cause recurrence threshold missing');
ok(src.includes("Repeated Issue x")&&src.includes("반복 이슈 x"),'repeated-issue follow-up tags missing');
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
ok(src.includes("r.unit||''")&&src.includes("r.target")&&src.includes("r.actual"),'reply workbook must preserve unit target actual');

ok(src.includes("const buildPlant=pkey(),buildMonth=month(),buildState="),'follow-up workbook stale snapshot missing');
ok(src.includes("pkey()!==buildPlant||month()!==buildMonth||currentState!==buildState"),'follow-up workbook stale comparison missing');
ok(src.includes("회신 Excel stale 생성 차단"),'follow-up workbook stale diagnostic missing');

ok(src.includes("for(const ws of wb.worksheets)"),'multi-month reply import must iterate every worksheet');
ok(!src.includes("const ws=wb.worksheets[0]"),'first-sheet-only reply import regression');
ok(src.includes("KPI column not found: ${ws.name}")&&src.includes("Response columns not found: ${ws.name}"),'each reply worksheet must validate its own headers');

ok(src.includes("const list=load(REPLY_KEY),pending=[]"),'reply import atomic staging buffer missing');
ok(src.includes("pending.push({plant,targetMonth")&&src.includes("list.unshift(...pending.reverse());save(REPLY_KEY"),'reply import must commit only after all worksheets finish');
