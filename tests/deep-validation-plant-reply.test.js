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
const riskStart=source.indexOf('function uniqueRiskKpiCount(');
const riskEnd=source.indexOf('const yearOf=',riskStart);
assert.ok(riskStart>=0&&riskEnd>riskStart,'production risk count function exists');
const riskCount=new Function('norm','sameKpi',source.slice(riskStart,riskEnd)+';return uniqueRiskKpiCount')(
 norm,(a,b)=>norm(a.kpiEn||a.kpi)===norm(b.kpiEn||b.kpi)
);
const plants=[{plant:'india',kpiEn:'WIP',kpi:'재공 준수율'},{plant:'brazil',kpiEn:'WIP',kpi:'재공 준수율'}];
assert.equal(riskCount(plants,[],[{plant:'india',kpi:'재공 준수율'},{plant:'brazil',kpi:'재공 준수율'}],[]),2,'same KPI in different plants counts separately');
assert.equal(riskCount(plants,[],[],[{plant:'india',kpi:'WIP'},{plant:'brazil',kpi:'WIP'}]),2,'cross-KPI findings preserve plant');
assert.equal(riskCount(plants,[],[{plant:'india',kpi:'재공 준수율'}],[{plant:'india',kpi:'WIP'}]),1,'Korean and English aliases in one plant count once');
const loopStart=source.indexOf('function closedLoop(all){');
const loopEnd=source.indexOf('function contradictions(all)',loopStart);
assert.ok(loopStart>=0&&loopEnd>loopStart,'production closed-loop function exists');
const closedLoop=new Function('norm','yearOf','samePlant','sameKpi','periodOf','kpiKey','achieved','comparable','effectiveUnit','directionOf',source.slice(loopStart,loopEnd)+';return closedLoop')(
 norm,r=>Number(r.targetYear)||2026,
 (a,b)=>norm(a.plant)===norm(b.plant),
 (a,b)=>norm(a.kpiEn||a.kpi)===norm(b.kpiEn||b.kpi),
 r=>(Number(r.targetYear)||2026)*12+Number(r.targetMonth)-1,
 r=>norm(r.kpiEn||r.kpi),r=>r.ok,()=>null,r=>r.unit,()=> 'HIGHER'
);
const loopRow=(plant,year,month,seq=1,root='same')=>({plant,targetYear:year,targetMonth:month,kpiEn:'WIP',replySequence:seq,rootCause:root,recoveryPlan:'plan',ok:false});
assert.equal(closedLoop([loopRow('india',2026,12),loopRow('india',2027,1)]).length,1,'December-to-January follow-up must be continuous');
assert.equal(closedLoop([loopRow('india',2026,12),loopRow('brazil',2027,1)]).length,0,'closed-loop findings must not mix plants');
assert.equal(closedLoop([loopRow('india',2026,12),loopRow('india',2027,1,1),loopRow('india',2027,1,2)]).length,1,'older replies must not duplicate closed-loop findings');
assert.ok(source.includes("if(missingReply(root))")&&source.includes("if(missingReply(plan))"),'missing cause and recovery plan must produce findings');
assert.ok(source.includes('missingReply(norm(r.actionOwner))')&&source.includes('missingReply(norm(r.plannedCompletionDate))'),'missing owner and due date must produce findings');
assert.ok(source.includes('find attached|see attached|refer attached'),'attachment-only responses must be flagged');
console.log('HD24 deep validation regression: PASS');
