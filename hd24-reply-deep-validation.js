(()=>{'use strict';
const KEY='hd24_kpi_reply_history_v2', $=id=>document.getElementById(id), norm=s=>String(s||'').toLowerCase().replace(/\s+/g,' ').trim();
const kpiKey=r=>norm(r.kpiEn||r.kpi).replace(/[^a-z0-9가-힣]/g,'');
const samePlant=(a,b)=>{const pa=norm(a?.plant),pb=norm(b?.plant);return !!pa&&!!pb&&pa===pb};
const validSameMonth=(a,b)=>{const ma=Number(a?.targetMonth),mb=Number(b?.targetMonth);return Number.isInteger(ma)&&ma>=1&&ma<=12&&Number.isInteger(mb)&&ma===mb};
const sameKpi=(a,b)=>{const ak=[kpiKey(a),norm(a.kpi),norm(a.kpiEn)].filter(Boolean),bk=[kpiKey(b),norm(b.kpi),norm(b.kpiEn)].filter(Boolean);return ak.some(x=>bk.includes(x))};
function uniqueRiskKpiCount(rows,findings,loop,cons){
 const parent=new Map(),root=k=>{if(!parent.has(k))parent.set(k,k);let p=parent.get(k);if(p!==k){p=root(p);parent.set(k,p)}return p};
 const join=(a,b)=>{const ra=root(a),rb=root(b);if(ra!==rb)parent.set(ra,rb)};
 const alias=r=>[norm(r?.kpiEn),norm(r?.kpi)].filter(Boolean);
 rows.forEach(r=>{const keys=alias(r).map(k=>norm(r.plant)+'|'+k);keys.forEach(k=>root(k));for(let i=1;i<keys.length;i++)join(keys[0],keys[i])});
 const plant=norm(rows[0]?.plant),keys=[...findings.map(x=>norm(x.r?.plant||rows[0]?.plant)+'|'+(alias(x.r)[0]||'')),...loop.map(x=>plant+'|'+norm(x.kpi)),...cons.map(x=>plant+'|'+norm(x.kpi))].filter(k=>!k.endsWith('|'));
 return new Set(keys.map(root)).size;
}
const yearOf=r=>Number(r?.targetYear)||2026, periodOf=r=>yearOf(r)*12+Number(r?.targetMonth||0)-1;
const val=x=>{if(typeof x==='number')return Number.isFinite(x)?x:null;const raw=String(x??'').trim().replace(/,/g,'');const m=raw.match(/[-+]?\d*\.?\d+/);if(!m)return null;const n=Number(m[0]);return Number.isFinite(n)?n:null};
const effectiveUnit=r=>/\brate\b/i.test(String(r?.kpiEn||r?.kpi||''))?'%':r?.unit;
const percentPoints=x=>{const n=val(x);return n===null?null:(Math.abs(n)>0&&Math.abs(n)<1?n*100:n)};
function comparable(actual,target,unit){let a=val(actual),t=val(target);if(a===null||t===null)return null;const u=norm(unit);if(u.includes('%')){if(Math.abs(t)===1&&Math.abs(a)<=2)return[a*100,t*100];if(Math.abs(a)<=1&&Math.abs(t)<=1)return[a*100,t*100];const ratio=(Math.abs(a)<=1&&Math.abs(t)>1)||(Math.abs(t)<=1&&Math.abs(a)>1);if(ratio){if(Math.abs(a)<=1)a*=100;if(Math.abs(t)<=1)t*=100}}return[a,t]};
function dueInfo(r){
 const raw=String(r?.plannedCompletionDate||'').trim(),done=/완료|complete|done/i.test(String(r?.actionStatus||r?.status||r?.completionStatus||''));
 if(!raw)return {kind:'missing',time:null,done};
 // Excel stores dates as serial days from 1899-12-30; never parse them as year strings.
 if(/^\d{5}(?:\.\d+)?$/.test(raw)){const serial=Number(raw),time=Date.UTC(1899,11,30)+serial*86400000;if(serial>=20000&&serial<=100000&&Number.isFinite(time))return {kind:'date',time,done}}
 if(/^(monthly|-|n\/?a)$/i.test(raw))return {kind:'broad',time:null,done};
 const milestones=raw.split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
 const weekRe=/^w[1-5],?\s*[a-z]{3,9}-(?:20)?\d{2}$/i;
 if(milestones.length&&milestones.every(x=>weekRe.test(x)))return {kind:milestones.length>1?'multiweek':'week',time:null,done};
 if(/^(?:w(?:eek)?\s*)?[1-5]\s*[,\/-]?\s*[A-Za-z]{3,9}[-\s,]*20\d{2}$/i.test(raw)||/^w[1-5]\s*[,\/-]?\s*(?:0?[1-9]|1[0-2])[-\/]20\d{2}$/i.test(raw))return {kind:'week',time:null,done};
 const t=Date.parse(raw);return Number.isFinite(t)?{kind:'date',time:t,done}:{kind:'text',time:null,done};
}
function flagsFor(r,all){
 const f=[], reason=norm(r.reason),root=norm(r.rootCause),plan=norm(r.recoveryPlan),status=norm(r.statusTrend);
 const kpi=norm(r.kpiEn||r.kpi),pair=comparable(r.actual,r.target,effectiveUnit(r));
 if(/recent decline/i.test(status)&&pair){const prev=all.filter(x=>samePlant(x,r)&&sameKpi(x,r)&&periodOf(x)===periodOf(r)-1).sort((a,b)=>Number(b.replySequence||0)-Number(a.replySequence||0))[0];if(prev){const prior=comparable(prev.actual,prev.target,effectiveUnit(prev));if(prior&&norm(effectiveUnit(prev))===norm(effectiveUnit(r))&&directionOf(prev)===directionOf(r)&&((directionOf(r)==='HIGHER'&&pair[0]>prior[0])||(directionOf(r)==='LOWER'&&pair[0]<prior[0])))f.push(['MEDIUM','회신의 Recent decline 표기와 전월 실적 개선이 불일치 — 비교 기준 확인 필요']);}}
 if(pair&&/wip compliance/i.test(kpi)&&directionOf(r)==='HIGHER'&&pair[0]<pair[1])f.push(['HIGH','WIP 준수율 목표 미달 '+(pair[1]-pair[0]).toFixed(1)+'%p — 전월 추세와 별개로 목표 미달 원인·회복조치 검증 필요']);
 const orderIntake=/order\s*intake\s*fulfillment/.test(kpi);
 if(orderIntake&&pair&&Math.abs(pair[0]-pair[1])<=1e-6){
  f.push(['MEDIUM','확정오더 이행률 수치상 100% — 추가·취소·수량/납기 변경이 상쇄됐는지 원본 오더 변경이력 및 승인 근거 확인 필요']);
 }
 if(orderIntake&&pair&&Math.abs(pair[0]-pair[1])>1e-6){
  const diff=pair[0]-pair[1];
  f.push(['HIGH','확정오더 이행 편차 '+(diff>0?'+':'')+diff.toFixed(1)+'%p — 추가·취소·수량/납기변경 및 승인 이력 확인 필요 (초과 실적도 정상 달성 아님)']);
 }
 if(achieved(r)===true&&!orderIntake){
  const related=contradictions(all.filter(x=>samePlant(x,r))).filter(x=>yearOf(x)===yearOf(r)&&Number(x.month)===Number(r.targetMonth)&&[norm(x.kpi),norm(x.related)].includes(kpi));
  if(related.length)f.push(['MEDIUM','목표 달성이나 동일 기간 연계 KPI와 정합성 검증 필요 — 정상 운영 확정 보류']);
 }
 if(/find attached|see attached|refer attached/.test(reason))f.push(['HIGH','첨부자료 참조만으로는 원인 검증 불가']);
 if(/same as|last above|as mentioned/.test(reason+' '+root))f.push(['HIGH','타 KPI/이전 항목 참조형 회신 — KPI별 독립 근인 필요']);
 const missingReply=x=>!x||/^(na|n\/a|n\.a\.|not applicable|none|null|-)$/i.test(x);
 if(missingReply(root))f.push(['HIGH','근본원인 미기재/NA — 사유→근인 연결 및 회복조치 적합성 검증 불가']);
 if(missingReply(plan))f.push(['HIGH','회복계획 미기재/NA — 실행대책·완료조건·효과 검증 불가']);
 if(/ongoing|monthly|training|awareness/.test(plan)&&plan.length<90)f.push(['MEDIUM','반복관리/교육 중심 대책 — 완료조건·정량 효과 불명확']);
 if(missingReply(norm(r.actionOwner)))f.push(['HIGH','Action Owner 미지정']); if(missingReply(norm(r.plannedCompletionDate)))f.push(['HIGH','완료예정일 미지정']);
 const owner=norm(r.actionOwner),di=dueInfo(r),due=di.time,received=Date.parse(r.replyReceivedAt||'');
 if(!missingReply(norm(r.plannedCompletionDate))&&(di.kind==='broad'||di.kind==='text'))f.push(['MEDIUM','완료예정일이 구체적 날짜가 아님 — 일정 확정 및 지연 여부 검증 필요']);
 if(di.kind==='multiweek')f.push(['MEDIUM','복수 주차 일정 — 중간조치와 최종완료 기준 구분 필요']);
 if(di.kind==='week')f.push(['MEDIUM','완료예정일이 주차 단위 — 정확한 완료일·담당자 합의 및 지연 여부 확인 필요']);
 if(owner&&!di.done&&di.kind==='date'&&Number.isFinite(due)&&Number.isFinite(received)&&due<received){
  const priorOverdue=all.filter(x=>{if(x===r||!samePlant(x,r)||norm(x.actionOwner)!==owner||periodOf(x)>=periodOf(r))return false;const xi=dueInfo(x),xr=Date.parse(x.replyReceivedAt||'');return !xi.done&&xi.kind==='date'&&Number.isFinite(xi.time)&&Number.isFinite(xr)&&xi.time<xr});
  const distinctPeriods=new Set(priorOverdue.map(periodOf)).size;
  if(distinctPeriods>=2)f.push(['HIGH','동일 담당자 3개 기간 이상 완료기한 초과 반복 — 실행관리 및 부하/책임배분 점검 필요']);
  else if(distinctPeriods>=1)f.push(['MEDIUM','동일 담당자 완료기한 초과 반복 — 조치 일정관리 점검 필요']);
  else f.push(['MEDIUM','완료예정일이 회신 접수시점보다 이전 — 지연조치 상태 확인 필요']);
 }
 const isPercent=norm(effectiveUnit(r)).includes('%'),value=val(r.actual);
 if(isPercent&&value!==null){
  const pct=comparable(r.actual,r.target,effectiveUnit(r))?.[0]??percentPoints(value),history=all.filter(x=>samePlant(x,r)&&sameKpi(x,r)&&periodOf(x)<=periodOf(r)&&norm(effectiveUnit(x)).includes('%')).sort((a,b)=>periodOf(a)-periodOf(b));
  const byPeriod=new Map();
  history.forEach(x=>{const k=periodOf(x),old=byPeriod.get(k);if(!old||Number(x.replySequence||0)>Number(old.replySequence||0)||(Number(x.replySequence||0)===Number(old.replySequence||0)&&String(x.replyReceivedAt||'')>String(old.replyReceivedAt||'')))byPeriod.set(k,x)});
  const uniqueHistory=[...byPeriod.values()].sort((a,b)=>periodOf(a)-periodOf(b));
  const recent=[periodOf(r)-2,periodOf(r)-1,periodOf(r)].map(p=>byPeriod.get(p));
  const series=recent.map(x=>x?(comparable(x.actual,x.target,effectiveUnit(x))?.[0]??percentPoints(x.actual)):null);
  const atCeiling=recent.every(Boolean)&&series.every(x=>x!==null&&Math.abs(x-100)<1e-6);
  const atZero=recent.every(Boolean)&&series.every(x=>x!==null&&Math.abs(x)<1e-6);
  const first100=uniqueHistory.find(x=>{const n=comparable(x.actual,x.target,effectiveUnit(x))?.[0]??percentPoints(x.actual);return n!==null&&Math.abs(n-100)<1e-6});
  const first100Evidence=first100&&uniqueHistory.filter(x=>periodOf(x)>=periodOf(first100)&&periodOf(x)<=periodOf(r));
  const sustainedFromFirst=first100Evidence&&first100Evidence.length>=2&&first100Evidence.length===periodOf(r)-periodOf(first100)+1&&new Set(first100Evidence.map(periodOf)).size===first100Evidence.length&&first100Evidence.every(x=>{const n=comparable(x.actual,x.target,effectiveUnit(x))?.[0]??percentPoints(x.actual);return n!==null&&Math.abs(n-100)<1e-6});
  if(first100&&Number(first100.targetMonth)<=3&&pct!==null&&Math.abs(pct-100)<1e-6&&periodOf(r)>periodOf(first100)&&sustainedFromFirst)
   f.push(['MEDIUM','1분기 내 100% 조기 달성 후 유지 — 목표 도전성·지표 변별력 및 개선 여지 검토 필요']);
  const targetPct=comparable(r.actual,r.target,effectiveUnit(r))?.[1]??percentPoints(r.target);
  if(targetPct!==null&&pct!==null&&directionOf(r)==='HIGHER'&&targetPct>0&&pct-targetPct>=20&&pct<=100)
   f.push(['MEDIUM','목표 대비 실적 '+(pct-targetPct).toFixed(1)+'%p 초과 — 목표 도전성·산출 기준 및 성과 지속성 검증 필요']);
  if(atCeiling)f.push(['MEDIUM','최근 3개 기간 100% 반복 — KPI 포화·변별력·집계 증빙 및 목표 적정성 검증 필요']);
  if(atZero){
   const zeroIsDesired=directionOf(r)==='LOWER';
   if(!zeroIsDesired)f.push(['HIGH','최근 3개 기간 0% 반복 — 실행 미흡·집계 누락·산식/목표 유효성 검증 필요']);
   else f.push(['MEDIUM','최근 3개 기간 0% 반복 — 낮을수록 좋은 KPI이므로 미달로 단정하지 않고 측정 증빙·분모 유효성 확인']);
  }
 }
 const recentMisses=[periodOf(r)-2,periodOf(r)-1,periodOf(r)].map(p=>[...all].filter(x=>samePlant(x,r)&&sameKpi(x,r)&&periodOf(x)===p).sort((a,b)=>Number(b.replySequence||0)-Number(a.replySequence||0)||String(b.replyReceivedAt||'').localeCompare(String(a.replyReceivedAt||'')))[0]);
 if(recentMisses.every(Boolean)&&recentMisses.every(x=>achieved(x)===false)){
  const curPair=comparable(r.actual,r.target,effectiveUnit(r));
  const gap=curPair&&norm(effectiveUnit(r)).includes('%')?Math.abs(curPair[0]-curPair[1]).toFixed(1)+'%p':'';
  f.push(['HIGH','최근 3개월 연속 목표 미달'+(gap?' — 당월 목표 대비 '+gap+' 차이':'')+' (실적 추세 개선 여부와 별개로 회복조치 효과 검증 필요)']);
 }
 const same=all.filter(x=>samePlant(x,r)&&sameKpi(x,r)&&periodOf(x)<periodOf(r));
 const consecutiveCount=field=>{const cur=norm(r[field]);if(!cur)return 0;let count=1,p=periodOf(r)-1;while(true){const prev=same.filter(x=>periodOf(x)===p).sort((a,b)=>Number(b.replySequence||0)-Number(a.replySequence||0)||String(b.replyReceivedAt||'').localeCompare(String(a.replyReceivedAt||'')))[0];if(!prev||norm(prev[field])!==cur)break;count++;p--}return count};
 const reasonRun=consecutiveCount('reason'),rootRun=consecutiveCount('rootCause'),planRun=consecutiveCount('recoveryPlan');
 const substantive=x=>!!x&&!/^(na|n\/a|n\.a\.|not applicable|none|null|-)$/i.test(x);
 if(substantive(reason)&&reasonRun>=3)f.push(['HIGH',reasonRun+'개월 연속 동일 사유 반복 — 원인분석 및 제거대책 재설계 필요']);else if(substantive(reason)&&reasonRun===2)f.push(['MEDIUM','2개월 연속 동일 사유 반복 — 근인 제거 효과 재검증']);
 if(substantive(root)&&rootRun>=3)f.push(['HIGH',rootRun+'개월 연속 동일 근본원인 반복 — 근인 제거 실패 가능성 높음']);else if(substantive(root)&&rootRun===2)f.push(['HIGH','2개월 연속 동일 근본원인 반복']);
 if(substantive(plan)&&planRun>=3){
  const months=[periodOf(r)-2,periodOf(r)-1,periodOf(r)];
  const series=months.map(p=>[...all].filter(x=>samePlant(x,r)&&sameKpi(x,r)&&periodOf(x)===p).sort((a,b)=>Number(b.replySequence||0)-Number(a.replySequence||0)||String(b.replyReceivedAt||'').localeCompare(String(a.replyReceivedAt||'')))[0]);
  const dir=directionOf(r),units=series.map(x=>x?norm(effectiveUnit(x)):''),values=series.map(x=>x?(norm(effectiveUnit(x)).includes('%')?comparable(x.actual,x.target,effectiveUnit(x))?.[0]??null:val(x.actual)):null);
  const comparableSeries=series.every(Boolean)&&units.every(u=>u===units[0])&&series.every(x=>directionOf(x)===dir);
  if(comparableSeries&&values.every(Number.isFinite)&&series.every(x=>norm(x.recoveryPlan)===plan)){
   const bad=(a,b)=>dir==='LOWER'?b>a:b<a;
   if(bad(values[0],values[1])&&bad(values[1],values[2]))f.push(['HIGH','3개월 동일 회복계획에도 실적 연속 악화 ('+values.join(' → ')+') — 대책 실효성 재검토 필요']);
   else if(bad(values[1],values[2])){const netImproved=bad(values[2],values[0]);f.push([netImproved?'MEDIUM':'HIGH','3개월 동일 회복계획 중 최근 실적 전월 대비 후퇴 ('+values.join(' → ')+') — '+(netImproved?'최초 월 대비 개선은 유지, 목표 미달 여부 및 개선 지속성 확인 필요':'최초 월 대비 개선도 미확인, 대책 실효성 검증 필요')]);}
  }
 }
 if(substantive(plan)&&planRun>=3)f.push(['HIGH',planRun+'개월 연속 동일 만회계획 반복 — 기존 대책 효과 미입증, 대책 재설계 필요']);else if(substantive(plan)&&planRun===2)f.push(['MEDIUM','2개월 연속 동일 만회계획 반복 — 실행 효과 확인 필요']);
 return f;
}
function directionOf(r){try{const matrix=window.HD24_RULE_MATRIX_V1||window.HD24RuleMatrix,d=matrix?.direction?.(r);if(d==='LOWER'||d==='HIGHER')return d}catch(_){}const d=norm(r.direction);if(d.includes('하향')||d==='lower'||d==='down')return'LOWER';if(d.includes('상향')||d==='higher'||d==='up')return'HIGHER';const k=norm(r.kpiEn||r.kpi);return /(dio|days inventory|재고회전일수|long.term inventory value|장기재고|ot mh per unit|overtime mh per unit|defect|ppm|complaint|downtime|lead time|recurrence|variation|loss)/.test(k)?'LOWER':'HIGHER'}
function achieved(r){const pair=comparable(r.actual,r.target,effectiveUnit(r));if(!pair)return null;const [a,t]=pair;if(/order\s*intake\s*fulfillment/i.test(String(r.kpiEn||r.kpi||'')))return Math.abs(a-t)<1e-6;return directionOf(r)==='LOWER'?a<=t:a>=t}
function closedLoop(all){
 const out=[],latest=new Map();all.forEach(r=>{const k=norm(r.plant)+'|'+kpiKey(r)+'|'+yearOf(r)+'|'+Number(r.targetMonth),cur=latest.get(k);if(!cur||Number(r.replySequence||0)>Number(cur.replySequence||0)||(Number(r.replySequence||0)===Number(cur.replySequence||0)&&String(r.replyReceivedAt||'')>String(cur.replyReceivedAt||'')))latest.set(k,r)});const ordered=[...latest.values()].sort((a,b)=>Number(a.targetMonth)-Number(b.targetMonth));
 for(const prev of ordered){const pm=Number(prev.targetMonth),next=ordered.find(x=>samePlant(x,prev)&&sameKpi(x,prev)&&periodOf(x)===periodOf(prev)+1);if(!next)continue;
  const nextAch=achieved(next),prevAch=achieved(prev),plan=norm(prev.recoveryPlan),root=norm(prev.rootCause),sameRoot=root&&norm(next.rootCause)===root,samePlan=plan&&norm(next.recoveryPlan)===plan;
  if(prevAch===false&&nextAch===false&&(sameRoot||samePlan))out.push({sev:'HIGH',year:yearOf(next),month:next.targetMonth,kpi:next.kpiEn||next.kpi,msg:'전월 미달 후 차월도 미달이며 '+(sameRoot&&samePlan?'근본원인·대책이 모두 반복':'문제해결 논리가 반복')+' — 기존 대책 효과 미입증'});
  else if(prevAch===false&&nextAch===false)out.push({sev:'MEDIUM',year:yearOf(next),month:next.targetMonth,kpi:next.kpiEn||next.kpi,msg:'전월 미달 후 차월도 미달 — 변경 대책의 실행성과와 추가 근인 확인 필요'});
  if(prev.nextMonthRecoveryTarget!==null&&prev.nextMonthRecoveryTarget!==undefined&&String(prev.nextMonthRecoveryTarget).trim()!==''){const pair=comparable(next.actual,prev.nextMonthRecoveryTarget,effectiveUnit(next)||effectiveUnit(prev));if(pair){const [actual,promised]=pair,met=directionOf(next)==='LOWER'?actual<=promised:actual>=promised;if(!met)out.push({sev:'HIGH',year:yearOf(next),month:next.targetMonth,kpi:next.kpiEn||next.kpi,msg:'전월 회신의 차월 회복목표 미달 — 약속 대비 실제성과 갭 검증 필요'});}}
 }
 return out;
}
function contradictions(all){
 const out=[],n=s=>norm(s).replace(/\s/g,''),names=r=>[r.kpiEn,r.kpi].map(n).filter(Boolean),has=(r,arr)=>names(r).some(v=>arr.some(t=>v.includes(n(t))));
 const qualityAliases=['IQ 200 (Initial Quality)','IQ 200 (Production attributable)','IQ 200 Issues with Production responsibility','생산귀책 조립품질','생산귀책조립품질','Production attributable assembly quality','Production attributable quality'];
 const complianceAliases=['Standard Work Compliance','Production Instruction Compliance Rate','Sequence Compliance','표준작업준수율','표준작업 준수율','Standard Work Adherence','Standardized Work Compliance'];
 const recurrenceAliases=['Issue Recurrence Rate','Non-Compliance Recurrence Rate','Standard Non-compliance Recurrence','표준미준수재발','표준미준수 재발','비표준작업 재발율','비표준작업 재발률','Non-standard Work Recurrence','Nonstandard Work Recurrence'];
 const wipAliases=['WIP','WIP compliance rate (Fabrication)','WIP compliance rate(Assy Line On- Line-Out )','Min/Max compliance rate of input materials by process','Work In Process','Work-in-Process','재공','재공재고','공정재공','공정재고'];
 const leadAliases=['Cutting to Dispatch Lead Time','Lead Time by Production Line (Cutting To Dispatch)'];
 const quality=all.filter(r=>has(r,qualityAliases)),controls=all.filter(r=>has(r,[...complianceAliases,...recurrenceAliases])),wips=all.filter(r=>has(r,wipAliases)),leads=all.filter(r=>has(r,leadAliases));
 for(const q of quality){
  const qBad=achieved(q)===false||/miss|decline|미달|악화/.test(norm(q.statusTrend));if(!qBad)continue;
  for(const c of controls.filter(x=>samePlant(x,q)&&yearOf(x)===yearOf(q)&&validSameMonth(x,q))){
   const isCompliance=has(c,complianceAliases),isRecurrence=has(c,recurrenceAliases),zeroRecurrence=isRecurrence&&c.actual!==null&&c.actual!==undefined&&String(c.actual).trim()!==''&&Number(c.actual)===0;
   if(achieved(c)===true||zeroRecurrence)out.push({sev:'HIGH',year:yearOf(q),month:q.targetMonth,kpi:q.kpiEn||q.kpi,related:c.kpiEn||c.kpi,msg:'생산귀책/초기 품질 결과는 미달·악화인데 '+(isCompliance?'표준작업 준수 관리지표는 정상/목표 달성':zeroRecurrence?'비표준작업 재발지표는 0':'관련 공정관리 지표는 정상/목표 달성')+'입니다. 점검대상·표본·판정기준 및 원인 연결을 교차 검증할 필요'});
  }
 }
 for(const w of wips){
  const wBad=achieved(w)===false||/miss|decline|미달|악화|증가/.test(norm(w.statusTrend));if(!wBad)continue;
  for(const l of leads.filter(x=>samePlant(x,w)&&yearOf(x)===yearOf(w)&&validSameMonth(x,w))){
   if(achieved(l)===true||/improv|shorten|reduc|개선|단축/.test(norm(l.statusTrend)))out.push({sev:'HIGH',year:yearOf(w),month:w.targetMonth,kpi:w.kpiEn||w.kpi,related:l.kpiEn||l.kpi,msg:'WIP/재공은 미달·악화인데 Cutting-to-Dispatch 제조 리드타임은 목표 달성·단축으로 나타납니다. 동일 범위·동일 물동량 기준인지 WIP 정의, Throughput, Lead Time 시작·종료점 및 재공 포함범위를 교차 검증할 필요'});
  }
 }
 const downtimeAliases=['Equipment Downtime Loss'],mtbfAliases=['MTBF'],mttrAliases=['MTTR'],mttdAliases=['MTTD'];
 const samePeriod=(a,b)=>samePlant(a,b)&&yearOf(a)===yearOf(b)&&validSameMonth(a,b),bad=r=>achieved(r)===false,good=r=>achieved(r)===true;
 const pushUnique=x=>{const key=[x.year,x.month,n(x.kpi),n(x.related),x.msg].join('|');if(!out.some(y=>[y.year,y.month,n(y.kpi),n(y.related),y.msg].join('|')===key))out.push(x)};
 const cross=(aa,bb,msg)=>all.filter(r=>has(r,aa)&&bad(r)).forEach(a=>all.filter(b=>b!==a&&samePeriod(a,b)&&has(b,bb)&&good(b)).forEach(b=>pushUnique({sev:'MEDIUM',year:yearOf(a),month:a.targetMonth,kpi:a.kpiEn||a.kpi,related:b.kpiEn||b.kpi,msg})));
 cross(downtimeAliases,mtbfAliases,'Equipment Downtime Loss는 미달인데 MTBF는 정상입니다. 고장빈도와 비가동손실 산정범위를 교차 검증할 필요');
 cross([...mttrAliases,...mttdAliases],downtimeAliases,'MTTR/MTTD는 미달인데 Equipment Downtime Loss는 정상입니다. 고장건수·정지시간·탐지/복구 산식 범위를 확인할 필요');
 return out;
}
async function exportXlsx(rows,cons){
 if(typeof ExcelJS==='undefined')throw Error('ExcelJS unavailable');const wb=new ExcelJS.Workbook(),ws=wb.addWorksheet('Reply Deep Analysis');
 ws.columns=[['Plant',12],['Year',10],['Month',8],['KPI',36],['Unit',10],['Target',12],['Actual',12],['Status/Trend',28],['Severity',12],['Validation Finding',58],['Reason',55],['Root Cause',55],['Recovery Plan',60],['Owner',18],['Due',18]].map(([header,width])=>({header,width}));
 rows.forEach(r=>{const fs=flagsFor(r,rows);if(!fs.length)fs.push(['INFO','특이 검증사항 없음 — 차기 실적 효과 확인']);fs.forEach(([sev,msg])=>ws.addRow([r.plant,yearOf(r),r.targetMonth,r.kpiEn||r.kpi,effectiveUnit(r)||'',effectiveUnit(r)==='%'?percentPoints(r.target):r.target,effectiveUnit(r)==='%'?percentPoints(r.actual):r.actual,r.statusTrend,sev,msg,r.reason,r.rootCause,r.recoveryPlan,r.actionOwner,r.plannedCompletionDate]))});
 const cs=wb.addWorksheet('Cross KPI Validation');cs.columns=[{header:'Year',width:10},{header:'Month',width:10},{header:'Outcome KPI',width:38},{header:'Related Control KPI',width:40},{header:'Logical Validation',width:80}];cons.forEach(x=>cs.addRow([Number(x.year)||2026,x.month,x.kpi,x.related,x.msg]));
 const ls=wb.addWorksheet('Closed Loop Validation');ls.columns=[{header:'Severity',width:12},{header:'Year',width:10},{header:'Month',width:10},{header:'KPI',width:42},{header:'Closed-Loop Finding',width:90}];closedLoop(rows).forEach(x=>ls.addRow([x.sev,Number(x.year)||2026,x.month,x.kpi,x.msg]));
 [ws,cs,ls].forEach(s=>{s.views=[{state:'frozen',ySplit:1}];s.getRow(1).font={bold:true};s.autoFilter={from:'A1',to:s.getRow(1).getCell(s.columnCount).address}});
 const buf=await wb.xlsx.writeBuffer(),a=document.createElement('a');a.href=URL.createObjectURL(new Blob([buf],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}));a.download='HDPS_KPI_Reply_Deep_Analysis_'+new Date().toISOString().slice(0,10)+'.xlsx';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);
}
function drillRows(kind,rows,findings,loop,cons){
 const mapFinding=x=>({plant:x.r.plant,year:yearOf(x.r),month:x.r.targetMonth,kpi:x.r.kpiEn||x.r.kpi,related:'',sev:x.sev,type:'심층 검증',msg:x.msg,reason:x.r.reason||'',root:x.r.rootCause||'',plan:x.r.recoveryPlan||'',owner:x.r.actionOwner||'',due:x.r.plannedCompletionDate||'',seq:x.r.replySequence||''});
 const mapLoop=x=>({plant:rows.find(r=>yearOf(r)===Number(x.year)&&Number(r.targetMonth)===Number(x.month)&&sameKpi(r,{kpiEn:x.kpi,kpi:x.kpi}))?.plant||'',year:Number(x.year)||2026,month:x.month,kpi:x.kpi,related:x.related||'',sev:x.sev,type:'대책 효과검증 미흡',msg:x.msg,reason:'',root:'',plan:'',owner:'',due:'',seq:''});
 const mapCons=x=>({plant:rows.find(r=>yearOf(r)===Number(x.year)&&Number(r.targetMonth)===Number(x.month)&&norm(r.kpiEn||r.kpi)===norm(x.kpi))?.plant||'',year:Number(x.year)||2026,month:x.month,kpi:x.kpi,related:x.related||'',sev:x.sev||'HIGH',type:'KPI 간 모순',msg:x.msg,reason:'',root:'',plan:'',owner:'',due:'',seq:''});
 const all=[...findings.map(mapFinding),...loop.map(mapLoop),...cons.map(mapCons)];
 if(kind==='all')return all;if(kind==='high')return all.filter(x=>x.sev==='HIGH');if(kind==='medium')return all.filter(x=>x.sev==='MEDIUM');if(kind==='contradiction')return cons.map(mapCons);if(kind==='loop')return loop.map(mapLoop);
 const phrase={reason:'동일 사유 반복',root:'동일 근본원인 반복',plan:'동일 만회계획 반복'}[kind];return findings.filter(x=>x.msg.includes(phrase)).map(mapFinding);
}
function showDrill(kind,title,rows,findings,loop,cons){
 const data=drillRows(kind,rows,findings,loop,cons);let modal=$('hd24DeepDrillModal');if(!modal){modal=document.createElement('div');modal.id='hd24DeepDrillModal';document.body.append(modal)}
 modal.style.cssText='position:fixed;inset:0;z-index:99999;background:rgba(15,31,48,.48);display:flex;align-items:center;justify-content:center;padding:28px';
 modal.innerHTML='<div style="width:min(1500px,96vw);max-height:90vh;background:#fff;border-radius:14px;box-shadow:0 20px 60px rgba(0,0,0,.28);display:flex;flex-direction:column;overflow:hidden"><div style="padding:16px 20px;border-bottom:1px solid #d9e2eb;display:flex;justify-content:space-between;align-items:center"><div><b style="font-size:19px;color:#17324d">'+title+' 상세그리드</b><span style="margin-left:10px;color:#66788a">'+data.length+'건</span></div><button id="hd24DeepDrillClose" type="button">닫기</button></div><div style="padding:12px 16px;overflow:auto"><table style="border-collapse:collapse;width:100%;min-width:1350px;font-size:12px"><thead><tr>'+['사업장','연도·월','KPI','관련 KPI','등급','탐지유형','상세 사유','미달성 사유','근본원인','대책','담당자','완료예정일','회신차수'].map(x=>'<th style="position:sticky;top:0;background:#eef3f8;border:1px solid #cbd6e2;padding:8px;text-align:left">'+x+'</th>').join('')+'</tr></thead><tbody>'+(data.length?data.map(x=>'<tr>'+[x.plant,x.year+'-'+String(x.month).padStart(2,'0'),x.kpi,x.related,x.sev,x.type,x.msg,x.reason,x.root,x.plan,x.owner,x.due,x.seq].map(v=>'<td style="border:1px solid #dbe3eb;padding:7px;vertical-align:top;max-width:300px;white-space:normal">'+esc(v??'')+'</td>').join('')+'</tr>').join(''):'<tr><td colspan="13" style="padding:28px;text-align:center">해당 조건의 상세 데이터가 없습니다.</td></tr>')+'</tbody></table></div></div>';
 $('hd24DeepDrillClose').onclick=()=>modal.style.display='none';modal.onclick=e=>{if(e.target===modal)modal.style.display='none'};
}
function latestReplyRows(rows){
 const parent=new Map();
 const root=k=>{if(!parent.has(k))parent.set(k,k);const p=parent.get(k);if(p!==k)parent.set(k,root(p));return parent.get(k)};
 const join=(a,b)=>{const ra=root(a),rb=root(b);if(ra!==rb)parent.set(ra,rb)};
 const aliases=r=>[r.kpiEn,r.kpi].map(x=>norm(x).replace(/[^a-z0-9가-힣]/g,'')).filter(Boolean).map(k=>norm(r.plant)+'|'+k);
 rows.forEach(r=>{const keys=aliases(r);keys.forEach(root);for(let i=1;i<keys.length;i++)join(keys[0],keys[i])});
 const latest=new Map();
 rows.forEach((r,i)=>{
  const keys=aliases(r),identity=keys.length?root(keys[0]):'unnamed|'+i;
  const key=[norm(r.plant),yearOf(r),Number(r.targetMonth),identity].join('|');
  const previous=latest.get(key),seq=Number(r.replySequence||0),oldSeq=Number(previous?.r.replySequence||0),received=String(r.replyReceivedAt||''),oldReceived=String(previous?.r.replyReceivedAt||'');
  if(!previous||seq>oldSeq||(seq===oldSeq&&received>=oldReceived))latest.set(key,{r,i});
 });
 return [...latest.values()].sort((a,b)=>a.i-b.i).map(x=>x.r);
}
function render(){
 if(!$('hd24Feedback')){try{window.hd24ReplyFeedback?.render?.()}catch(_){}}
 const host=$('hd24Feedback');if(!host)return false;let rows=[];try{rows=JSON.parse(localStorage.getItem(KEY)||'[]').filter(r=>r.plant===($('plantSelect')?.value||'india'))}catch{};if(!rows.length){const stale=$('hd24DeepValidation');if(stale)stale.remove();return true;}
 rows=latestReplyRows(rows);
 const cons=contradictions(rows), loop=closedLoop(rows), findings=rows.flatMap(r=>flagsFor(r,rows).map(x=>({r,sev:x[0],msg:x[1]}))), high=findings.filter(x=>x.sev==='HIGH').length+loop.filter(x=>x.sev==='HIGH').length+cons.filter(x=>(x.sev||'HIGH')==='HIGH').length, medium=findings.filter(x=>x.sev==='MEDIUM').length+loop.filter(x=>x.sev==='MEDIUM').length+cons.filter(x=>x.sev==='MEDIUM').length, repeatedReason=findings.filter(x=>x.msg.includes('동일 사유 반복')).length, repeatedRoot=findings.filter(x=>x.msg.includes('동일 근본원인 반복')).length, repeatedPlan=findings.filter(x=>x.msg.includes('동일 만회계획 반복')).length, totalWarnings=findings.length+loop.length+cons.length, riskKpis=uniqueRiskKpiCount(rows,findings,loop,cons);
 let box=$('hd24DeepValidation');if(!box){box=document.createElement('section');box.id='hd24DeepValidation';host.prepend(box)}
 box.innerHTML='<h3>실적 × 회신 심층 검증</h3><p>달성 여부와 별개로 전월→당월 동일 KPI 반복, 회신 품질, 조치 효과, KPI 간 논리 정합성을 검증합니다.</p><div class="hd24-summary-grid"><div class="hd24-kpi-mini hd24-drill" data-drill="all"><span>전체 검증이슈</span><b>'+totalWarnings+'</b></div><div class="hd24-kpi-mini"><span>Unique Risk KPIs</span><b>'+riskKpis+'</b></div><div class="hd24-kpi-mini hd24-drill" data-drill="high"><span>HIGH</span><b>'+high+'</b></div><div class="hd24-kpi-mini hd24-drill" data-drill="medium"><span>MEDIUM</span><b>'+medium+'</b></div><div class="hd24-kpi-mini hd24-drill" data-drill="contradiction"><span>KPI 간 모순</span><b>'+cons.length+'</b></div><div class="hd24-kpi-mini hd24-drill" data-drill="loop"><span>대책 효과검증 미흡</span><b>'+loop.length+'</b></div></div><div class="hd24-summary-grid" style="margin-top:8px"><div class="hd24-kpi-mini hd24-drill" data-drill="reason"><span>전월 동일 사유</span><b>'+repeatedReason+'</b></div><div class="hd24-kpi-mini hd24-drill" data-drill="root"><span>전월 동일 근인</span><b>'+repeatedRoot+'</b></div><div class="hd24-kpi-mini hd24-drill" data-drill="plan"><span>전월 동일 대책</span><b>'+repeatedPlan+'</b></div></div><div style="margin:14px 0 16px;padding:14px 16px;border:1px solid #d7e0e9;border-radius:10px;background:#f8fafc"><b style="color:#17324d">판정 범례 · 집계 기준</b><div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px 18px;margin-top:10px;font-size:13px;line-height:1.55;color:#455b70"><div><b>HIGH</b> · 근본원인/실행책임/회복약속 등 핵심 관리조건이 누락되거나 반복 실패하여 우선 확인이 필요한 이슈</div><div><b>MEDIUM</b> · 즉시 중대 오류는 아니나 원인·대책의 구체성 또는 실행효과 확인이 추가로 필요한 이슈</div><div><b>대책 효과검증 미흡</b> · 전월 미달/회신 이후 차월 실적에서도 개선이 확인되지 않거나 약속한 회복목표가 달성되지 않아 PDCA가 닫히지 않은 건</div><div><b>KPI 간 모순</b> · 서로 연관된 KPI의 실적·회신 논리가 동시에 성립하기 어려워 교차 확인이 필요한 건</div><div><b>전월 동일 사유</b> · 동일 KPI에서 전월과 같은 미달 사유가 연속 반복된 건</div><div><b>전월 동일 근인</b> · 동일 KPI에서 같은 근본원인이 반복되어 근인 제거 효과를 재검증해야 하는 건</div><div><b>전월 동일 대책</b> · 동일 KPI에서 같은 만회계획이 반복되어 기존 대책의 실행·효과 확인이 필요한 건</div><div><b>전체 검증이슈</b> · HIGH/MEDIUM 심층검증 + 폐루프 + KPI 교차검증에서 탐지된 전체 경고 건수</div></div><div style="margin-top:9px;font-size:12px;color:#6b7d8f">※ HIGH/MEDIUM은 KPI 달성·미달 자체의 등급이 아니라 <b>회신 및 문제해결 관리상 검증 우선순위</b>입니다.</div></div><details id="hd24DeepDetailBox" style="margin:10px 0;border:1px solid #d8e0e8;border-radius:9px;background:#fbfdff"><summary style="cursor:pointer;padding:11px 13px;font-weight:800;color:#17324d">검증이슈 상세목록 펼쳐보기 · 필요 시에만 확인</summary><div id="hd24DeepList" style="height:280px;max-height:36vh;overflow:auto;overscroll-behavior:contain;padding:6px 12px;border-top:1px solid #eef2f6"></div></details><button type="button" id="hd24ExportDeepAnalysis">심층 분석 Excel 추출</button>';
 box.querySelectorAll('.hd24-drill').forEach(card=>{card.style.cursor='pointer';card.title='클릭하여 상세그리드 보기';card.onclick=()=>showDrill(card.dataset.drill,card.querySelector('span')?.textContent||'검증이슈',rows,findings,loop,cons)});
 const list=$('hd24DeepList');findings.forEach(x=>{const p=document.createElement('p');p.textContent=x.sev+' · '+yearOf(x.r)+'-'+String(x.r.targetMonth).padStart(2,'0')+' · '+(x.r.kpiEn||x.r.kpi)+' — '+x.msg;list.append(p)});loop.forEach(x=>{const p=document.createElement('p');p.textContent=x.sev+' · ACTION EFFECTIVENESS GAP · '+(Number(x.year)||2026)+'-'+String(x.month).padStart(2,'0')+' · '+x.kpi+' — '+x.msg;list.append(p)});cons.forEach(x=>{const p=document.createElement('p');p.textContent='CROSS · '+(Number(x.year)||2026)+'-'+String(x.month).padStart(2,'0')+' · '+x.kpi+' ↔ '+x.related+' — '+x.msg;list.append(p)});
 $('hd24ExportDeepAnalysis').onclick=()=>exportXlsx(rows,cons).catch(e=>alert(e.message));
 return true;
}
let renderTimer=0,hostRetryTimer=0,lastRenderSig='',hostRetryCount=0;
function renderScheduled(delay=0){clearTimeout(renderTimer);clearTimeout(hostRetryTimer);hostRetryTimer=0;renderTimer=setTimeout(()=>{renderTimer=0;const plant=$('plantSelect')?.value||'india',raw=localStorage.getItem(KEY)||'[]',sig=plant+'|'+raw;if(sig===lastRenderSig&&$('hd24DeepValidation')?.isConnected)return;try{if(render()!==false){hostRetryCount=0;lastRenderSig=sig;document.dispatchEvent(new CustomEvent('hd24:deep-validation-rendered'))}else{lastRenderSig='';if(++hostRetryCount<=5)hostRetryTimer=setTimeout(()=>{hostRetryTimer=0;renderScheduled(150)},150);else console.warn('HD24 deep validation host unavailable after 5 retries')}}catch(error){console.error('HD24 deep validation render failed',error);lastRenderSig='';}},delay)}
document.addEventListener('DOMContentLoaded',()=>renderScheduled(120),{once:true});document.addEventListener('hd24:reply-feedback-ready',()=>{hostRetryCount=0;renderScheduled(40)});document.addEventListener('hd24:reply-imported',()=>{hostRetryCount=0;renderScheduled(120)});document.addEventListener('change',e=>{if(e.target?.id==='plantSelect'){lastRenderSig='';hostRetryCount=0;renderScheduled(80)}});
window.hd24DeepReplyValidation={render,renderScheduled,flagsFor,contradictions,closedLoop,drillRows,detailRows:input=>{const rows=latestReplyRows(Array.isArray(input)?input:[]);const findings=rows.flatMap(r=>flagsFor(r,rows).map(x=>({r,sev:x[0],msg:x[1]})));return drillRows('all',rows,findings,closedLoop(rows),contradictions(rows))}};
renderScheduled(40);
document.dispatchEvent(new CustomEvent('hd24:deep-validation-ready'));
})();