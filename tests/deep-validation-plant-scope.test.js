// Cross-plant contradiction regression: actual production function, no browser needed.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync('hd24-reply-deep-validation.js','utf8');
const match=source.match(/function contradictions\(all\)\{[\s\S]*?\n\}\nasync function exportXlsx/);
assert.ok(match,'production contradictions() function must be found');
const context={norm:s=>String(s||'').toLowerCase().replace(/\s+/g,' ').trim(),yearOf:r=>Number(r?.targetYear)||2026,achieved:r=>r.achieved};
vm.createContext(context);
vm.runInContext(source.match(/const samePlant=[^\n]+/)[0]+'\n'+source.match(/const validSameMonth=[^\n]+/)[0]+'\n'+match[0].replace(/\nasync function exportXlsx$/,''),context);
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
const numericHelpers=source.match(/const val=x=>[^\n]+\n(?:const effectiveUnit=r=>[^\n]+\n)?(?:const percentPoints=x=>[^\n]+\n)?function comparable\(actual,target,unit\)\{[^\n]+/);
assert.ok(numericHelpers,'production numeric comparison helpers must exist');
vm.runInContext(numericHelpers[0]+'\nthis.val=val;',numericContext);
for(const missing of [null,undefined,'','  ','N/A','-'])assert.equal(numericContext.val(missing),null,'missing KPI value must not be converted to zero');
assert.equal(numericContext.val(0),0,'numeric zero is a valid KPI value');
assert.equal(numericContext.val('0%'),0,'explicit zero percentage is a valid KPI value');
assert.equal(numericContext.comparable('',0,'%'),null,'missing actual versus zero target is not comparable');
assert.equal(numericContext.comparable(0,0,'%')[0],0,'explicit zero actual and target are comparable');
console.log('PASS: missing versus zero numeric KPI comparison contract');
assert.equal(numericContext.comparable(0.85,85,'%')[0],85,'ratio-form actual should normalize to percent when target is percent points');
assert.equal(numericContext.comparable(85,85,'%')[0],85,'percent-point actual should remain unchanged');
assert.ok(source.includes("comparable(r.actual,r.target,effectiveUnit(r))"),'Rate KPI comparison must use effective percentage unit');
console.log('PASS: Rate KPI percent normalization and effective-unit wiring');
assert.ok(source.includes("['Unit',10]")&&source.includes("effectiveUnit(r)==='%'?percentPoints(r.target)"),'deep-analysis Excel must include Rate percent unit and normalized target');
vm.runInContext('this.percentPoints=percentPoints;this.effectiveUnit=effectiveUnit;',numericContext);
assert.equal(numericContext.percentPoints(0.85),85,'Rate ratio 0.85 must export as 85 percentage points');
assert.equal(numericContext.percentPoints(0.975),97.5,'Rate ratio 0.975 must export as 97.5 percentage points');
assert.equal(numericContext.percentPoints(85),85,'Rate already in percentage points must not multiply');
assert.equal(numericContext.percentPoints(0),0,'Rate numeric zero must remain zero');
assert.equal(numericContext.percentPoints(''),null,'missing Rate must remain missing');
assert.equal(numericContext.effectiveUnit({kpiEn:'WIP Compliance Rate',unit:''}),'%','Rate KPI must use percent even when source unit missing');
console.log('PASS: Rate Excel normalization samples and missing-value handling');
const dashboardFormat=html.match(/function fmtValWithUnit\(v, unit\)\{[\s\S]*?\n\}/);
assert.ok(dashboardFormat,'dashboard KPI formatter must exist');
const displayContext={round:n=>Math.round(n*100)/100,Math,Number,isFinite};
vm.createContext(displayContext);
vm.runInContext(dashboardFormat[0],displayContext);
assert.equal(displayContext.fmtValWithUnit(0.85,'%'),'85%','fractional Rate must display 85%');
assert.equal(displayContext.fmtValWithUnit(85,'%'),'85%','percentage-point Rate must not display 8500%');
assert.equal(displayContext.fmtValWithUnit(0.975,'%'),'97.5%','fractional Rate must display 97.5%');
console.log('PASS: dashboard Rate display 0.85/85/0.975');
const pairSource=html.match(/function normalizeKpiPair\(target,actual,unit,kpiName\)\{[\s\S]*?\n\}/);
assert.ok(pairSource,'production achievement normalization function must exist');
vm.runInContext(pairSource[0],displayContext);
const checkPair=(target,actual,unit,name,expected)=>assert.equal(JSON.stringify(Array.from(displayContext.normalizeKpiPair(target,actual,unit,name))),JSON.stringify(expected));
checkPair(85,0.90,'','WIP Compliance Rate',[85,90]);
checkPair(0.85,90,'%','Standard Work Compliance',[85,90]);
checkPair(0.85,0.90,'%','Quality Rate',[85,90]);
checkPair(85,90,'%','Quality Rate',[85,90]);
checkPair(0,0,'%','Quality Rate',[0,0]);
checkPair(1,1.08,'%','Order Intake Fulfillment',[100,108]);
checkPair(1,0.98,'%','Order Intake Fulfillment',[100,98]);
checkPair(0.85,0.90,'days','Manufacturing Lead Time',[0.85,0.90]);
console.log('PASS: achievement normalization mixed ratio/percent-point and non-percent units');
const histSource=html.match(/function makeHistEntry\(month, target, actual, direction, kpiName\)\{[\s\S]*?\n\}/);
assert.ok(histSource,'production KPI achievement function must exist');
vm.runInContext(histSource[0],displayContext);
const order='Order Intake Fulfillment (W+4 - Rolling Plan)';
assert.equal(displayContext.makeHistEntry(6,100,108,'상향',order).achieved,false,'108% order intake must not be normal achievement');
assert.equal(displayContext.makeHistEntry(7,100,98,'상향',order).achieved,false,'98% order intake must not be normal achievement');
assert.equal(displayContext.makeHistEntry(8,100,100,'상향',order).achieved,true,'100% order intake can pass numeric comparison pending order-change audit');
assert.equal(displayContext.makeHistEntry(6,100,108,'상향','Other KPI').achieved,true,'non-order-intake upward KPI must retain >= comparison');
console.log('PASS: Order Intake 108% and 98% are not normal achievement');




const missingMonthQuality={...quality,targetMonth:null};
const missingMonthCompliance={...compliance,targetMonth:null};
check([missingMonthQuality,missingMonthCompliance],0,'missing month must not match missing month in contradiction checks');
check([{...quality,targetMonth:0},{...compliance,targetMonth:0}],0,'month zero must not be a valid matching period');
console.log('PASS: cross-KPI comparisons reject missing or invalid target month');

const dioFallback="currentPlant==='india'?93:currentPlant==='brazil'?-24001:102";
assert.equal(html.split(dioFallback).length-1,2,'both paths must preserve the Brazil synthetic DIO key to prevent row collision');
console.log('PASS: Brazil derived DIO uses isolated synthetic row key');


// Latest-reply regression: bilingual aliases, plant/month boundaries, sequence and tie handling.
const latestSource=source.slice(source.indexOf('function latestReplyRows('),source.indexOf('function render(){'));
assert.ok(latestSource.startsWith('function latestReplyRows('),'production latestReplyRows() must be found');
vm.runInContext(latestSource,sourceContext);
const aliasBase={plant:'india',targetYear:2026,targetMonth:8,kpi:'표준작업준수율',kpiEn:'Standard Work Compliance',replySequence:1,replyReceivedAt:'2026-09-01'};
const aliasUpdated={...aliasBase,kpiEn:'',replySequence:2,replyReceivedAt:'2026-09-02'};
const aliasOlder={...aliasBase,kpi:'',replySequence:1,replyReceivedAt:'2026-10-01'};
let deduped=sourceContext.latestReplyRows([aliasBase,aliasUpdated,aliasOlder]);
assert.equal(deduped.length,1,'Korean and English KPI aliases must collapse within same plant/month');
assert.equal(deduped[0].replySequence,2,'higher reply sequence must win despite older timestamp');
deduped=sourceContext.latestReplyRows([aliasBase,{...aliasBase,replyReceivedAt:'2026-09-03'}]);
assert.equal(deduped.length,1,'identical KPI and period must dedupe');
assert.equal(deduped[0].replyReceivedAt,'2026-09-03','later timestamp must win on equal sequence');
deduped=sourceContext.latestReplyRows([aliasBase,{...aliasBase,rootCause:'last entry'}]);
assert.equal(deduped[0].rootCause,'last entry','last stored entry must win exact ties');
deduped=sourceContext.latestReplyRows([aliasBase,{...aliasBase,plant:'brazil'},{...aliasBase,targetMonth:7}]);
assert.equal(deduped.length,3,'different plants or months must remain separate');
deduped=sourceContext.latestReplyRows([{plant:'india',targetMonth:8},{plant:'india',targetMonth:8}]);
assert.equal(deduped.length,2,'unnamed KPI records must not be merged');
console.log('PASS: latest reply bilingual aliases, sequence, timestamp ties, plant/month boundaries and unnamed records');


// Missing recovery evidence: blank, NA and N/A must not silently pass validation.
sourceContext.contradictions=()=>[]; // isolated missing-evidence test: no cross-KPI counterpart
const incompleteBase={...row('india','IQ 200 (Initial Quality)',false,35),target:24,reason:'Quality issue',rootCause:'Identified defect cause',recoveryPlan:'Contain and verify',actionOwner:'Owner',plannedCompletionDate:'2026-10-31'};
for(const missing of ['', 'NA', 'N/A', 'not applicable']){
 const flaggedRoot=sourceContext.flagsFor({...incompleteBase,rootCause:missing},[incompleteBase]);
 assert.ok(flaggedRoot.some(x=>x[0]==='HIGH'&&x[1].includes('근본원인 미기재')),'missing root cause '+JSON.stringify(missing)+' must be HIGH');
 const flaggedPlan=sourceContext.flagsFor({...incompleteBase,recoveryPlan:missing},[incompleteBase]);
 assert.ok(flaggedPlan.some(x=>x[0]==='HIGH'&&x[1].includes('회복계획 미기재')),'missing recovery plan '+JSON.stringify(missing)+' must be HIGH');
 const flaggedOwner=sourceContext.flagsFor({...incompleteBase,actionOwner:missing},[incompleteBase]);
 assert.ok(flaggedOwner.some(x=>x[0]==='HIGH'&&x[1].includes('Action Owner 미지정')),'missing owner '+JSON.stringify(missing)+' must be HIGH');
 const flaggedDate=sourceContext.flagsFor({...incompleteBase,plannedCompletionDate:missing},[incompleteBase]);
 assert.ok(flaggedDate.some(x=>x[0]==='HIGH'&&x[1].includes('완료예정일 미지정')),'missing due date '+JSON.stringify(missing)+' must be HIGH');
}
console.log('PASS: blank/NA/N/A recovery root, plan, owner and due date classified HIGH');
assert.ok(source.includes('detailRows:input=>{const rows=latestReplyRows(Array.isArray(input)?input:[]);'),'detailRows must dedupe latest KPI replies before findings, loop and contradiction checks');
console.log('PASS: detailRows uses same latest-reply dedup as dashboard');
for(const vagueDate of ['Monthly','TBD','to be confirmed']){
 const warnings=sourceContext.flagsFor({...incompleteBase,plannedCompletionDate:vagueDate},[incompleteBase]);
 assert.ok(warnings.some(x=>x[0]==='MEDIUM'&&x[1].includes('구체적 날짜가 아님')),'vague due date '+vagueDate+' must trigger follow-up');
}
console.log('PASS: vague completion deadlines trigger explicit schedule verification');
const excelSerialDue=sourceContext.dueInfo({...incompleteBase,plannedCompletionDate:46357});
assert.equal(excelSerialDue.kind,'date','Excel date serial must be a date, not vague text');
assert.equal(new Date(excelSerialDue.time).toISOString().slice(0,10),'2026-12-01','Excel serial 46357 must map to Dec 1 2026');
assert.ok(!sourceContext.flagsFor({...incompleteBase,plannedCompletionDate:46357},[incompleteBase]).some(x=>x[1].includes('구체적 날짜가 아님')),'valid Excel serial must not trigger vague-date warning');
console.log('PASS: Excel serial 46357 completion date normalized without false warning');

for(const weekDue of ['W1, Aug-2026','W3, Sep-2026','W2/08/2026']){
 const due=sourceContext.dueInfo({...incompleteBase,plannedCompletionDate:weekDue});
 assert.equal(due.kind,'week','week-only due date should be recognized: '+weekDue);
 const flags=sourceContext.flagsFor({...incompleteBase,plannedCompletionDate:weekDue},[incompleteBase]);
 assert.ok(flags.some(x=>x[0]==='MEDIUM'&&x[1].includes('주차 단위')),'week-only due date should trigger precise-date request: '+weekDue);
 assert.ok(!flags.some(x=>x[1].includes('완료예정일 미지정')),'week-only due date is not blank: '+weekDue);
}
console.log('PASS: week-only completion dates are recognized and require exact date confirmation');

for(const shortYear of ['W2, Dec-26','W4, Aug-26']){
 assert.equal(sourceContext.dueInfo({plannedCompletionDate:shortYear}).kind,'week','two-digit year week must be recognized');
}
const multiple=sourceContext.dueInfo({plannedCompletionDate:'W2, Sep-26\n\nW1, Nov-26'});
assert.equal(multiple.kind,'multiweek','multiple weekly milestones must be preserved as distinct schedule class');
assert.ok(sourceContext.flagsFor({...incompleteBase,plannedCompletionDate:'W2, Sep-26\n\nW1, Nov-26'},[incompleteBase]).some(x=>x[1].includes('복수 주차 일정')),'multiple milestones require final-completion clarification');
console.log('PASS: two-digit year weeks and multiple milestone deadlines');

const repeatedPlanRows=[6,7,8].map((month,i)=>({...incompleteBase,plant:'india',targetYear:2026,targetMonth:month,kpi:'Aging Inventory',kpiEn:'Aging Inventory',unit:'USD',direction:'LOWER',actual:[30.35,31.54,34.20][i],recoveryPlan:'same corrective action'}));
const worseningFlags=sourceContext.flagsFor(repeatedPlanRows[2],repeatedPlanRows);
assert.ok(worseningFlags.some(x=>x[0]==='HIGH'&&x[1].includes('실적 연속 악화')&&x[1].includes('30.35 → 31.54 → 34.2')),'three-month repeated plan with deteriorating lower-is-better KPI must flag HIGH with trend');
const reboundRows=repeatedPlanRows.map((r,i)=>({...r,actual:[52,42.74,49.18][i]}));
assert.ok(sourceContext.flagsFor(reboundRows[2],reboundRows).some(x=>x[0]==='MEDIUM'&&x[1].includes('최근 실적 전월 대비 후퇴')),'repeated plan with net improvement and recent pullback must flag MEDIUM');
const improvedRows=repeatedPlanRows.map((r,i)=>({...r,actual:[34.2,31.54,30.35][i]}));
assert.ok(!sourceContext.flagsFor(improvedRows[2],improvedRows).some(x=>x[1].includes('실적 연속 악화')||x[1].includes('최근 실적 전월 대비 후퇴')),'improving KPI must not be mislabeled worsening');
console.log('PASS: repeated three-month recovery plan flags continuous deterioration and relapse, not improvement');

const rateRows=repeatedPlanRows.map((r,i)=>({...r,kpi:'Compliance Rate',kpiEn:'Compliance Rate',unit:'Rate',direction:'HIGHER',target:1,actual:[0.85,80,0.75][i]}));
assert.ok(sourceContext.flagsFor(rateRows[2],rateRows).some(x=>x[0]==='HIGH'&&x[1].includes('실적 연속 악화')&&x[1].includes('85 → 80 → 75')),'rate trends must compare normalized percentage points');
const mixedUnitRows=repeatedPlanRows.map((r,i)=>({...r,unit:i===1?'hours':'USD'}));
assert.ok(!sourceContext.flagsFor(mixedUnitRows[2],mixedUnitRows).some(x=>x[1].includes('실적 연속 악화')||x[1].includes('최근 실적 전월 대비 후퇴')),'mixed units must not generate deterioration warning');
console.log('PASS: percentage point normalization and mixed-unit protection for repeated plans');

for(const kpi of ['Long-Term Inventory Value (6 month basis)','OT MH per Unit']){
 const rows=repeatedPlanRows.map((r,i)=>({...r,kpi,kpiEn:kpi,unit:kpi.startsWith('OT')?'MH/unit':'INR',actual:kpi.startsWith('OT')?[52,42.74,49.18][i]:[30.35,31.54,34.2][i]}));
 const flags=sourceContext.flagsFor(rows[2],rows);
 assert.ok(flags.some(x=>(x[1].includes('실적 연속 악화')&&x[0]==='HIGH')||(x[1].includes('최근 실적 전월 대비 후퇴')&&x[0]==='MEDIUM')),'actual India lower-is-better KPI '+kpi+' must flag deterioration');
}
console.log('PASS: actual India long-term inventory and overtime MH directions');

const placeholderRows=repeatedPlanRows.map(r=>({...r,reason:'NA',rootCause:'NA',recoveryPlan:'-'}));
const placeholderFlags=sourceContext.flagsFor(placeholderRows[2],placeholderRows);
assert.ok(placeholderFlags.some(x=>x[1].includes('근본원인 미기재')),'placeholder root must remain missing HIGH');
assert.ok(placeholderFlags.some(x=>x[1].includes('회복계획 미기재')),'placeholder plan must remain missing HIGH');
assert.ok(!placeholderFlags.some(x=>x[1].includes('연속 동일 근본원인')||x[1].includes('연속 동일 만회계획')||x[1].includes('실적 연속 악화')),'NA and dash placeholders must not count as substantive repeated recovery actions');
console.log('PASS: repeated NA placeholders are missing data, not repeated substantive actions');

const tieRows=[
 {...repeatedPlanRows[0],replySequence:1,replyReceivedAt:'2026-07-01T00:00:00Z'},
 {...repeatedPlanRows[1],replySequence:1,replyReceivedAt:'2026-08-01T00:00:00Z',recoveryPlan:'revised plan'},
 {...repeatedPlanRows[1],replySequence:1,replyReceivedAt:'2026-08-02T00:00:00Z'},
 {...repeatedPlanRows[2],replySequence:1,replyReceivedAt:'2026-09-01T00:00:00Z'}
];
const tieFlags=sourceContext.flagsFor(tieRows[3],tieRows);
assert.ok(tieFlags.some(x=>x[0]==='HIGH'&&x[1].includes('3개월 연속 동일 만회계획 반복')),'latest timestamp must win when replySequence is equal');
console.log('PASS: equal reply sequence selects latest received timestamp for repeated plans');

const wipRows=repeatedPlanRows.map((r,i)=>({...r,kpi:'WIP Compliance (Fabrication)',kpiEn:'WIP Compliance (Fabrication)',unit:'%',direction:'HIGHER',target:[83.5,83.75,84][i],actual:[57,63.3,62.3][i]}));
const wipFlags=sourceContext.flagsFor(wipRows[2],wipRows);
assert.ok(wipFlags.some(x=>x[0]==='MEDIUM'&&x[1].includes('최근 실적 전월 대비 후퇴')),'fabrication WIP 57->63.3->62.3 is net improved with minor monthly pullback');
assert.ok(!wipFlags.some(x=>x[0]==='HIGH'&&x[1].includes('최근 실적 전월 대비 후퇴')),'fabrication WIP monthly pullback alone must not be HIGH');
console.log('PASS: actual India fabrication WIP net improvement with minor pullback');

const wipMissFlags=sourceContext.flagsFor(wipRows[2],wipRows);
assert.ok(wipMissFlags.some(x=>x[0]==='HIGH'&&x[1].includes('최근 3개월 연속 목표 미달')&&x[1].includes('21.7%p')),'fabrication WIP must flag sustained target misses separately from trend');
const assemblyRows=wipRows.map((r,i)=>({...r,kpi:'WIP Compliance (Assembly)',kpiEn:'WIP Compliance (Assembly)',target:[64,65,66][i],actual:[60,64,68][i]}));
assert.ok(!sourceContext.flagsFor(assemblyRows[2],assemblyRows).some(x=>x[1].includes('최근 3개월 연속 목표 미달')),'assembly WIP achieved in August must not be flagged as three consecutive misses');
console.log('PASS: fabrication WIP persistent target miss is separate from assembly recovery');

const assemblyStatusRows=repeatedPlanRows.slice(1).map((r,i)=>({...r,kpi:'WIP Compliance (Assembly)',kpiEn:'WIP Compliance (Assembly)',unit:'%',direction:'HIGHER',target:[65,66][i],actual:[64,68][i],statusTrend:i===1?'Recent decline':''}));
const assemblyFlags=sourceContext.flagsFor(assemblyStatusRows[1],assemblyStatusRows);
assert.ok(assemblyFlags.some(x=>x[0]==='MEDIUM'&&x[1].includes('Recent decline')),'assembly WIP improvement conflicts with Recent decline status');
console.log('PASS: India assembly WIP recent-decline text contradicts actual improvement');

const wipGapFlags=sourceContext.flagsFor(wipRows[2],wipRows);
assert.ok(wipGapFlags.some(x=>x[0]==='HIGH'&&x[1].includes('WIP 준수율 목표 미달 21.7%p')),'fabrication WIP 62.3 versus 84 must show target gap HIGH');
assert.ok(wipGapFlags.some(x=>x[0]==='MEDIUM'&&x[1].includes('전월 대비 후퇴')),'fabrication WIP monthly pullback remains MEDIUM');
assert.ok(!sourceContext.flagsFor(assemblyStatusRows[1],assemblyStatusRows).some(x=>x[1].includes('WIP 준수율 목표 미달')),'assembly WIP 68 versus 66 must not be target miss');
console.log('PASS: fabrication WIP target gap separate from trend; assembly achieved');

const realAssemblyRows=assemblyStatusRows.map((r,i)=>({...r,kpi:'WIP compliance rate(Assy Line On- Line-Out )',kpiEn:'WIP compliance rate(Assy Line On- Line-Out )',target:[0.65,0.66][i],actual:[0.64,0.68][i]}));
const realAssemblyFlags=sourceContext.flagsFor(realAssemblyRows[1],realAssemblyRows);
assert.ok(realAssemblyFlags.some(x=>x[0]==='MEDIUM'&&x[1].includes('Recent decline')),'actual India assembly WIP decimal percentages must trigger status contradiction');
assert.ok(!realAssemblyFlags.some(x=>x[1].includes('WIP 준수율 목표 미달')),'actual India assembly WIP 0.68 vs 0.66 is achieved');
console.log('PASS: actual India assembly WIP KPI name and decimal percentage values');

const lowerTrendRows=assemblyStatusRows.map((r,i)=>({...r,kpi:'Long Term Inventory Value',kpiEn:'Long Term Inventory Value',unit:'INR Mn',direction:'LOWER',target:30,actual:[34.2,31.54][i]}));
assert.ok(sourceContext.flagsFor(lowerTrendRows[1],lowerTrendRows).some(x=>x[1].includes('Recent decline')),'lower-is-better KPI falling from 34.2 to 31.54 is improvement');
const lowerWorseRows=lowerTrendRows.map((r,i)=>({...r,actual:[31.54,34.2][i]}));
assert.ok(!sourceContext.flagsFor(lowerWorseRows[1],lowerWorseRows).some(x=>x[1].includes('Recent decline')),'lower-is-better KPI rising is actual deterioration, not status contradiction');
assert.ok(!sourceContext.flagsFor(assemblyStatusRows[1],[assemblyStatusRows[1]]).some(x=>x[1].includes('Recent decline')),'no preceding month means status contradiction must not be inferred');
console.log('PASS: status trend comparison respects lower-is-better direction and missing history');
