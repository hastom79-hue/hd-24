(()=>{'use strict';
const API={version:'2.9.0',frozenAt:'2026-10-03'};
const norm=s=>String(s??'').toLowerCase().replace(/\s+/g,' ').trim();
const num=v=>{const n=Number(String(v??'').replace(/[% ,]/g,''));return Number.isFinite(n)?n:null};
const pct=(a,b)=>b?((a-b)/Math.abs(b))*100:null;
const monthOf=r=>Number(r.targetMonth??r.month??0);
const kpiOf=r=>String(r.kpiEn||r.kpi||'').trim();
const KPI_DIRECTION_MASTER={
 '"cost" kpi achievement rate':'HIGHER',
 '3 process achievement rate per person':'HIGHER',
 '5s audit score':'HIGHER',
 'average vtb improvement lead time':'LOWER',
 'balancing efficiency':'HIGHER',
 'dio (days inventory outstanding)':'LOWER','dio':'LOWER','days inventory outstanding':'LOWER','inventory days':'LOWER','재고회전일수':'LOWER',
 'domestic incoming plan compliance rate':'HIGHER',
 'equipment downtime loss':'LOWER','equipment downtime':'LOWER',
 'fabrication - weighted average actual lob efficiency':'HIGHER','fabrication weighted average lob efficiency':'HIGHER',
 'iq 200 (initial quality)':'LOWER','initial quality':'LOWER',
 'iq 200 issues with production responsibility':'LOWER','iq200 production responsibility':'LOWER',
 'important problem identification cases (supplier & inhouse)':'HIGHER','important problem identification':'HIGHER',
 'improvements collection rate (team & self)':'HIGHER',
 'inbound material delivery compliance rate':'HIGHER','inbound material delivery compliance':'HIGHER',
 'incident/accident count':'LOWER','incident count':'LOWER',
 'input mh per machine assembly':'LOWER','input mh per machine fabrication':'LOWER',
 'issue recurrence rate':'LOWER',
 'lead time by production line (cutting to dispatch)':'LOWER','lead time by production line':'LOWER',
 'line wise sqdcei kpis achievement rate':'HIGHER',
 'long-term inventory value (6 month basis)':'LOWER','long-term inventory value':'LOWER','long term inventory value':'LOWER',
 'm+1 production volume variation rate':'LOWER','m+1 production volume variation':'LOWER',
 'mtbf (mean time between failure)':'HIGHER',
 'mttd : mean time to detect':'LOWER','mttd':'LOWER',
 'mttr (mean time to repair)':'LOWER',
 'manufacturing lead time (fab tacking to fdi out)':'LOWER',
 'material-induced downtime mh':'LOWER',
 'min/max compliance rate of input materials by process':'HIGHER','min/max compliance input materials':'HIGHER',
 'monthly shipment plan compliance rate (export)':'HIGHER',
 'nva reduction cases reflecting from swc & swct':'HIGHER','nva reduction':'HIGHER',
 'ot mh per unit':'LOWER',
 'option planning forecast accuracy':'HIGHER',
 'order intake fulfillment (w+4 - rolling plan) domestic + export production plan':'HIGHER','order intake fulfillment':'HIGHER',
 'ppm':'LOWER',
 'parts inventory turnover':'HIGHER',
 'pending action lead time (issues closure time/machine)':'LOWER',
 'personnel coaching problem-solving techniques':'HIGHER','coaching problem-solving':'HIGHER','coaching problem solving':'HIGHER',
 'personnel using problem-solving techniques':'HIGHER','problem-solving personnel':'HIGHER','problem solving personnel':'HIGHER',
 'process defect rate (basic quality, leakage, fdi, ndt, isa)':'LOWER','process defect':'LOWER',
 'production incoming plan compliance rate':'HIGHER',
 'production instruction compliance rate (against fdi out plan)':'HIGHER','production instruction':'HIGHER',
 'qir (ppr) improvement completion rate (r210e)':'HIGHER','qir':'HIGHER',
 'quality (mh loss ) line downtime':'LOWER',
 'sequence compliance rate by line':'HIGHER',
 'shipment lead time (wait time)':'LOWER','shipment lead time':'LOWER',
 'small-group improvements per person':'HIGHER','small group improvements/person':'HIGHER',
 'unsafe act & condition identification':'HIGHER',
 'vtb (/improvements) completion rate (against suggestions from suggestion box, 3\'g walk, sip)':'HIGHER',
 'w+3 mix variation rate':'LOWER',
 'w.q. (warranty quality)':'LOWER','warranty quality':'LOWER',
 'wip compliance rate (fabrication)':'HIGHER','wip compliance fabrication':'HIGHER',
 'wip compliance rate(assy line on- line-out )':'HIGHER'
}
function masterDirection(k){
 const n=norm(k);if(KPI_DIRECTION_MASTER[n])return KPI_DIRECTION_MASTER[n];
 const exact=Object.entries(KPI_DIRECTION_MASTER).find(([name])=>n===name);return exact?.[1]||null;
}
const lowerHints=['dio','inventory days','downtime','defect','lead time','mh','overtime','ot mh','incident','recurrence','variation','loss','ppm'];
const higherHints=['compliance','efficiency','score','turnover','availability','fulfillment','coaching','problem identification','nva reduction'];
function direction(r){
 const k=norm(kpiOf(r));
 const md=masterDirection(k);if(md)return md;
 if(r.direction)return String(r.direction).toUpperCase().includes('LOW')?'LOWER':'HIGHER';
 if(lowerHints.some(x=>k.includes(x)))return 'LOWER';
 if(higherHints.some(x=>k.includes(x)))return 'HIGHER';
 return 'UNKNOWN';
}
function targetState(r){
 const t=num(r.target),a=num(r.actual),d=direction(r);
 if(t===null||a===null||d==='UNKNOWN')return {state:'UNKNOWN',gap:null};
 const gap=d==='LOWER'?a-t:t-a;
 return {state:gap<=0?'ACHIEVED':'TARGET_MISS',gap};
}
function seriesFor(r,all){
 const k=norm(kpiOf(r));
 const plant=norm(r.plant||r.plantCode||r.factory||r.site);
 const yearOf=x=>Number(x.targetYear??x.year??2026);
 const monthValid=x=>Number.isInteger(monthOf(x))&&monthOf(x)>=1&&monthOf(x)<=12;
 // Do not infer a history from another plant or from unscoped records.
 if(!plant||!k)return [r];
 return all.filter(x=>norm(kpiOf(x))===k
  &&norm(x.plant||x.plantCode||x.factory||x.site)===plant
  &&monthValid(x))
  .sort((a,b)=>(yearOf(a)*12+monthOf(a))-(yearOf(b)*12+monthOf(b)));
}
function trend(r,all){
 const s=seriesFor(r,all),i=s.findIndex(x=>x===r),cur=targetState(r);
 if(i<1||cur.gap===null)return {state:'NO_TREND',deltaGap:null};
 const prev=targetState(s[i-1]);if(prev.gap===null)return {state:'NO_TREND',deltaGap:null};
 // A target revision changes the gap even when operational performance does not.
 // Keep target achievement for the current month, but withhold a recovery/worsening claim.
 if(num(r.target)!==num(s[i-1].target)||direction(r)!==direction(s[i-1]))
  return {state:'TARGET_CHANGED',deltaGap:null,previousTarget:num(s[i-1].target),currentTarget:num(r.target)};
 const dg=cur.gap-prev.gap;
 if(prev.state==='TARGET_MISS'&&cur.state==='ACHIEVED')return {state:'RECOVERY_CONFIRMED',deltaGap:dg};
 if(prev.state==='ACHIEVED'&&cur.state==='TARGET_MISS')return {state:'NEW_REGRESSION',deltaGap:dg};
 if(cur.state==='TARGET_MISS'&&prev.state==='TARGET_MISS'&&dg<0)return {state:'RECOVERING',deltaGap:dg};
 if(cur.state==='TARGET_MISS'&&dg>0)return {state:'WORSENING_MISS',deltaGap:dg};
 if(cur.state==='ACHIEVED'&&dg>0)return {state:'ACHIEVED_DETERIORATING',deltaGap:dg};
 return {state:'STABLE',deltaGap:dg};
}
function textFields(r){return norm([r.reason,r.rootCause,r.recoveryPlan].filter(Boolean).join(' '))}
function analysisDate(r){
 const y=Number(r.year||2026),m=monthOf(r);return m?new Date(y,m,0,23,59,59):null;
}
function dueDate(r){
 const raw=String(r.plannedCompletionDate||r.dueDate||'').trim();if(!raw)return null;
 let d=new Date(raw);if(!Number.isNaN(d.getTime()))return d;
 const mon={jan:1,feb:2,mar:3,apr:4,may:5,jun:6,jul:7,aug:8,sep:9,oct:10,nov:11,dec:12};
 const m=raw.toLowerCase().match(/w\s*([1-5]).*?(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/);
 if(m){const year=Number(r.year||2026),month=mon[m[2]],week=Number(m[1]);return new Date(year,month-1,Math.min(week*7,new Date(year,month,0).getDate()),23,59,59)}
 return null;
}
function actionState(r){
 const txt=textFields(r), due=String(r.plannedCompletionDate||'').trim();
 const structural=/(robot|vmc|fixture|design|source chang|capacity|equipment|jig|process chang|work method|installation|modify|modification)/.test(txt);
 const activity=/(training|awareness|meeting|tracking|follow.?up|motivation|reward)/.test(txt);
 const attachment=/(find attached|see attached|refer attached)/.test(norm(r.reason));
 const completed=/(completed|complete|implemented|installed|done)/.test(txt);
 return {structural,activity,attachment,due,dueDate:dueDate(r),completed,owner:String(r.actionOwner||'').trim()};
}
function finding(rule,type,statement,evidence,confidence='MEDIUM',question=false){return {rule,type,statement,evidence,confidence,questionRequired:question,evidenceRequired:false}}
function sourceIntegrity(r){
 const ts=targetState(r); if(ts.state==='UNKNOWN'||typeof r.achieved!=='boolean')return null;
 const source=r.achieved?'ACHIEVED':'TARGET_MISS';
 return source===ts.state?null:finding('R28','DATA_INTEGRITY','SOURCE_STATUS_MISMATCH',`System=${ts.state}, Source=${source}; Direction=${direction(r)}; Target=${r.target??'-'}; Actual=${r.actual??'-'}`,'HIGH',false);
}
function actionMechanism(r){
 const t=textFields(r);
 if(/robot|capacity|4th robot|2 vmc|machining vmc/.test(t)&&/capacity|wip|input mh|bottleneck|production/.test(t))return 'CAPACITY_EXPANSION';
 if(/ndt|weld|welding|root gap|precision|feeding/.test(t))return 'QUALITY_ROOT_REMOVAL';
 if(/inventory|moh|shortage/.test(t))return 'INVENTORY_BUFFER';
 if(/training|awareness/.test(t))return 'HUMAN_ACTIVITY';
 return 'OTHER';
}
function clusterFindings(rows){
 const out=[], byMonth=new Map(); rows.forEach(r=>{
  const plant=norm(r.plant||r.plantCode||r.factory||r.site);
  const year=Number(r.targetYear??r.year??2026),month=monthOf(r);
  if(!plant||!Number.isInteger(year)||!Number.isInteger(month)||month<1||month>12)return;
  const key=plant+'|'+year+'|'+month;
  if(!byMonth.has(key))byMonth.set(key,[]);
  byMonth.get(key).push(r);
 });
 const has=(r,terms)=>terms.some(t=>norm(kpiOf(r)).includes(t));
 for(const [scope,rs] of byMonth){
  const month=monthOf(rs[0]);
  const inv=rs.filter(r=>has(r,['dio','inventory','turnover','material delivery','inbound material','long-term inventory','long term inventory']));
  if(inv.length>=2){
   const dio=inv.find(r=>/\bdio\b|inventory days/.test(norm(kpiOf(r)))), aging=inv.find(r=>/long.?term inventory|aging inventory/.test(norm(kpiOf(r)))), turn=inv.find(r=>/inventory turnover/.test(norm(kpiOf(r))));
   if(dio&&trend(dio,rows).state==='RECOVERING'&&((aging&&targetState(aging).state==='TARGET_MISS')||(turn&&targetState(turn).state==='TARGET_MISS')))
    out.push({month,cluster:'INVENTORY / MOH',state:'PARTIAL EFFECT · INVENTORY TRADE-OFF',confidence:'HIGH',kpis:inv.map(kpiOf),statement:'Overall inventory-days gap is recovering, while aging inventory and/or parts turnover remain problematic. Total-flow recovery does not prove inventory structure recovery.',questionRequired:false});
  }
  const fab=rs.filter(r=>/vmc|ndt|weld|fabrication|balancing|wip|input mh|ot mh/.test(textFields(r)+' '+norm(kpiOf(r))));
  const cap=fab.filter(r=>actionMechanism(r)==='CAPACITY_EXPANSION'), qual=fab.filter(r=>actionMechanism(r)==='QUALITY_ROOT_REMOVAL');
  if(cap.length&&qual.length)out.push({month,cluster:'FABRICATION',state:'SEPARATE ACTION MECHANISMS',confidence:'HIGH',kpis:[...new Set([...cap,...qual].map(kpiOf))],statement:'VMC-related actions are separated by intended mechanism: capacity expansion versus NDT/welding quality-root removal. Shared equipment terminology alone must not merge the issues.',questionRequired:false});
  const q=rs.filter(r=>has(r,['process defect','initial quality','production responsibility','production attributable','warranty']));
  const process=q.find(r=>/process defect/.test(norm(kpiOf(r)))), result=q.find(r=>/initial quality|production responsibility|production attributable/.test(norm(kpiOf(r))));
  if(process&&result&&targetState(process).state==='ACHIEVED'&&targetState(result).state==='TARGET_MISS')
   out.push({month,cluster:'QUALITY / PROCESS',state:'RESULT–PROCESS GAP',confidence:'HIGH',kpis:[kpiOf(process),kpiOf(result)],statement:'Process KPI is achieved while production/customer quality result remains missed; validate denominator, inspection scope and whether process control translates to result quality.',questionRequired:true});
  const ps=rs.filter(r=>has(r,['problem-solving personnel','problem solving personnel','coaching problem-solving','coaching problem solving','important problem identification','nva reduction']));
  if(ps.length>=2){
   const achieved=ps.some(r=>targetState(r).state==='ACHIEVED'), missed=ps.some(r=>targetState(r).state==='TARGET_MISS');
   if(achieved&&missed)out.push({month,cluster:'PROBLEM SOLVING / PDCA',state:'ACTIVITY–RESULT GAP',confidence:'HIGH',kpis:ps.map(kpiOf),statement:'Participation/headcount achievement coexists with weak problem-selection/coaching/NVA execution. Treat this as a problem-solving execution-funnel gap, not a simple participation failure.',questionRequired:true});
  }
 }
 return out;
}
function analyze(r,all){
 const fs=[],ts=targetState(r),tr=trend(r,all),act=actionState(r),txt=textFields(r),s=seriesFor(r,all),idx=s.findIndex(x=>x===r),prev=idx>0?s[idx-1]:null; const integrity=sourceIntegrity(r); if(integrity)fs.push(integrity);
 fs.push(finding('R01','PERFORMANCE',ts.state,`Target=${r.target??'-'}, Actual=${r.actual??'-'}, Direction=${direction(r)}`,'HIGH'));
 if(tr.state!=='NO_TREND'&&tr.state!=='STABLE')fs.push(finding(tr.state==='RECOVERING'?'R02':tr.state==='RECOVERY_CONFIRMED'?'R04':tr.state==='NEW_REGRESSION'?'R05':'R03','TREND',tr.state,`Target-gap change=${tr.deltaGap??'-'}`,'HIGH',tr.state==='NEW_REGRESSION'));
 if(act.attachment)fs.push(finding('R15','REPLY_VALIDATION','REPLY_TRACEABILITY_GAP','Attachment-only reply; structured root/action/owner/due is not traceable','HIGH',true));
 if(act.structural&&act.due){
  const asOf=analysisDate(r)||new Date(), future=act.dueDate&&act.dueDate>asOf;
  if(future)fs.push(finding('R11','ACTION','EXISTING_ACTION · EFFECT_PENDING',`Structural action is in progress; due ${act.due}. Do not classify as action failure before due.`,'HIGH',false));
  else if(act.completed)fs.push(finding('R14','ACTION','EFFECT VERIFICATION REQUIRED',`Structural action is reported complete; verify subsequent KPI/loss response before closure.`,'HIGH',false));
  else fs.push(finding('R12','ACTION','DUE CHECK REQUIRED',`Action due date ${act.due} has been reached/passed; completion/effect requires validation.`,'MEDIUM',true));
 }
 if(act.activity&&!act.structural&&ts.state==='TARGET_MISS')fs.push(finding('R10','ACTION','ACTIVITY_ACTION','Training/awareness/meeting/tracking action without structural countermeasure evidence','MEDIUM',false));
 if(prev){
  const sameRoot=norm(prev.rootCause)&&norm(prev.rootCause)===norm(r.rootCause);
  const sameReason=norm(prev.reason)&&norm(prev.reason)===norm(r.reason);
  if((sameRoot||sameReason)&&ts.state==='TARGET_MISS')fs.push(finding('R06','CAUSE','RECURRING_CAUSE',sameRoot?'Same root cause repeated':'Same reason repeated','HIGH',false));
 }
 if(/man.?dependent/.test(txt)&&s.filter(x=>/man.?dependent/.test(textFields(x))).length>=2)fs.push(finding('R21','PDCA','PDCA_PROJECT_CANDIDATE','Repeated man-dependent cause with recurring activity response','HIGH',true));
 const sc=standardControlEligibility(r,all);
 if(sc.state==='STANDARD_CONTROL_ELIGIBLE')fs.push(finding('R24','STANDARD_CONTROL','STANDARD_CONTROL_ELIGIBLE',sc.reason+'; audit target='+sc.auditTarget+'; recurrence='+sc.recurrenceCriteria,'MEDIUM',false));
 if(/find attached|see attached|refer attached/.test(txt)&&ts.state==='TARGET_MISS')fs.push(finding('R15','REPLY_VALIDATION','STRUCTURED_RE_REPLY_REQUIRED','Long/missed KPI cannot be tracked from attachment reference alone','HIGH',true));
 return fs;
}
function pdcaClosure(r,all){
 const act=actionState(r), sc=standardControlEligibility(r,all), tr=trend(r,all), ts=targetState(r);
 const sustained=!!(r.sustainedResultVerified||r.sustainmentVerified), effectVerified=!!r.effectVerified;
 const standardVerified=!sc.eligible||!!r.standardControlVerified, recurrenceVerified=!sc.eligible||!!r.recurrenceMonitored;
 if(effectVerified&&sustained&&standardVerified&&recurrenceVerified&&ts.state==='ACHIEVED')
  return {state:'CLOSED_SUSTAINED',closed:true,next:'MONITOR_FOR_RECURRENCE',closureEvidence:{effectVerified,sustained,standardVerified,recurrenceVerified}};
 if(act.structural&&act.due){
  const asOf=analysisDate(r)||new Date(),future=act.dueDate&&act.dueDate>asOf;
  if(future)return {state:'ACTION_IMPLEMENTATION',closed:false,next:'EFFECT_VERIFICATION'};
  if(!act.completed)return {state:'ACTION_OVERDUE_OR_UNCONFIRMED',closed:false,next:'CONFIRM_COMPLETION'};
  if(tr.state!=='RECOVERY_CONFIRMED'&&tr.state!=='RECOVERING')return {state:'EFFECT_VERIFICATION_PENDING',closed:false,next:'VERIFY_EFFECT'};
  if(sc.eligible)return {state:'STANDARDIZATION_AND_RECURRENCE_MONITORING',closed:false,next:'VERIFY_STANDARD_CONTROL_AND_RECURRENCE'};
  return {state:'SUSTAINMENT_MONITORING',closed:false,next:'VERIFY_SUSTAINED_RESULT'};
 }
 if(ts.state==='ACHIEVED'&&tr.state==='RECOVERY_CONFIRMED')return {state:'SUSTAINMENT_MONITORING',closed:false,next:'VERIFY_SUSTAINED_RESULT'};
 return {state:'OPEN',closed:false,next:'CONTINUE_MANAGEMENT_REVIEW'};
}
function managementState(fs){
 const has=x=>fs.some(f=>f.statement.includes(x)||f.type===x);
 if(has('REPLY_TRACEABILITY_GAP'))return 'DATA/REPLY VALIDATION';
 if(has('PDCA_PROJECT_CANDIDATE'))return 'PDCA CANDIDATE';
 if(has('EXISTING_ACTION · EFFECT_PENDING'))return 'ACTION TRACKING';
 if(has('RECOVERING')||has('RECOVERY_CONFIRMED'))return 'RECOVERING';
 if(fs.some(f=>f.questionRequired))return 'FOLLOW-UP REQUIRED';
 return 'WATCH';
}
function issueKeyFor(r){
 const t=textFields(r),k=norm(kpiOf(r));
 if(/o.?ring/.test(t))return 'QUALITY_O_RING';
 if(/find attached|see attached|refer attached/.test(t)&&/initial quality|warranty/.test(k))return 'QUALITY_ATTACHMENT_TRACEABILITY';
 if(actionMechanism(r)==='CAPACITY_EXPANSION')return 'FAB_CAPACITY';
 if(actionMechanism(r)==='QUALITY_ROOT_REMOVAL')return 'FAB_NDT_WELDING';
 if(/dio|inventory|turnover|material delivery|shortage|moh/.test(k+' '+t))return 'INVENTORY_MOH';
 if(/problem.?solving|coaching|nva|important problem/.test(k))return 'PROBLEM_SOLVING_PDCA';
 return 'KPI:'+k;
}
function issueIdentity(r){
 const base=issueKeyFor(r),mech=actionMechanism(r);
 // Stable identity is problem-family + intended action mechanism. Cause text is metadata:
 // a later verified cause shift must not silently create a brand-new issue and erase history.
 const cd=norm(r.rootCause||r.reason||'').split(' ').filter(x=>x.length>3).slice(0,4).join('_');
 return {issueId:[base,mech].join('::'),base,mechanism:mech,causeSignature:cd||'UNSPECIFIED'};
}
function issueTimeline(analyzed){
 const m=new Map();
 for(const x of analyzed){
  const id=issueIdentity(x.record).issueId;
  if(!m.has(id))m.set(id,[]);
  m.get(id).push(x);
 }
 return [...m.entries()].map(([issueId,xs])=>{
  xs.sort((a,b)=>(monthOf(a.record)||0)-(monthOf(b.record)||0));
  const latest=xs[xs.length-1];
  const causeShift=xs.some((x,i)=>i>0&&x.causeDynamics?.state==='CAUSE_SHIFT');
  const priorClosed=xs.slice(0,-1).some(x=>x.pdcaClosure?.closed===true);
  const latestOpen=latest.pdcaClosure?.closed!==true;
  const reopened=priorClosed&&latestOpen;
  return {issueId,months:xs.map(x=>monthOf(x.record)),firstMonth:monthOf(xs[0].record),latestMonth:monthOf(latest.record),status:reopened?'RECURRENCE_REOPENED':(latest.pdcaClosure?.state||latest.managementState),closed:latest.pdcaClosure?.closed===true,reopened,causeShift,kpis:[...new Set(xs.map(x=>kpiOf(x.record)))]};
 });
}
function consolidateIssueFollowups(analyzed,clusters=[]){
 const groups=new Map();
 for(const x of analyzed){const key=issueKeyFor(x.record);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(x)}
 const out=[];
 for(const [key,xs] of groups){
  const raw=[...new Set(xs.flatMap(x=>x.questions))]; if(!raw.length)continue;
  let question=raw.join(' ');
  if(key==='QUALITY_O_RING')question='Please confirm the root-cause removal and recurrence-prevention control for the recurring O-ring issue, how effectiveness is verified, and whether the relevant work is included in standard-compliance/recurrence management.';
  if(key==='QUALITY_ATTACHMENT_TRACEABILITY')question='Please state Root Cause / Action / Owner / Due explicitly in the reply table for the Initial Quality/Warranty issue so that the same issue can be tracked and revalidated next month.';
  if(key==='PROBLEM_SOLVING_PDCA')question='Please confirm how recurring priority problems are selected, projectized, followed through root-cause removal, and verified for effect in daily management.';
  out.push({issueKey:key,kpis:[...new Set(xs.map(x=>kpiOf(x.record)))],question,confidence:xs.some(x=>x.findings.some(f=>f.confidence==='HIGH'))?'HIGH':'MEDIUM'});
 }
 for(const cl of clusters.filter(x=>x.questionRequired)){
  const covered=out.some(x=>(x.kpis||[]).some(k=>(cl.kpis||[]).includes(k)));
  if(covered)continue;
  const key='CLUSTER:'+cl.cluster;if(out.some(x=>x.issueKey===key))continue;
  let question=cl.statement;
  if(cl.cluster==='QUALITY / PROCESS')question='Please clarify whether the achieved process-defect KPI and the missed production/initial-quality KPI use the same defect mechanism, denominator, inspection scope and sampling basis, and how process control is expected to translate to result quality.';
  if(cl.cluster==='PROBLEM SOLVING / PDCA')question='Please confirm how recurring priority problems are selected, projectized, followed through root-cause removal, and verified for effect in daily management.';
  out.push({issueKey:key,kpis:cl.kpis,question,confidence:cl.confidence||'MEDIUM'});
 }
 return out;
}
function consolidateQuestions(findings){
 const qs=findings.filter(f=>f.questionRequired);
 if(!qs.length)return [];
 const types=new Set(qs.map(x=>x.type));
 const out=[];
 if(types.has('REPLY_VALIDATION'))out.push('Please provide the root cause, action, owner and due date explicitly in the reply table so the issue can be tracked and revalidated next month.');
 if(types.has('PDCA')||types.has('STANDARD_CONTROL'))out.push('Please confirm the root-cause removal and recurrence-prevention control for this recurring issue, how effectiveness is verified, and whether the relevant work is included in standard-compliance/recurrence management where applicable.');
 if(types.has('TREND'))out.push('Please clarify the key driver of the new regression and the current recovery action.');
 return [...new Set(out)];
}
function standardControlEligibility(r,all){
 const text=norm([r.reason,r.rootCause,r.recoveryPlan,r.action].filter(Boolean).join(' '));
 const structural=/(supplier|vendor|design|drawing|component|bearing|equipment breakdown|machine breakdown|hardware failure)/.test(text);
 const humanMethod=/(man-dependent|operator|human|method|work method|standard work|standard|sop|swc|swct|training|awareness|procedure|instruction|o-ring|oring)/.test(text);
 const cd=causeDynamics(r,all),recurring=cd.state==='RECURRING_CAUSE'||Number(r.streak||0)>=2;
 if(structural&&!humanMethod)return {eligible:false,state:'STANDARD_CONTROL_NA',reason:'Supplier/Design/Equipment structural issue without Human/Method/Standard linkage'};
 if(humanMethod&&recurring)return {eligible:true,state:'STANDARD_CONTROL_ELIGIBLE',reason:'Recurring issue with Human/Method/Standard linkage',auditPriority:'HIGH',auditTarget:'SELECT_RISK_BASED_WORK',recurrenceLevel:'DIRECT_OR_SIMILAR_REVIEW',recurrenceCriteria:'DEFINE_DIRECT_AND_SIMILAR',complianceVerification:'REQUIRED',closureGate:'EFFECT_VERIFIED + STANDARD_CONTROL_VERIFIED + RECURRENCE_MONITORED'};
 if(humanMethod)return {eligible:true,state:'STANDARD_CONTROL_WATCH',reason:'Human/Method/Standard linkage detected; recurrence not yet established',auditPriority:'MEDIUM',auditTarget:'REVIEW_IF_HIGH_RISK',recurrenceLevel:'DEFINE_IF_REPEATED',recurrenceCriteria:'PREDEFINE_IF_CRITICAL',complianceVerification:'CONDITIONAL',closureGate:'EFFECT_VERIFIED'};
 return {eligible:false,state:'STANDARD_CONTROL_NOT_TRIGGERED',reason:'Human/Method/Standard linkage not evidenced'};
}
function causeDynamics(r,all){
 const s=seriesFor(r,all),i=s.findIndex(x=>x===r);
 const raw=String(r.rootCause||r.reason||'').trim(),cur=norm(raw);
 if(!cur||/^(na|n\/a|-|none|unknown)$/.test(cur))return {state:'CAUSE_UNKNOWN',confidence:'LOW',evidence:'Root cause/reason not established'};
 const parts=raw.split(/;|\n|\+|\/|,|\band\b|&/i).map(x=>x.trim()).filter(x=>x.length>2);
 const multi=parts.length>=2;
 if(i<1)return {state:multi?'MULTIPLE_CAUSE':'CAUSE_IDENTIFIED',confidence:multi?'MEDIUM':'LOW',evidence:raw};
 const prevRaw=String(s[i-1].rootCause||s[i-1].reason||'').trim(),prev=norm(prevRaw);
 if(!prev)return {state:multi?'MULTIPLE_CAUSE':'CAUSE_IDENTIFIED',confidence:'MEDIUM',evidence:raw};
 const tokens=x=>new Set(norm(x).replace(/[^a-z0-9가-힣 ]/g,' ').split(/\s+/).filter(w=>w.length>2&&!['the','and','with','due','from','issue','issues'].includes(w)));
 const a=tokens(prevRaw),b=tokens(raw),inter=[...a].filter(x=>b.has(x)).length,union=new Set([...a,...b]).size,sim=union?inter/union:0;
 const same=cur===prev||sim>=0.45;
 if(same){
  const recurring=targetState(r).state==='TARGET_MISS'&&targetState(s[i-1]).state==='TARGET_MISS';
  return {state:recurring?'RECURRING_CAUSE':'SAME_CAUSE',confidence:cur===prev?'HIGH':'MEDIUM',evidence:'Prev: '+prevRaw+' / Current: '+raw};
 }
 if(multi)return {state:'MULTIPLE_CAUSE',confidence:'MEDIUM',evidence:'Prev: '+prevRaw+' / Current: '+raw};
 return {state:'CAUSE_SHIFT',confidence:'MEDIUM',evidence:'Prev: '+prevRaw+' / Current: '+raw};
}
function actionAttribution(r,all){
 const s=seriesFor(r,all),i=s.findIndex(x=>x===r),tr=trend(r,all),ad=actionDetail(r);
 if(!['RECOVERING','RECOVERY_CONFIRMED'].includes(tr.state))return {state:'NO_RECOVERY_SIGNAL',confidence:'LOW',reason:'No KPI recovery signal'};
 if(!ad.action||ad.action==='-')return {state:'RECOVERY OBSERVED · ATTRIBUTION UNCERTAIN',confidence:'LOW',reason:'No attributable action recorded'};
 const curDate=analysisDate(r),due=ad.dueDate;
 if(due&&curDate&&due>curDate)return {state:'RECOVERY OBSERVED · ATTRIBUTION UNCERTAIN',confidence:'MEDIUM',reason:'Recovery precedes action due/effect window'};
 const mech=actionMechanism(r),cause=norm(r.rootCause||r.reason||'');
 const plausible=mech!=='OTHER'||/(capacity|quality|inventory|human|training|equipment|weld|vmc|moh)/.test(cause);
 const cd=causeDynamics(r,all);
 if(!plausible)return {state:'RECOVERY OBSERVED · ATTRIBUTION UNCERTAIN',confidence:'LOW',reason:'Action mechanism linkage not established'};
 if(cd.state==='CAUSE_SHIFT')return {state:'RECOVERY OBSERVED · ATTRIBUTION UNCERTAIN',confidence:'MEDIUM',reason:'Cause shifted across recovery period; prior action attribution withheld'};
 if(cd.state==='MULTIPLE_CAUSE'||cd.state==='CAUSE_UNKNOWN')return {state:'RECOVERY OBSERVED · ATTRIBUTION UNCERTAIN',confidence:'LOW',reason:'Cause structure is multiple/uncertain; causal attribution withheld'};
 if(ad.completed&&['SAME_CAUSE','RECURRING_CAUSE','CAUSE_IDENTIFIED'].includes(cd.state))return {state:'EFFECT SIGNAL OBSERVED',confidence:'MEDIUM',reason:'Completed structural/action mechanism aligns with stable cause and recovery timing; causal proof still requires effect verification'};
 return {state:'RECOVERY OBSERVED · ATTRIBUTION UNCERTAIN',confidence:'MEDIUM',reason:'Action completion/effect verification pending'};
}
function effectState(x){
 const fs=x.findings||[],act=x.action||{},tr=x.trend||{};
 if(fs.some(f=>f.statement==='EXISTING_ACTION · EFFECT_PENDING'))return 'EFFECT PENDING';
 if(act.completed&&['RECOVERING','RECOVERY_CONFIRMED'].includes(tr.state))return 'RECOVERY OBSERVED · ATTRIBUTION UNCERTAIN';
 if(act.completed&&['WORSENING_MISS','STABLE','NO_TREND'].includes(tr.state))return 'ACTION COMPLETED · EFFECT VERIFICATION PENDING';
 if(['RECOVERING','RECOVERY_CONFIRMED'].includes(tr.state))return 'RECOVERY OBSERVED';
 return 'NOT YET VERIFIED';
}
function actionDetail(x){
 const r=x.record||{},a=x.action||{};const txt=String(r.recoveryPlan||r.action||r.countermeasure||r.plan||'').trim();
 return {text:txt||'No structured action text',owner:a.owner||'',due:a.due||'',completed:!!a.completed,state:a.structural?'STRUCTURAL':a.activity?'ACTIVITY':'UNCLASSIFIED',effect:effectState(x)};
}
function auditSummary(rows){
 const out={rows:rows.length,valid:0,statusMismatch:0,directionUnregistered:0,uncalculable:0,masterCovered:0};
 for(const r of rows){
  const k=kpiOf(r),md=masterDirection(k),d=direction(r),t=num(r.target),a=num(r.actual);
  if(md)out.masterCovered++;
  if(!md&&!r.direction)out.directionUnregistered++;
  if(t===null||a===null||d==='UNKNOWN'){out.uncalculable++;continue}
  const si=sourceIntegrity(r);if(si)out.statusMismatch++;else out.valid++;
 }
 out.masterCoveragePct=out.rows?Math.round(out.masterCovered/out.rows*1000)/10:0;
 return out;
}
function integrityGate(r){
 const d=direction(r),t=num(r.target),a=num(r.actual),si=sourceIntegrity(r);
 if(d==='UNKNOWN')return {state:'BLOCK',confidence:'LOW',reason:'DIRECTION_UNKNOWN'};
 if(t===null||a===null)return {state:'BLOCK',confidence:'LOW',reason:'TARGET_ACTUAL_UNCALCULABLE'};
 if(si)return {state:'REVIEW',confidence:'MEDIUM',reason:'SOURCE_STATUS_MISMATCH'};
 return {state:'PASS',confidence:'HIGH',reason:'CALCULATION_VERIFIED'};
}
function analyzeAll(rows){
 return rows.map(r=>{const findings=analyze(r,rows);return {record:r,direction:direction(r),target:targetState(r),trend:trend(r,rows),findings,managementState:managementState(findings),questions:consolidateQuestions(findings),actionAttribution:actionAttribution(r,rows),causeDynamics:causeDynamics(r,rows),pdcaClosure:pdcaClosure(r,rows)}})
}
window.HD24_RULE_MATRIX_V1={...API,KPI_DIRECTION_MASTER,masterDirection,direction,auditSummary,integrityGate,causeDynamics,standardControlEligibility,actionAttribution,pdcaClosure,issueIdentity,issueTimeline,targetState,trend,sourceIntegrity,actionMechanism,clusterFindings,issueKeyFor,consolidateIssueFollowups,analysisDate,dueDate,effectState,actionDetail,analyze,analyzeAll,consolidateQuestions};
document.dispatchEvent(new CustomEvent('hd24:rule-matrix-ready',{detail:API}));
})();