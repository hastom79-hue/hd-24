'use strict';
const assert=require('assert');
const c=require('../kpi-action-classifier.js');

function eq(actual,expected,msg){assert.strictEqual(actual,expected,msg);}

let r=c.classifyKpi({values:[100,98,96,94,92,90],target:95,direction:'상향'});
eq(r.missedTarget,true,'higher-is-better target miss not detected');
eq(r.trend,'worsening_6m_plus','6-month worsening not detected');
assert(r.label.includes('당월 목표미달')&&r.label.includes('6개월 이상'), 'combined label missing');
eq(c.visualToken(r).key,'critical-long','6m visual priority wrong');

r=c.classifyKpi({values:[100,99,98],target:97,direction:'상향'});
eq(r.missedTarget,false,'false target miss');
eq(r.trend,'worsening_3m_plus','3-month worsening not detected');

r=c.classifyKpi({values:[100,99],target:95,direction:'상향'});
eq(r.trend,'temporary_worsening','temporary worsening not detected');

r=c.classifyKpi({values:[2.0,2.5,3.1,3.5,4.0,4.2],target:3.0,direction:'하향'});
eq(r.missedTarget,true,'lower-is-better target miss not detected');
eq(r.trend,'worsening_6m_plus','lower-is-better 6-month worsening not detected');

r=c.classifyKpi({values:[80,82,84,86],target:85,direction:'상향'});
eq(r.missedTarget,false,'normal achieved KPI marked miss');
eq(r.trend,'normal','improving KPI marked worsening');
eq(r.label,'정상/개선','normal label mismatch');
eq(c.actionPrompt(r),'','normal KPI should not get action prompt');

r=c.classifyKpi({values:[80,82,81],target:85,direction:'상향'});
eq(r.missedTarget,true,'miss with one-month deterioration not detected');
eq(r.trend,'temporary_worsening','one transition should be temporary worsening');
assert(c.actionPrompt(r).includes('미달사유')&&c.actionPrompt(r).includes('만회계획'),'action prompt missing required fields');

r=c.classifyKpi({values:[80,79,78],target:85,direction:''});
eq(r.missedTarget,false,'unknown direction must fail neutral');
eq(r.trend,'normal','unknown direction must not invent worsening');

console.log('PASS kpi-action-classifier: target miss, 3m/6m, temporary, directionality, combined labels, action prompt');
