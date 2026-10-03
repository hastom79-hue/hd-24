(()=>{'use strict';
function assert(name,ok,detail){return {name,ok:!!ok,detail:detail||''}}
function row(kpi,month,target,actual,extra={}){return {kpi,kpiEn:kpi,month,year:2026,target,actual,...extra}}
function run(){
 const E=window.HD24_RULE_MATRIX_V1;if(!E)return {passed:0,failed:1,results:[assert('engine loaded',false)]};
 const rs=[];
 // O-ring: recurring miss + human/activity response
 rs.push(row('IQ200 Production responsibility',6,.122,.222,{direction:'LOWER',reason:'O-ring damage/missing man-dependent',rootCause:'man-dependent',recoveryPlan:'awareness training'}));
 rs.push(row('IQ200 Production responsibility',7,.119,.190,{direction:'LOWER',reason:'O-ring damage/missing man-dependent',rootCause:'man-dependent',recoveryPlan:'awareness training'}));
 rs.push(row('IQ200 Production responsibility',8,.116,.193,{direction:'LOWER',reason:'O-ring damage/missing man-dependent',rootCause:'man-dependent',recoveryPlan:'awareness training'}));
 // W+3 strong recovery but still miss
 rs.push(row('W+3 Mix Variation Rate',7,.04,.101,{direction:'LOWER'}));rs.push(row('W+3 Mix Variation Rate',8,.04,.0497,{direction:'LOWER'}));
 // Fabrication WIP future due relative to Aug analysis
 rs.push(row('WIP compliance Fabrication',8,.84,.623,{direction:'HIGHER',recoveryPlan:'4th Robot Welding + 2 VMC installation',plannedCompletionDate:'W3 Sep'}));
 // Assembly MH completed in Aug
 rs.push(row('Input MH per machine Assembly',8,37.03,39.5,{direction:'LOWER',recoveryPlan:'10 Ton EOT + 2T jib crane completed Aug',plannedCompletionDate:'2026-08-31'}));
 // Equipment Downtime miss -> recovery
 rs.push(row('Equipment Downtime',7,15,17.7,{direction:'LOWER'}));rs.push(row('Equipment Downtime',8,15,13.4,{direction:'LOWER'}));
 // Inventory/MOH trade-off: DIO recovers while aging/turnover remain missed
 rs.push(row('Parts Inventory Turnover',8,10.3,7.8,{direction:'HIGHER',reason:'Increase in MOH qty to counter shortage cases'}));
 rs.push(row('Long-Term Inventory Value',8,18.9,34.2,{direction:'LOWER',reason:'Increase in MOH / odd model inventory'}));
 // Problem-solving activity-result gap
 rs.push(row('Problem-Solving Personnel',8,21,22,{direction:'HIGHER'}));
 rs.push(row('Coaching Problem-Solving',8,8,7,{direction:'HIGHER',reason:'high production demand, coaching time shortage',recoveryPlan:'tracking and motivation'}));
 rs.push(row('Important Problem Identification',8,2,1,{direction:'HIGHER',reason:'high production demand, coaching time shortage',recoveryPlan:'tracking and motivation'}));
 // source status mismatch
 rs.push(row('Status Integrity KPI',8,100,90,{direction:'HIGHER',achieved:true}));
 // equipment structural issue must not become standard-control eligible
 rs.push(row('Equipment Structural Loss',8,10,14,{direction:'LOWER',reason:'equipment breakdown',rootCause:'bearing failure',recoveryPlan:'equipment replacement'}));
 // attachment-only quality
 rs.push(row('Initial Quality',8,24,35,{direction:'LOWER',reason:'Find attached'}));
 // DIO lower is better + recovery
 rs.push(row('DIO',7,38.42,44.19));rs.push(row('DIO',8,46.79,48.03));
 const A=E.analyzeAll(rs),find=k=>A.find(x=>x.record.kpiEn===k&&x.record.month===8);
 const o=find('IQ200 Production responsibility'),w=find('W+3 Mix Variation Rate'),fw=find('WIP compliance Fabrication'),mh=find('Input MH per machine Assembly'),iq=find('Initial Quality'),dio=find('DIO'),down=find('Equipment Downtime'),si=find('Status Integrity KPI'),eq=find('Equipment Structural Loss');
 const q=E.consolidateIssueFollowups(A,[]);
 const results=[
  assert('O-ring PDCA candidate',o.findings.some(f=>f.statement==='PDCA_PROJECT_CANDIDATE')),
  assert('O-ring standard eligible',o.findings.some(f=>f.statement==='STANDARD_CONTROL_ELIGIBLE')),
  assert('O-ring one consolidated question',q.filter(x=>x.issueKey==='QUALITY_O_RING').length===1),
  assert('W+3 strong recovery',w.trend.state==='RECOVERING',w.trend.state),
  assert('Fabrication WIP effect pending before Sep W3',fw.findings.some(f=>f.statement==='EXISTING_ACTION · EFFECT_PENDING')),
  assert('Assembly MH completed requires effect verification',mh.findings.some(f=>f.statement==='EFFECT VERIFICATION REQUIRED')),
  assert('Attachment-only quality traceability gap',iq.findings.some(f=>f.statement==='REPLY_TRACEABILITY_GAP')),
  assert('DIO lower-is-better',E.direction(dio.record)==='LOWER'),
  assert('DIO Aug gap recovery',dio.trend.state==='RECOVERING',dio.trend.state),
  assert('Equipment Downtime recovery confirmed',down.trend.state==='RECOVERY_CONFIRMED',down.trend.state),
  assert('Inventory/MOH trade-off cluster',E.clusterFindings(rs).some(x=>x.cluster==='INVENTORY / MOH'&&x.state.includes('TRADE-OFF'))),
  assert('Problem-solving activity-result gap',E.clusterFindings(rs).some(x=>x.cluster==='PROBLEM SOLVING / PDCA'&&x.state==='ACTIVITY–RESULT GAP')),
  assert('Source status mismatch detected',si.findings.some(f=>f.statement==='SOURCE_STATUS_MISMATCH')),
  assert('Equipment issue excluded from standard-control eligibility',!eq.findings.some(f=>f.type==='STANDARD_CONTROL'))
 ];
 return {passed:results.filter(x=>x.ok).length,failed:results.filter(x=>!x.ok).length,results};
}
window.HD24_GOLDEN_TESTS={run};
function report(){const r=run();window.HD24_GOLDEN_TEST_RESULT=r;const el=document.getElementById('log');if(el)el.textContent+='\n[Golden Regression] '+r.passed+' passed / '+r.failed+' failed'+(r.failed?' · '+r.results.filter(x=>!x.ok).map(x=>x.name).join(', '):' · ALL PASS');}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',report,{once:true});else setTimeout(report,0);
document.dispatchEvent(new CustomEvent('hd24:golden-tests-ready'));
})();