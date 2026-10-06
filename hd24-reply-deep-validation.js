(()=>{'use strict';
const KEY='hd24_kpi_reply_history_v2', $=id=>document.getElementById(id), norm=s=>String(s||'').toLowerCase().replace(/\s+/g,' ').trim();
const kpiKey=r=>norm(r.kpiEn||r.kpi).replace(/[^a-z0-9가-힣]/g,'');
const sameKpi=(a,b)=>{const ak=[kpiKey(a),norm(a.kpi),norm(a.kpiEn)].filter(Boolean),bk=[kpiKey(b),norm(b.kpi),norm(b.kpiEn)].filter(Boolean);return ak.some(x=>bk.includes(x))};
const yearOf=r=>Number(r?.targetYear)||2026, periodOf=r=>yearOf(r)*12+Number(r?.targetMonth||0)-1;
const val=x=>{if(typeof x==='number')return Number.isFinite(x)?x:null;const raw=String(x??'').trim().replace(/,/g,'');const m=raw.match(/[-+]?\d*\.?\d+/);if(!m)return null;const n=Number(m[0]);return Number.isFinite(n)?n:null};
function comparable(actual,target,unit){let a=val(actual),t=val(target);if(a===null||t===null)return null;const u=norm(unit);if(u.includes('%')){const ratio=(Math.abs(a)<=1&&Math.abs(t)>1)||(Math.abs(t)<=1&&Math.abs(a)>1);if(ratio){if(Math.abs(a)<=1)a*=100;if(Math.abs(t)<=1)t*=100}}return[a,t]};
function flagsFor(r,all){
 const f=[], reason=norm(r.reason),root=norm(r.rootCause),plan=norm(r.recoveryPlan),status=norm(r.statusTrend);
 if(/find attached|see attached|refer attached/.test(reason))f.push(['HIGH','첨부자료 참조만으로는 원인 검증 불가']);
 if(/same as|last above|as mentioned/.test(reason+' '+root))f.push(['HIGH','타 KPI/이전 항목 참조형 회신 — KPI별 독립 근인 필요']);
 if(/^(na|n\/a|not applicable)$/.test(root))f.push(['MEDIUM','근본원인 NA — 사유→근인 연결 검증 불가']);
 if(/ongoing|monthly|training|awareness/.test(plan)&&plan.length<90)f.push(['MEDIUM','반복관리/교육 중심 대책 — 완료조건·정량 효과 불명확']);
 if(!r.actionOwner)f.push(['HIGH','Action Owner 미지정']); if(!r.plannedCompletionDate)f.push(['HIGH','완료예정일 미지정']);
 const owner=norm(r.actionOwner),due=Date.parse(r.plannedCompletionDate||''),received=Date.parse(r.replyReceivedAt||'');
 if(owner&&Number.isFinite(due)&&Number.isFinite(received)&&due<received){
  const priorOverdue=all.filter(x=>x!==r&&norm(x.actionOwner)===owner&&periodOf(x)<periodOf(r)&&Number.isFinite(Date.parse(x.plannedCompletionDate||''))&&Number.isFinite(Date.parse(x.replyReceivedAt||''))&&Date.parse(x.plannedCompletionDate)<Date.parse(x.replyReceivedAt));
  const distinctPeriods=new Set(priorOverdue.map(periodOf)).size;
  if(distinctPeriods>=2)f.push(['HIGH','동일 담당자 3개 기간 이상 완료기한 초과 반복 — 실행관리 및 부하/책임배분 점검 필요']);
  else if(distinctPeriods>=1)f.push(['MEDIUM','동일 담당자 완료기한 초과 반복 — 조치 일정관리 점검 필요']);
  else f.push(['MEDIUM','완료예정일이 회신 접수시점보다 이전 — 지연조치 상태 확인 필요']);
 }
 const same=all.filter(x=>sameKpi(x,r)&&periodOf(x)<periodOf(r));
 const consecutiveCount=field=>{const cur=norm(r[field]);if(!cur)return 0;let count=1,p=periodOf(r)-1;while(true){const prev=same.filter(x=>periodOf(x)===p).sort((a,b)=>Number(b.replySequence||0)-Number(a.replySequence||0))[0];if(!prev||norm(prev[field])!==cur)break;count++;p--}return count};
 const reasonRun=consecutiveCount('reason'),rootRun=consecutiveCount('rootCause'),planRun=consecutiveCount('recoveryPlan');
 if(reasonRun>=3)f.push(['HIGH',reasonRun+'개월 연속 동일 사유 반복 — 원인분석 및 제거대책 재설계 필요']);else if(reasonRun===2)f.push(['MEDIUM','2개월 연속 동일 사유 반복 — 근인 제거 효과 재검증']);
 if(rootRun>=3)f.push(['HIGH',rootRun+'개월 연속 동일 근본원인 반복 — 근인 제거 실패 가능성 높음']);else if(rootRun===2)f.push(['HIGH','2개월 연속 동일 근본원인 반복']);
 if(planRun>=3)f.push(['HIGH',planRun+'개월 연속 동일 만회계획 반복 — 기존 대책 효과 미입증, 대책 재설계 필요']);else if(planRun===2)f.push(['MEDIUM','2개월 연속 동일 만회계획 반복 — 실행 효과 확인 필요']);
 return f;
}
function directionOf(r){try{const matrix=window.HD24_RULE_MATRIX_V1||window.HD24RuleMatrix,d=matrix?.direction?.(r);if(d==='LOWER'||d==='HIGHER')return d}catch(_){}const d=norm(r.direction);if(d.includes('하향')||d==='lower'||d==='down')return'LOWER';if(d.includes('상향')||d==='higher'||d==='up')return'HIGHER';const k=norm(r.kpiEn||r.kpi);return /(dio|days inventory|재고회전일수|defect|ppm|complaint|downtime|lead time|recurrence|variation|loss)/.test(k)?'LOWER':'HIGHER'}
function achieved(r){const pair=comparable(r.actual,r.target,r.unit);if(!pair)return null;const [a,t]=pair;return directionOf(r)==='LOWER'?a<=t:a>=t}
function closedLoop(all){
 const out=[],latest=new Map();all.forEach(r=>{const k=kpiKey(r)+'|'+yearOf(r)+'|'+Number(r.targetMonth),cur=latest.get(k);if(!cur||Number(r.replySequence||0)>Number(cur.replySequence||0)||String(r.replyReceivedAt||'')>String(cur.replyReceivedAt||''))latest.set(k,r)});const ordered=[...latest.values()].sort((a,b)=>Number(a.targetMonth)-Number(b.targetMonth));
 for(const prev of ordered){const pm=Number(prev.targetMonth),next=ordered.find(x=>sameKpi(x,prev)&&periodOf(x)===periodOf(prev)+1);if(!next)continue;
  const nextAch=achieved(next),prevAch=achieved(prev),plan=norm(prev.recoveryPlan),root=norm(prev.rootCause),sameRoot=root&&norm(next.rootCause)===root,samePlan=plan&&norm(next.recoveryPlan)===plan;
  if(prevAch===false&&nextAch===false&&(sameRoot||samePlan))out.push({sev:'HIGH',year:yearOf(next),month:next.targetMonth,kpi:next.kpiEn||next.kpi,msg:'전월 미달 후 차월도 미달이며 '+(sameRoot&&samePlan?'근본원인·대책이 모두 반복':'문제해결 논리가 반복')+' — 기존 대책 효과 미입증'});
  else if(prevAch===false&&nextAch===false)out.push({sev:'MEDIUM',year:yearOf(next),month:next.targetMonth,kpi:next.kpiEn||next.kpi,msg:'전월 미달 후 차월도 미달 — 변경 대책의 실행성과와 추가 근인 확인 필요'});
  if(prev.nextMonthRecoveryTarget){const pair=comparable(next.actual,prev.nextMonthRecoveryTarget,next.unit||prev.unit);if(pair){const [actual,promised]=pair,met=directionOf(next)==='LOWER'?actual<=promised:actual>=promised;if(!met)out.push({sev:'HIGH',year:yearOf(next),month:next.targetMonth,kpi:next.kpiEn||next.kpi,msg:'전월 회신의 차월 회복목표 미달 — 약속 대비 실제성과 갭 검증 필요'});}}
 }
 return out;
}
function contradictions(all){
 const out=[],n=s=>norm(s).replace(/\s/g,''),names=r=>[r.kpiEn,r.kpi].map(n).filter(Boolean),has=(r,arr)=>names(r).some(v=>arr.some(t=>v.includes(n(t))));
 const qualityAliases=['IQ 200 (Initial Quality)','IQ 200 (Production attributable)','Basic Quality','Assembly Quality','생산귀책 조립품질','생산귀책조립품질','조립품질','생산귀책 품질','Production attributable assembly quality','Production attributable quality'];
 const complianceAliases=['Standard Work Compliance','표준작업준수율','표준작업 준수율','Standard Work Adherence','Standardized Work Compliance'];
 const recurrenceAliases=['Standard Non-compliance Recurrence','표준미준수재발','표준미준수 재발','비표준작업 재발율','비표준작업 재발률','비표준 작업 재발율','비표준 작업 재발률','Non-standard Work Recurrence','Nonstandard Work Recurrence'];
 const wipAliases=['WIP','Work In Process','Work-in-Process','재공','재공재고','공정재공','공정재고'];
 const leadAliases=['Manufacturing Lead Time','Manufacturing Lead Time Reduction','제조리드타임','제조 리드타임','생산리드타임','생산 리드타임','MFG Lead Time'];
 const quality=all.filter(r=>has(r,qualityAliases)),controls=all.filter(r=>has(r,[...complianceAliases,...recurrenceAliases])),wips=all.filter(r=>has(r,wipAliases)),leads=all.filter(r=>has(r,leadAliases));
 for(const q of quality){
  const qAch=achieved(q),qBad=qAch===false||/miss|decline|미달|악화/.test(norm(q.statusTrend));if(!qBad)continue;
  for(const c of controls.filter(x=>yearOf(x)===yearOf(q)&&Number(x.targetMonth)===Number(q.targetMonth))){
   const controlAch=achieved(c),isCompliance=has(c,complianceAliases),isRecurrence=has(c,recurrenceAliases),zeroRecurrence=isRecurrence&&Number(c.actual)===0;
   if(controlAch===true||zeroRecurrence)out.push({sev:'HIGH',year:yearOf(q),month:q.targetMonth,kpi:q.kpiEn||q.kpi,related:c.kpiEn||c.kpi,msg:'생산귀책/조립 품질 결과는 미달·악화인데 '+(isCompliance?'표준작업 준수 관리지표는 정상/목표 달성':zeroRecurrence?'비표준작업 재발지표는 0':'관련 공정관리 지표는 정상/목표 달성')+'입니다. 결과 품질과 공정관리 지표가 동시에 성립하는지 점검대상·표본·판정기준 및 원인 연결을 교차 검증할 필요'});
  }
 }
 for(const w of wips){
  const wAch=achieved(w),wBad=wAch===false||/miss|decline|미달|악화|증가/.test(norm(w.statusTrend));if(!wBad)continue;
  for(const l of leads.filter(x=>yearOf(x)===yearOf(w)&&Number(x.targetMonth)===Number(w.targetMonth))){
   const lAch=achieved(l),leadImproved=lAch===true||/improv|shorten|reduc|개선|단축/.test(norm(l.statusTrend));
   if(leadImproved)out.push({sev:'HIGH',year:yearOf(w),month:w.targetMonth,kpi:w.kpiEn||w.kpi,related:l.kpiEn||l.kpi,msg:'WIP/재공은 미달·악화인데 제조 리드타임은 목표 달성·단축으로 나타납니다. 동일 범위·동일 물동량 기준이라면 논리 정합성 확인이 필요하므로 WIP 정의, Throughput 산정범위, Lead Time 시작·종료점 및 재공 포함범위를 교차 검증할 필요'});
  }
 }
 return out;
}
async function exportXlsx(rows,cons){
 if(typeof ExcelJS==='undefined')throw Error('ExcelJS unavailable');const wb=new ExcelJS.Workbook(),ws=wb.addWorksheet('Reply Deep Analysis');
 ws.columns=[['Plant',12],['Year',10],['Month',8],['KPI',36],['Target',12],['Actual',12],['Status/Trend',28],['Severity',12],['Validation Finding',58],['Reason',55],['Root Cause',55],['Recovery Plan',60],['Owner',18],['Due',18]].map(([header,width])=>({header,width}));
 rows.forEach(r=>{const fs=flagsFor(r,rows);if(!fs.length)fs.push(['INFO','특이 검증사항 없음 — 차기 실적 효과 확인']);fs.forEach(([sev,msg])=>ws.addRow([r.plant,yearOf(r),r.targetMonth,r.kpiEn||r.kpi,r.target,r.actual,r.statusTrend,sev,msg,r.reason,r.rootCause,r.recoveryPlan,r.actionOwner,r.plannedCompletionDate]))});
 const cs=wb.addWorksheet('Cross KPI Validation');cs.columns=[{header:'Year',width:10},{header:'Month',width:10},{header:'Outcome KPI',width:38},{header:'Related Control KPI',width:40},{header:'Logical Validation',width:80}];cons.forEach(x=>cs.addRow([Number(x.year)||2026,x.month,x.kpi,x.related,x.msg]));
 const ls=wb.addWorksheet('Closed Loop Validation');ls.columns=[{header:'Severity',width:12},{header:'Year',width:10},{header:'Month',width:10},{header:'KPI',width:42},{header:'Closed-Loop Finding',width:90}];closedLoop(rows).forEach(x=>ls.addRow([x.sev,Number(x.year)||2026,x.month,x.kpi,x.msg]));
 [ws,cs,ls].forEach(s=>{s.views=[{state:'frozen',ySplit:1}];s.getRow(1).font={bold:true};s.autoFilter={from:'A1',to:s.getRow(1).getCell(s.columnCount).address}});
 const buf=await wb.xlsx.writeBuffer(),a=document.createElement('a');a.href=URL.createObjectURL(new Blob([buf],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}));a.download='HDPS_KPI_Reply_Deep_Analysis_'+new Date().toISOString().slice(0,10)+'.xlsx';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);
}
function render(){
 if(!$('hd24Feedback')){try{window.hd24ReplyFeedback?.render?.()}catch(_){}}
 const host=$('hd24Feedback');if(!host)return;let rows=[];try{rows=JSON.parse(localStorage.getItem(KEY)||'[]').filter(r=>r.plant===($('plantSelect')?.value||'india'))}catch{};if(!rows.length)return;
 const cons=contradictions(rows), loop=closedLoop(rows), findings=rows.flatMap(r=>flagsFor(r,rows).map(x=>({r,sev:x[0],msg:x[1]}))), high=findings.filter(x=>x.sev==='HIGH').length+loop.filter(x=>x.sev==='HIGH').length+cons.length, medium=findings.filter(x=>x.sev==='MEDIUM').length+loop.filter(x=>x.sev==='MEDIUM').length, repeatedReason=findings.filter(x=>x.msg.includes('동일 사유 반복')).length, repeatedRoot=findings.filter(x=>x.msg.includes('동일 근본원인 반복')).length, repeatedPlan=findings.filter(x=>x.msg.includes('동일 만회계획 반복')).length, totalWarnings=findings.length+loop.length+cons.length;
 let box=$('hd24DeepValidation');if(!box){box=document.createElement('section');box.id='hd24DeepValidation';host.prepend(box)}
 box.innerHTML='<h3>실적 × 회신 심층 검증</h3><p>달성 여부와 별개로 전월→당월 동일 KPI 반복, 회신 품질, 조치 효과, KPI 간 논리 정합성을 검증합니다.</p><div class="hd24-summary-grid"><div class="hd24-kpi-mini"><span>전체 검증이슈</span><b>'+totalWarnings+'</b></div><div class="hd24-kpi-mini"><span>HIGH</span><b>'+high+'</b></div><div class="hd24-kpi-mini"><span>MEDIUM</span><b>'+medium+'</b></div><div class="hd24-kpi-mini"><span>KPI 간 모순</span><b>'+cons.length+'</b></div><div class="hd24-kpi-mini"><span>폐루프 경고</span><b>'+loop.length+'</b></div></div><div class="hd24-summary-grid" style="margin-top:8px"><div class="hd24-kpi-mini"><span>전월 동일 사유</span><b>'+repeatedReason+'</b></div><div class="hd24-kpi-mini"><span>전월 동일 근인</span><b>'+repeatedRoot+'</b></div><div class="hd24-kpi-mini"><span>전월 동일 대책</span><b>'+repeatedPlan+'</b></div></div><div style="margin:14px 0 16px;padding:14px 16px;border:1px solid #d7e0e9;border-radius:10px;background:#f8fafc"><b style="color:#17324d">판정 범례 · 집계 기준</b><div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px 18px;margin-top:10px;font-size:13px;line-height:1.55;color:#455b70"><div><b>HIGH</b> · 근본원인/실행책임/회복약속 등 핵심 관리조건이 누락되거나 반복 실패하여 우선 확인이 필요한 이슈</div><div><b>MEDIUM</b> · 즉시 중대 오류는 아니나 원인·대책의 구체성 또는 실행효과 확인이 추가로 필요한 이슈</div><div><b>폐루프 경고</b> · 전월 미달/회신 이후 차월 실적에서도 개선이 확인되지 않거나 약속한 회복목표가 달성되지 않아 PDCA가 닫히지 않은 건</div><div><b>KPI 간 모순</b> · 서로 연관된 KPI의 실적·회신 논리가 동시에 성립하기 어려워 교차 확인이 필요한 건</div><div><b>전월 동일 사유</b> · 동일 KPI에서 전월과 같은 미달 사유가 연속 반복된 건</div><div><b>전월 동일 근인</b> · 동일 KPI에서 같은 근본원인이 반복되어 근인 제거 효과를 재검증해야 하는 건</div><div><b>전월 동일 대책</b> · 동일 KPI에서 같은 만회계획이 반복되어 기존 대책의 실행·효과 확인이 필요한 건</div><div><b>전체 검증이슈</b> · HIGH/MEDIUM 심층검증 + 폐루프 + KPI 교차검증에서 탐지된 전체 경고 건수</div></div><div style="margin-top:9px;font-size:12px;color:#6b7d8f">※ HIGH/MEDIUM은 KPI 달성·미달 자체의 등급이 아니라 <b>회신 및 문제해결 관리상 검증 우선순위</b>입니다.</div></div><div id="hd24DeepList"></div><button type="button" id="hd24ExportDeepAnalysis">심층 분석 Excel 추출</button>';
 const list=$('hd24DeepList');findings.forEach(x=>{const p=document.createElement('p');p.textContent=x.sev+' · '+yearOf(x.r)+'-'+String(x.r.targetMonth).padStart(2,'0')+' · '+(x.r.kpiEn||x.r.kpi)+' — '+x.msg;list.append(p)});loop.forEach(x=>{const p=document.createElement('p');p.textContent=x.sev+' · CLOSED LOOP · '+(Number(x.year)||2026)+'-'+String(x.month).padStart(2,'0')+' · '+x.kpi+' — '+x.msg;list.append(p)});cons.forEach(x=>{const p=document.createElement('p');p.textContent='CROSS · '+(Number(x.year)||2026)+'-'+String(x.month).padStart(2,'0')+' · '+x.kpi+' ↔ '+x.related+' — '+x.msg;list.append(p)});
 $('hd24ExportDeepAnalysis').onclick=()=>exportXlsx(rows,cons).catch(e=>alert(e.message));
}
document.addEventListener('DOMContentLoaded',()=>setTimeout(render,1000));document.addEventListener('hd24:reply-feedback-ready',()=>setTimeout(render,0));document.addEventListener('hd24:reply-imported',()=>setTimeout(render,100));document.addEventListener('change',e=>{if(e.target?.id==='plantSelect')setTimeout(render,100)});
window.hd24DeepReplyValidation={render,flagsFor,contradictions,closedLoop};
})();