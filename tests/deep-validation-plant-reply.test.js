// Regression checks against the production deep-validation source.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const source=fs.readFileSync('hd24-reply-deep-validation.js','utf8');
const start=source.indexOf('function contradictions(all){');
const end=source.indexOf('async function exportXlsx',start);
assert.ok(start>=0&&end>start,'production contradiction function exists');
const norm=x=>String(x??'').toLowerCase().trim();
const check=new Function('norm','kpiKey','yearOf','samePlant','validSameMonth','achieved',source.slice(start,end)+';return contradictions')(
 norm,r=>norm(r.kpiEn||r.kpi),r=>Number(r.targetYear)||2026,
 (a,b)=>norm(a.plant)===norm(b.plant),
 (a,b)=>Number(a.targetMonth)===Number(b.targetMonth),
 r=>r.ok
);
const row=(plant,kpi,ok,seq=1,actual=null)=>({plant,kpiEn:kpi,targetYear:2026,targetMonth:8,ok,replySequence:seq,actual});
const quality=row('india','IQ 200 (Production attributable)',false);
const compliance=row('india','Standard Work Compliance',true,1);
assert.equal(check([quality,compliance]).length,1,'quality-control contradiction should be detected');
assert.equal(check([quality,compliance,row('india','Standard Work Compliance',false,2)]).length,0,'latest reply supersedes old compliance result');
assert.equal(check([quality,row('brazil','Standard Work Compliance',true)]).length,0,'other plant must not affect India');
for(const zero of [0,'0','0%','0.0%',' 0 % ']){
 assert.equal(check([quality,row('india','Non-standard Work Recurrence',null,1,zero)]).length,1,'zero recurrence '+zero);
}
for(const nonzero of ['1%','N/A','',null]){
 assert.equal(check([quality,row('india','Non-standard Work Recurrence',null,1,nonzero)]).length,0,'not a zero recurrence '+nonzero);
}
assert.ok(source.includes("ls.addRow([x.plant||'',x.sev"),'closed-loop export must identify plant');
assert.ok(source.includes("cs.addRow([x.plant||'',Number(x.year)"),'cross-KPI export must identify plant');
console.log('HD24 deep validation regression: PASS');
