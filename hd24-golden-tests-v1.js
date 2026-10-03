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
 // Fabrication LOB cause dynamics: 6->7 shift, 7->8 recurrence
 rs.push(row('Fabrication Cause Golden',6,74,73.6,{direction:'HIGHER',reason:'odd model demand and capacity'}));
 rs.push(row('Fabrication Cause Golden',7,75,73.1,{direction:'HIGHER',reason:'NDT welding root gap'}));
 rs.push(row('Fabrication Cause Golden',8,75,73.9,{direction:'HIGHER',reason:'NDT welding root gap'}));
 // Attribution: recovery with shifted cause must not prove action effect
 rs.push(row('Attribution Shift Golden',7,10,14,{direction:'LOWER',reason:'capacity shortage',recoveryPlan:'equipment expansion',completed:true}));
 rs.push(row('Attribution Shift Golden',8,10,9,{direction:'LOWER',reason:'supplier quality issue',recoveryPlan:'equipment expansion',completed:true}));
 // Attribution: stable cause + completed structural action = effect signal only
 rs.push(row('Attribution Stable Golden',7,10,14,{direction:'LOWER',reason:'capacity shortage',recoveryPlan:'equipment expansion',completed:true}));
 rs.push(row('Attribution Stable Golden',8,10,9,{direction:'LOWER',reason:'capacity shortage',recoveryPlan:'equipment expansion',completed:true}));
 // attachment-only quality
 rs.push(row('Initial Quality',8,24,35,{direction:'LOWER',reason:'Find attached'}));
 // DIO lower is better + recovery
 rs.push(row('DIO',7,38.42,44.19));rs.push(row('DIO',8,46.79,48.03));
 const A=E.analyzeAll(rs),find=k=>A.find(x=>x.record.kpiEn===k&&x.record.month===8);
 const attrShift=E.analyzeAll(rs).find(x=>x.record.kpi==='Attribution Shift Golden'&&x.record.month===8),attrStable=E.analyzeAll(rs).find(x=>x.record.kpi==='Attribution Stable Golden'&&x.record.month===8),fab7=E.analyzeAll(rs).find(x=>x.record.kpi==='Fabrication Cause Golden'&&x.record.month===7),fab8=E.analyzeAll(rs).find(x=>x.record.kpi==='Fabrication Cause Golden'&&x.record.month===8),o=find('IQ200 Production responsibility'),w=find('W+3 Mix Variation Rate'),fw=find('WIP compliance Fabrication'),mh=find('Input MH per machine Assembly'),iq=find('Initial Quality'),dio=find('DIO'),down=find('Equipment Downtime'),si=find('Status Integrity KPI'),eq=find('Equipment Structural Loss');
 const q=E.consolidateIssueFollowups(A,[]);
 const india52=[
 '"Cost" KPI Achievement Rate','3 process achievement rate per person','5S Audit Score','Average VTB Improvement Lead Time','Balancing Efficiency','DIO (Days Inventory Outstanding)','Domestic Incoming Plan Compliance Rate','Equipment Downtime Loss','Fabrication - Weighted Average ACTUAL LOB Efficiency','IQ 200 (Initial Quality)','IQ 200 Issues with Production responsibility','Important Problem Identification Cases  (Supplier & Inhouse)','Improvements Collection Rate (Team & Self)','Inbound Material Delivery Compliance Rate','Incident/Accident Count','Input MH per machine Assembly','Input MH per machine Fabrication','Issue Recurrence Rate','Lead Time by Production Line (Cutting To Dispatch)','Line wise SQDCEI KPIs Achievement Rate','Long-Term Inventory Value (6 month basis)','M+1 Production Volume Variation Rate','MTBF (Mean Time  Between Failure)','MTTD : Mean Time To Detect','MTTR (Mean Time To Repair)','Manufacturing Lead Time (Fab Tacking to FDI out)','Material-Induced Downtime MH','Min/Max compliance rate of     input materials by process','Monthly Shipment Plan Compliance Rate (Export)','NVA reduction cases reflecting from SWC & SWCT','OT MH per Unit','Option Planning Forecast Accuracy','Order Intake Fulfillment (W+4 - Rolling Plan)  Domestic + Export Production Plan','PPM','Parts Inventory Turnover','Pending Action Lead Time  (Issues closure time/machine)','Personnel Coaching Problem-Solving Techniques','Personnel Using Problem-Solving Techniques','Process Defect Rate (Basic Quality, Leakage, FDI, NDT, ISA)','Production Incoming Plan Compliance Rate','Production Instruction Compliance Rate  (against FDI out plan)','QIR (PPR) Improvement Completion Rate (R210E)','Quality (MH Loss ) Line Downtime','Sequence Compliance Rate by Line','Shipment Lead Time (Wait Time)','Small-Group Improvements per Person','Unsafe Act & Condition Identification',"VTB (/Improvements) Completion Rate  (against suggestions from Suggestion box, 3'G walk, SIP)",'W+3 Mix Variation Rate','W.Q. (Warranty Quality)','WIP compliance rate (Fabrication)','WIP compliance rate(Assy Line On- Line-Out )'
 ];
 const masterCoverage=india52.filter(k=>E.masterDirection(k)!==null);
 const results=[
  assert('India 52 KPI direction master coverage',masterCoverage.length===52,masterCoverage.length+'/52'),
  assert('O-ring PDCA candidate',o.findings.some(f=>f.statement==='PDCA_PROJECT_CANDIDATE')),
  assert('O-ring standard eligible',o.findings.some(f=>f.statement==='STANDARD_CONTROL_ELIGIBLE')),
  assert('O-ring one consolidated question',q.filter(x=>x.issueKey==='QUALITY_O_RING').length===1),
  assert('W+3 strong recovery',w.trend.state==='RECOVERING',w.trend.state),
  assert('Fabrication WIP effect pending before Sep W3',fw.findings.some(f=>f.statement==='EXISTING_ACTION · EFFECT_PENDING')),
  assert('Assembly MH completed requires effect verification',mh.findings.some(f=>f.statement==='EFFECT VERIFICATION REQUIRED')),
  assert('Attachment-only quality traceability gap',iq.findings.some(f=>f.statement==='REPLY_TRACEABILITY_GAP')),
  assert('DIO lower-is-better',E.direction(dio.record)==='LOWER'),
  assert('Cause shift blocks action attribution',attrShift.actionAttribution.state.includes('ATTRIBUTION UNCERTAIN'),attrShift.actionAttribution.state),
  assert('Stable cause completed action yields effect signal only',attrStable.actionAttribution.state==='EFFECT SIGNAL OBSERVED',attrStable.actionAttribution.state),
  assert('Fabrication 6→7 cause shift',fab7.causeDynamics.state==='CAUSE_SHIFT',fab7.causeDynamics.state),
  assert('Fabrication 7→8 recurring cause',fab8.causeDynamics.state==='RECURRING_CAUSE',fab8.causeDynamics.state),
  assert('DIO Aug gap recovery',dio.trend.state==='RECOVERING',dio.trend.state),
  assert('DIO source-status mismatch preserved',dio.findings.some(f=>f.statement==='SOURCE_STATUS_MISMATCH'),'Aug source says no Current Month miss while recalculation is miss'),
  assert('Equipment Downtime recovery confirmed',down.trend.state==='RECOVERY_CONFIRMED',down.trend.state),
  assert('Inventory/MOH trade-off cluster',E.clusterFindings(rs).some(x=>x.cluster==='INVENTORY / MOH'&&x.state.includes('TRADE-OFF'))),
  assert('Problem-solving activity-result gap',E.clusterFindings(rs).some(x=>x.cluster==='PROBLEM SOLVING / PDCA'&&x.state==='ACTIVITY–RESULT GAP')),
  assert('Source status mismatch detected',si.findings.some(f=>f.statement==='SOURCE_STATUS_MISMATCH')),
  assert('Equipment issue excluded from standard-control eligibility',eq.standardControl?.eligible===false&&eq.standardControl?.state==='STANDARD_CONTROL_NA',eq.standardControl?.state),
  assert('O-ring recurring human-method issue standard eligible',o.standardControl?.eligible===true&&o.standardControl?.state==='STANDARD_CONTROL_ELIGIBLE',o.standardControl?.state),
  assert('O-ring audit target selection required',o.standardControl?.auditTarget==='SELECT_RISK_BASED_WORK',o.standardControl?.auditTarget),
  assert('O-ring recurrence criteria required',o.standardControl?.recurrenceCriteria==='DEFINE_DIRECT_AND_SIMILAR',o.standardControl?.recurrenceCriteria),
  assert('O-ring closure requires standard and recurrence verification',/STANDARD_CONTROL_VERIFIED/.test(o.standardControl?.closureGate||'')&&/RECURRENCE_MONITORED/.test(o.standardControl?.closureGate||''),o.standardControl?.closureGate)
 ];
 return {passed:results.filter(x=>x.ok).length,failed:results.filter(x=>!x.ok).length,results};
}
window.HD24_GOLDEN_TESTS={run};
function report(){const r=run();window.HD24_GOLDEN_TEST_RESULT=r;const el=document.getElementById('log');if(el)el.textContent+='\n[Golden Regression] '+r.passed+' passed / '+r.failed+' failed'+(r.failed?' · '+r.results.filter(x=>!x.ok).map(x=>x.name).join(', '):' · ALL PASS');}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',report,{once:true});else setTimeout(report,0);
document.dispatchEvent(new CustomEvent('hd24:golden-tests-ready'));
})();