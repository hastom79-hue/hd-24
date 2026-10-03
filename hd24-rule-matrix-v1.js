(()=>{'use strict';
const API={version:'1.3.0',frozenAt:'2026-10-03'};
const norm=s=>String(s??'').toLowerCase().replace(/\s+/g,' ').trim();
const num=v=>{const n=Number(String(v??'').replace(/[% ,]/g,''));return Number.isFinite(n)?n:null};
const pct=(a,b)=>b?((a-b)/Math.abs(b))*100:null;
const monthOf=r=>Number(r.targetMonth??r.month??0);
const kpiOf=r=>String(r.kpiEn||r.kpi||'').trim();
const lowerHints=['dio','inventory days','downtime','defect','lead time','mh','overtime','ot mh','incident','recurrence','variation','loss','ppm'];
const higherHints=['compliance','efficiency','score','turnover','availability','fulfillment','coaching','problem identification','nva reduction'];
function direction(r){
 const k=norm(kpiOf(r));
 if(/\bdio\b|days inventory outstanding|inventory days/.test(k))return 'LOWER';
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
function seriesFor(r,all){const k=norm(kpiOf(r));return all.filter(x=>norm(kpiOf(x))===k).sort((a,b)=>monthOf(a)-monthOf(b))}
function trend(r,all){
 const s=seriesFor(r,all),i=s.findIndex(x=>x===r),cur=targetState(r);
 if(i<1||cur.gap===null)return {state:'NO_TREND',deltaGap:null};
 const prev=targetState(s[i-1]);if(prev.gap===null)return {state:'NO_TREND',deltaGap:null};
 const dg=cur.gap-prev.gap;
 if(prev.state==='TARGET_MISS'&&cur.state==='ACHIEVED')return {state:'RECOVERY_CONFIRMED',deltaGap:dg};
 if(prev.state==='ACHIEVED'&&cur.state==='TARGET_MISS')return {state:'NEW_REGRESSION',deltaGap:dg};
 if(cur.state==='TARGET_MISS'&&prev.state==='TARGET_MISS'&&dg<0)return {state:'RECOVERING',deltaGap:dg};
 if(cur.state==='TARGET_MISS'&&dg>0)return {state:'WORSENING_MISS',deltaGap:dg};
 if(cur.state==='ACHIEVED'&&dg>0)return {state:'ACHIEVED_DETERIORATING',deltaGap:dg};
 return {state:'STABLE',deltaGap:dg};
}
function textFields(r){return norm([r.reason,r.rootCause,r.recoveryPlan].filter(Boolean).join(' '))}
function dueDate(r){const raw=String(r.plannedCompletionDate||'').trim();if(!raw)return null;const d=new Date(raw);return Number.isNaN(d.getTime())?null:d}
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
 return source===ts.state?null:finding('R28','DATA_INTEGRITY','SOURCE_STATUS_MISMATCH',\`System=\${ts.state}, Source=\${source}; Direction=\${direction(r)}\`,'HIGH',false);
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
 const out=[], byMonth=new Map(); rows.forEach(r=>{const m=monthOf(r);if(!byMonth.has(m))byMonth.set(m,[]);byMonth.get(m).push(r)});
 const has=(r,terms)=>terms.some(t=>norm(kpiOf(r)).includes(t));
 for(const [month,rs] of byMonth){
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
 fs.push(finding('R01','PERFORMANCE',ts.state,\`Target=\${r.target??'-'}, Actual=\${r.actual??'-'}, Direction=\${direction(r)}\`,'HIGH'));
 if(tr.state!=='NO_TREND'&&tr.state!=='STABLE')fs.push(finding(tr.state==='RECOVERING'?'R02':tr.state==='RECOVERY_CONFIRMED'?'R04':tr.state==='NEW_REGRESSION'?'R05':'R03','TREND',tr.state,\`Target-gap change=\${tr.deltaGap??'-'}\`,'HIGH',tr.state==='NEW_REGRESSION'));
 if(act.attachment)fs.push(finding('R15','REPLY_VALIDATION','REPLY_TRACEABILITY_GAP','Attachment-only reply; structured root/action/owner/due is not traceable','HIGH',true));
 if(act.structural&&act.due){
  const now=new Date(), future=act.dueDate&&act.dueDate>now;
  if(future)fs.push(finding('R11','ACTION','EXISTING_ACTION · EFFECT_PENDING',\`Structural action is in progress; due \${act.due}. Do not classify as action failure before due.\`,'HIGH',false));
  else if(act.completed)fs.push(finding('R14','ACTION','EFFECT VERIFICATION REQUIRED',\`Structural action is reported complete; verify subsequent KPI/loss response before closure.\`,'HIGH',false));
  else fs.push(finding('R12','ACTION','DUE CHECK REQUIRED',\`Action due date \${act.due} has been reached/passed; completion/effect requires validation.\`,'MEDIUM',true));
 }
 if(act.activity&&!act.structural&&ts.state==='TARGET_MISS')fs.push(finding('R10','ACTION','ACTIVITY_ACTION','Training/awareness/meeting/tracking action without structural countermeasure evidence','MEDIUM',false));
 if(prev){
  const sameRoot=norm(prev.rootCause)&&norm(prev.rootCause)===norm(r.rootCause);
  const sameReason=norm(prev.reason)&&norm(prev.reason)===norm(r.reason);
  if((sameRoot||sameReason)&&ts.state==='TARGET_MISS')fs.push(finding('R06','CAUSE','RECURRING_CAUSE',sameRoot?'Same root cause repeated':'Same reason repeated','HIGH',false));
 }
 if(/man.?dependent/.test(txt)&&s.filter(x=>/man.?dependent/.test(textFields(x))).length>=2)fs.push(finding('R21','PDCA','PDCA_PROJECT_CANDIDATE','Repeated man-dependent cause with recurring activity response','HIGH',true));
 if(/o.?ring/.test(txt)&&/man.?dependent|training|awareness/.test(txt))fs.push(finding('R24','STANDARD_CONTROL','STANDARD_CONTROL_ELIGIBLE','Recurring O-ring issue is linked to human/method control; audit coverage/recurrence control should be checked','MEDIUM',true));
 if(/find attached|see attached|refer attached/.test(txt)&&ts.state==='TARGET_MISS')fs.push(finding('R15','REPLY_VALIDATION','STRUCTURED_RE_REPLY_REQUIRED','Long/missed KPI cannot be tracked from attachment reference alone','HIGH',true));
 return fs;
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
  const key='CLUSTER:'+cl.cluster;if(out.some(x=>x.issueKey===key))continue;
  out.push({issueKey:key,kpis:cl.kpis,question:cl.statement,confidence:cl.confidence||'MEDIUM'});
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
function analyzeAll(rows){
 return rows.map(r=>{const findings=analyze(r,rows);return {record:r,direction:direction(r),target:targetState(r),trend:trend(r,rows),findings,managementState:managementState(findings),questions:consolidateQuestions(findings)}})
}
window.HD24_RULE_MATRIX_V1={...API,direction,targetState,trend,sourceIntegrity,actionMechanism,clusterFindings,issueKeyFor,consolidateIssueFollowups,analyze,analyzeAll,consolidateQuestions};
document.dispatchEvent(new CustomEvent('hd24:rule-matrix-ready',{detail:API}));
})();