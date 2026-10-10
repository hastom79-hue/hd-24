const assert=require('node:assert/strict');
const fs=require('node:fs');
const source=fs.readFileSync('hd24-reply-feedback.js','utf8');
const checks=[
 ['send.disabled=demo;', 'demo button disabled'],
 ['if(dashboardImages.length!==2)', 'dashboard image count'],
 ['if(!api||api.success!==true)', 'explicit API confirmation'],
 ["status:'outlook-package-downloaded'", 'Outlook package is not sent'],
 ["status:uncertain?'send-unconfirmed':'send-failed'", 'uncertain delivery state'],
 ["priorUnconfirmed.some(x=>x.status==='send-unconfirmed'", 'duplicate prevention']
];
checks.forEach(([pattern,label])=>assert.ok(source.includes(pattern),label));
const start=source.indexOf('let priorUnconfirmed=[];');
const end=source.indexOf('if(!to){',start);
assert.ok(start>=0&&end>start,'guard exists before send');
const guard=source.slice(start,end);
const evaluate=(logs,plant,to,subject,endpoint='https://mail.example.test',exportKey='rev1')=>{
 const status={textContent:''},send={disabled:true},window={__HD24_FEEDBACK_SEND_BUSY__:true};
 const localStorage={getItem:()=>JSON.stringify(logs)};
 new Function('localStorage','SEND_LOG','plant','to','subject','status','send','window','endpoint','exportKey',guard)(localStorage,'log',plant,to,subject,status,send,window,endpoint,exportKey);
 return status.textContent;
};
const log={status:'send-unconfirmed',plant:'india',to:'recipient',subject:'KPI',exportKey:'rev1'};
assert.match(evaluate([log],'india','recipient','KPI'),/중복 발송/);
assert.equal(evaluate([log],'brazil','recipient','KPI'),'');
assert.equal(evaluate([log],'india','different','KPI'),'');
assert.equal(evaluate([log],'india','recipient','Other'),'');
assert.equal(evaluate([log],'india','recipient','KPI',''),'','Outlook file creation must not be blocked by uncertain API send');
assert.equal(evaluate([log],'india','recipient','KPI','https://mail.example.test','rev2'),'','updated analysis must not be blocked by old uncertain send');
console.log('HD24 feedback mail safety regression: PASS');
