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
 window:{HD24_RULE_MATRIX_V1:{direction:()=> 'HIGHER'}},
 document:{},Date,Number,Map,Set
};
vm.createContext(sourceContext);
const scope=source.slice(source.indexOf('const kpiKey='),source.indexOf('function contradictions(all)'));
vm.runInContext(scope,sourceContext);
const previous={...row('india','Test KPI',false,80),targetMonth:7,rootCause:'Recurring delay',recoveryPlan:'Daily review',reason:'Supplier delay'};
const current={...row('brazil','Test KPI',false,70),targetMonth:8,rootCause:'Recurring delay',recoveryPlan:'Daily review',reason:'Supplier delay'};
assert.equal(sourceContext.closedLoop([previous,current]).length,0,'different plants must not form consecutive-month recovery history');
const sameCurrent={...current,plant:'india'};
assert.ok(sourceContext.closedLoop([previous,sameCurrent]).length>0,'same plant consecutive-month history must remain detectable');
const flagged=sourceContext.flagsFor(current,[previous,current]);
assert.ok(!flagged.some(x=>String(x[1]).includes('연속 동일')),'cross-plant root cause must not be counted as repeated');
console.log('PASS: cross-plant recovery history and repeated root-cause isolation');

