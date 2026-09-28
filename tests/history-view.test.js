const fs=require('fs');
function ok(v,m){if(!v)throw new Error(m)}
const src=fs.readFileSync('hd24-history-view.js','utf8');
ok(src.includes("status=m.sentAt?'실제 발송':packaged?'Outlook 패키지 다운로드'"),'mail status precedence missing');
ok(src.includes("const replyGroups={}"),'legacy reply chronological sequence fallback missing');
ok(src.includes("sequence:r.replySequence||replyGroups[k]"),'replySequence precedence missing');
ok(src.includes("latestReply.isRecurrence===true||same>=2"),'latest recurrence state missing');
ok(src.includes("Repeated Issue x"),'Repeated Issue wording missing');
ok(src.includes("r.isRecurrence===true||same>=2"),'timeline recurrence state missing');
ok(src.includes("Outlook .eml 생성·다운로드 · 실제 발송 여부 미확인"),'package must not imply actual send');
console.log('HD24 HISTORY VIEW REGRESSION PASS');
