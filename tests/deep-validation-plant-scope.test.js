// Cross-plant contradiction regression: actual production function, no browser needed.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync('hd24-reply-deep-validation.js','utf8');
const match=source.match(/function contradictions\(all\)\{[\s\S]*?\n\}\nasync function exportXlsx/);
assert.ok(match,'production contradictions() function must be found');
const context={norm:s=>String(s||'').toLowerCase().replace(/\s+/g,' ').trim(),yearOf:r=>Number(r?.targetYear)||2026,achieved:r=>r.achieved};
vm.createContext(context);
vm.runInContext(source.match(/const samePlant=[^\n]+/)[0]+'\n'+match[0].replace(/\nasync function exportXlsx$/,''),context);
const row=(plant,kpi,achieved,actual)=>({plant,kpiEn:kpi,targetYear:2026,targetMonth:8,achieved,actual});
const quality=row('india','Production attributable assembly quality',false,50);
const compliance=row('india','Standard Work Compliance',true,99);
const otherPlant=row('brazil','Standard Work Compliance',true,99);
const missingPlant=row('','Standard Work Compliance',true,99);
const check=(rows,expected,label)=>assert.equal(context.contradictions(rows).length,expected,label);
check([quality,compliance],1,'same plant quality/compliance must flag');
check([quality,otherPlant],0,'cross plant quality/compliance must not flag');
check([quality,missingPlant],0,'missing plant must fail closed');
const wip=row('india','WIP compliance rate (Fabrication)',false,60);
const lead=row('india','Cutting to Dispatch Lead Time',true,12);
check([wip,lead],1,'same plant WIP/lead time must flag');
check([wip,{...lead,plant:'brazil'}],0,'cross plant WIP/lead time must not flag');
const downtime=row('india','Equipment Downtime Loss',false,8);
const mtbf=row('india','MTBF',true,40);
check([downtime,mtbf],1,'same plant equipment metrics must flag');
check([downtime,{...mtbf,plant:'brazil'}],0,'cross plant equipment metrics must not flag');
console.log('PASS: 7 cross-KPI same-plant, cross-plant, and missing-plant assertions');
// Guard monthly follow-up and repeated root cause against another plant's history.
const sourceContext={
 norm:context.norm,yearOf:context.yearOf,achieved:context.achieved,
 window:{HD24_RULE_MATRIX_V1:{direction:r=>r.direction==='LOWER'?'LOWER':'HIGHER'}},
 document:{},Date,Number,Map,Set
};
vm.createContext(sourceContext);
const scope=source.slice(source.indexOf('const kpiKey='),source.indexOf('function contradictions(all)'));
vm.runInContext(scope,sourceContext);
const previous={...row('india','Test KPI',false,80),target:100,targetMonth:7,rootCause:'Recurring delay',recoveryPlan:'Daily review',reason:'Supplier delay'};
const current={...row('brazil','Test KPI',false,70),target:100,targetMonth:8,rootCause:'Recurring delay',recoveryPlan:'Daily review',reason:'Supplier delay'};
assert.equal(sourceContext.closedLoop([previous,current]).length,0,'different plants must not form consecutive-month recovery history');
const sameCurrent={...current,plant:'india'};
assert.ok(sourceContext.closedLoop([previous,sameCurrent]).length>0,'same plant consecutive-month history must remain detectable');
const flagged=sourceContext.flagsFor(current,[previous,current]);
assert.ok(!flagged.some(x=>String(x[1]).includes('연속 동일')),'cross-plant root cause must not be counted as repeated');
console.log('PASS: cross-plant recovery history and repeated root-cause isolation');
const overdue=(plant,month)=>({...row(plant,'Other KPI',false,80),targetMonth:month,actionOwner:'Shared Owner',plannedCompletionDate:'2026-06-01',replyReceivedAt:'2026-09-01'});
const currentOverdue=overdue('india',8);
const crossOverdue=[overdue('brazil',6),overdue('brazil',7),currentOverdue];
const isolated=sourceContext.flagsFor(currentOverdue,crossOverdue);
assert.ok(!isolated.some(x=>String(x[1]).includes('반복')),'same owner across different plants must not trigger repeated overdue warning');
const sameOverdue=[overdue('india',6),overdue('india',7),currentOverdue];
const repeated=sourceContext.flagsFor(currentOverdue,sameOverdue);
assert.ok(repeated.some(x=>String(x[1]).includes('기한 초과 반복')),'same owner and plant across periods must trigger repeated overdue warning');
console.log('PASS: repeated overdue action-owner plant isolation');
// A lower reply sequence with a later timestamp must never replace the approved latest reply.
const seqPrev={...previous,replySequence:2,replyReceivedAt:'2026-08-01',rootCause:'Recurring delay'};
const stalePrev={...previous,replySequence:1,replyReceivedAt:'2026-10-01',rootCause:'Different cause'};
const seqNext={...sameCurrent,replySequence:2,replyReceivedAt:'2026-09-01',rootCause:'Recurring delay'};
const seqFindings=sourceContext.closedLoop([seqPrev,stalePrev,seqNext]);
assert.ok(seqFindings.some(x=>String(x.msg).includes('근본원인')),'latest reply sequence must win over later timestamp on older sequence');
console.log('PASS: recovery history reply-sequence precedence');





// Production DIO formula: inventory turnover ratio -> inventory days, never percentage.
const html=fs.readFileSync('index.html','utf8');
const dioFn=html.match(/function deriveDioValue\(turnover\)\{[^}]+\}/);
assert.ok(dioFn,'production DIO derivation must exist');
const dioContext={};vm.createContext(dioContext);vm.runInContext(dioFn[0],dioContext);
assert.equal(dioContext.deriveDioValue(5),73,'turnover 5 must yield 73 days, not 73%');
assert.equal(dioContext.deriveDioValue(10),36.5,'turnover 10 must yield 36.5 days');
for(const invalid of [0,-1,'',null,'not-a-number'])assert.equal(dioContext.deriveDioValue(invalid),null,'invalid turnover must not generate a DIO value');
assert.ok(html.includes("unit:'일'"),'derived DIO must be labeled in days');
console.log('PASS: production DIO derivation, invalid input, and day-unit contract');

const zeroTargetPrevious={...previous,direction:'LOWER',nextMonthRecoveryTarget:0};
const zeroTargetNext={...sameCurrent,direction:'LOWER',actual:2};
assert.ok(sourceContext.closedLoop([zeroTargetPrevious,zeroTargetNext]).some(x=>String(x.msg).includes('차월 회복목표 미달')),'explicit zero recovery target must be evaluated');
console.log('PASS: zero-valued next-month recovery target evaluated');

const recurrence=(actual)=>({...row('india','Non-standard Work Recurrence',null,actual),target:0});
for(const missing of [null,'',undefined])check([quality,recurrence(missing)],0,'missing recurrence actual must not be treated as zero');
check([quality,recurrence(0)],1,'explicit zero recurrence must remain a contradiction signal');
console.log('PASS: missing recurrence actual is distinct from numeric zero');

const numericContext={norm:context.norm};
vm.createContext(numericContext);
const numericHelpers=source.match(/const val=x=>[^\n]+\nfunction comparable\(actual,target,unit\)\{[^\n]+/);
assert.ok(numericHelpers,'production numeric comparison helpers must exist');
vm.runInContext(numericHelpers[0],numericContext);
for(const missing of [null,undefined,'','  ','N/A','-'])assert.equal(numericContext.val(missing),null,'missing KPI value must not be converted to zero');
assert.equal(numericContext.val(0),0,'numeric zero is a valid KPI value');
assert.equal(numericContext.val('0%'),0,'explicit zero percentage is a valid KPI value');
assert.equal(numericContext.comparable('',0,'%'),null,'missing actual versus zero target is not comparable');
assert.equal(numericContext.comparable(0,0,'%')[0],0,'explicit zero actual and target are comparable');
console.log('PASS: missing versus zero numeric KPI comparison contract');
