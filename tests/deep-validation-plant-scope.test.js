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
