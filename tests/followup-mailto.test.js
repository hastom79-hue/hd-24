const fs=require('fs');
const src=fs.readFileSync('hd24-followup.js','utf8');
const ui=fs.readFileSync('hd24-ui-v3.js','utf8');
const refresh=fs.readFileSync('refresh-runtime.html','utf8');
function ok(x,m){if(!x)throw new Error(m)}
ok(src.includes("const mailtoUrl=\`mailto:"),'mailto draft construction missing');
ok(src.includes("window.location.assign(mailtoUrl)"),'mailto draft must delegate to OS default mail client');
ok(src.includes("mailto에는 발신계정 정보를 넣지 않는다"),'default-sender delegation invariant missing');
ok(!/from=|sender=|hastom79@gmail\.com|imap\.naver\.com/i.test(src),'follow-up runtime must not force sender/account/server');
const vm=ui.match(/hd24-followup\.js\?v=(\d+)/);ok(vm,'production loader missing followup');
ok(refresh.includes('hd24-followup.js?v='+vm[1]),'refresh/followup cache version mismatch');
console.log('HD24 FOLLOWUP DEFAULT-SENDER PASS');
