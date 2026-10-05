(()=>{'use strict';
const KEY='hd24_kpi_reply_history_v2', $=id=>document.getElementById(id), norm=s=>String(s||'').toLowerCase().replace(/\s+/g,' ').trim();
const val=x=>{const n=Number(String(x??'').replace(/%/g,''));return Number.isFinite(n)?n:null};
function flagsFor(r,all){
 const f=[], reason=norm(r.reason),root=norm(r.rootCause),plan=norm(r.recoveryPlan),status=norm(r.statusTrend);
 if(/find attached|see attached|refer attached/.test(reason))f.push(['HIGH','첨부자료 참조만으로는 원인 검증 불가']);
 if(/same as|last above|as mentioned/.test(reason+' '+root))f.push(['HIGH','타 KPI/이전 항목 참조형 회신 — KPI별 독립 근인 필요']);
 if(/^(na|n\/a|not applicable)$/.test(root))f.push(['MEDIUM','근본원인 NA — 사유→근인 연결 검증 불가']);
 if(/ongoing|monthly|training|awareness/.test(plan)&&plan.length<90)f.push(['MEDIUM','반복관리/교육 중심 대책 — 완료조건·정량 효과 불명확']);
 if(!r.actionOwner)f.push(['HIGH','Action Owner 미지정']); if(!r.plannedCompletionDate)f.push(['HIGH','완료예정일 미지정']);
 const same=all.filter(x=>norm(x.kpiEn||x.kpi)===norm(r.kpiEn||r.kpi)&&Number(x.targetMonth)<Number(r.targetMonth));
 if(same.some(x=>norm(x.reason)===reason&&reason))f.push(['HIGH','이전 월과 동일 사유 반복 — 근인 제거 효과 재검증']);
 if(same.some(x=>norm(x.rootCause)===root&&root))f.push(['HIGH','이전 월과 동일 근본원인 반복']);
 if(same.some(x=>norm(x.recoveryPlan)===plan&&plan))f.push(['MEDIUM','이전 월과 동일 만회계획 반복 — 실행 효과 확인 필요']);
 return f;
}
function directionOf(r){const d=norm(r.direction);if(d.includes('하향')||d==='lower'||d==='down')return'LOWER';if(d.includes('상향')||d==='higher'||d==='up')return'HIGHER';const k=norm(r.kpiEn||r.kpi);return /(dio|days inventory|재고회전일수|defect|ppm|complaint|downtime|lead time)/.test(k)?'LOWER':'HIGHER'}
function achieved(r){const a=val(r.actual),t=val(r.target);if(a===null||t===null)return null;return directionOf(r)==='LOWER'?a<=t:a>=t}
function closedLoop(all){
 const out=[],latest=new Map();all.forEach(r=>{const k=norm(r.kpiEn||r.kpi)+'|'+Number(r.targetMonth),cur=latest.get(k);if(!cur||Number(r.replySequence||0)>Number(cur.replySequence||0)||String(r.replyReceivedAt||'')>String(cur.replyReceivedAt||''))latest.set(k,r)});const ordered=[...latest.values()].sort((a,b)=>Number(a.targetMonth)-Number(b.targetMonth));
 for(const prev of ordered){const pm=Number(prev.targetMonth),next=ordered.find(x=>norm(x.kpiEn||x.kpi)===norm(prev.kpiEn||prev.kpi)&&Number(x.targetMonth)===pm+1);if(!next)continue;
  const nextAch=achieved(next),prevAch=achieved(prev),plan=norm(prev.recoveryPlan),root=norm(prev.rootCause),sameRoot=root&&norm(next.rootCause)===root,samePlan=plan&&norm(next.recoveryPlan)===plan;
  if(prevAch===false&&nextAch===false&&(sameRoot||samePlan))out.push({sev:'HIGH',month:next.targetMonth,kpi:next.kpiEn||next.kpi,msg:'전월 미달 후 차월도 미달이며 '+(sameRoot&&samePlan?'근본원인·대책이 모두 반복':'문제해결 논리가 반복')+' — 기존 대책 효과 미입증'});
  else if(prevAch===false&&nextAch===false)out.push({sev:'MEDIUM',month:next.targetMonth,kpi:next.kpiEn||next.kpi,msg:'전월 미달 후 차월도 미달 — 변경 대책의 실행성과와 추가 근인 확인 필요'});
  if(prev.nextMonthRecoveryTarget){const promised=val(prev.nextMonthRecoveryTarget),actual=val(next.actual);if(promised!==null&&actual!==null){const met=directionOf(next)==='LOWER'?actual<=promised:actual>=promised;if(!met)out.push({sev:'HIGH',month:next.targetMonth,kpi:next.kpiEn||next.kpi,msg:'전월 회신의 차월 회복목표 미달 — 약속 대비 실제성과 갭 검증 필요'});}}
 }
 return out;
}
function contradictions(all){
 const out=[], n=s=>norm(s).replace(/\s/g,''), has=(r,arr)=>arr.some(t=>n(r.kpiEn||r.kpi).includes(n(t)));
 const quality=all.filter(r=>has(r,['IQ 200 (Initial Quality)','IQ 200 (Production attributable)','Basic Quality','Assembly Quality']));
 const controls=all.filter(r=>has(r,['Standard Work Compliance','표준작업준수율','Standard Non-compliance Recurrence','표준미준수재발']));
 for(const q of quality){const qBad=/miss|decline|미달|악화/.test(norm(q.statusTrend));if(!qBad)continue;for(const s of controls.filter(x=>Number(x.targetMonth)===Number(q.targetMonth))){const a=val(s.actual);if(a===0||a===100||a===1)out.push({month:q.targetMonth,kpi:q.kpiEn||q.kpi,related:s.kpiEn||s.kpi,msg:'품질 결과는 네거티브하나 표준작업 관리지표는 완전 달성. 준수점검 기준·표본·판정방식의 유효성 재검증 필요'});}}
 return out;
}
async function exportXlsx(rows,cons){
 if(typeof ExcelJS==='undefined')throw Error('ExcelJS unavailable');const wb=new ExcelJS.Workbook(),ws=wb.addWorksheet('Reply Deep Analysis');
 ws.columns=[['Plant',12],['Month',8],['KPI',36],['Target',12],['Actual',12],['Status/Trend',28],['Severity',12],['Validation Finding',58],['Reason',55],['Root Cause',55],['Recovery Plan',60],['Owner',18],['Due',18]].map(([header,width])=>({header,width}));
 rows.forEach(r=>{const fs=flagsFor(r,rows);if(!fs.length)fs.push(['INFO','특이 검증사항 없음 — 차기 실적 효과 확인']);fs.forEach(([sev,msg])=>ws.addRow([r.plant,r.targetMonth,r.kpiEn||r.kpi,r.target,r.actual,r.statusTrend,sev,msg,r.reason,r.rootCause,r.recoveryPlan,r.actionOwner,r.plannedCompletionDate]))});
 const cs=wb.addWorksheet('Cross KPI Validation');cs.columns=[{header:'Month',width:10},{header:'Outcome KPI',width:38},{header:'Related Control KPI',width:40},{header:'Logical Validation',width:80}];cons.forEach(x=>cs.addRow([x.month,x.kpi,x.related,x.msg]));
 [ws,cs].forEach(s=>{s.views=[{state:'frozen',ySplit:1}];s.getRow(1).font={bold:true};s.autoFilter={from:'A1',to:s.getRow(1).getCell(s.columnCount).address}});
 const buf=await wb.xlsx.writeBuffer(),a=document.createElement('a');a.href=URL.createObjectURL(new Blob([buf],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}));a.download='HDPS_KPI_Reply_Deep_Analysis_'+new Date().toISOString().slice(0,10)+'.xlsx';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);
}
function render(){
 if(!$('hd24Feedback')){try{window.hd24ReplyFeedback?.render?.()}catch(_){}}
 const host=$('hd24Feedback');if(!host)return;let rows=[];try{rows=JSON.parse(localStorage.getItem(KEY)||'[]').filter(r=>r.plant===($('plantSelect')?.value||'india'))}catch{};if(!rows.length)return;
 const cons=contradictions(rows), loop=closedLoop(rows), findings=rows.flatMap(r=>flagsFor(r,rows).map(x=>({r,sev:x[0],msg:x[1]}))), high=findings.filter(x=>x.sev==='HIGH').length+loop.filter(x=>x.sev==='HIGH').length, medium=findings.filter(x=>x.sev==='MEDIUM').length+loop.filter(x=>x.sev==='MEDIUM').length, repeatedReason=findings.filter(x=>x.msg.includes('동일 사유 반복')).length, repeatedRoot=findings.filter(x=>x.msg.includes('동일 근본원인 반복')).length, repeatedPlan=findings.filter(x=>x.msg.includes('동일 만회계획 반복')).length;
 let box=$('hd24DeepValidation');if(!box){box=document.createElement('section');box.id='hd24DeepValidation';host.prepend(box)}
 box.innerHTML='<h3>실적 × 회신 심층 검증</h3><p>달성 여부와 별개로 전월→당월 동일 KPI 반복, 회신 품질, 조치 효과, KPI 간 논리 정합성을 검증합니다.</p><div class="hd24-summary-grid"><div class="hd24-kpi-mini"><span>검증 경고</span><b>'+findings.length+'</b></div><div class="hd24-kpi-mini"><span>HIGH</span><b>'+high+'</b></div><div class="hd24-kpi-mini"><span>MEDIUM</span><b>'+medium+'</b></div><div class="hd24-kpi-mini"><span>KPI 간 모순</span><b>'+cons.length+'</b></div><div class="hd24-kpi-mini"><span>폐루프 경고</span><b>'+loop.length+'</b></div></div><div class="hd24-summary-grid" style="margin-top:8px"><div class="hd24-kpi-mini"><span>전월 동일 사유</span><b>'+repeatedReason+'</b></div><div class="hd24-kpi-mini"><span>전월 동일 근인</span><b>'+repeatedRoot+'</b></div><div class="hd24-kpi-mini"><span>전월 동일 대책</span><b>'+repeatedPlan+'</b></div></div><div id="hd24DeepList"></div><button type="button" id="hd24ExportDeepAnalysis">심층 분석 Excel 추출</button>';
 const list=$('hd24DeepList');findings.slice(0,30).forEach(x=>{const p=document.createElement('p');p.textContent=x.sev+' · '+x.r.targetMonth+'M · '+(x.r.kpiEn||x.r.kpi)+' — '+x.msg;list.append(p)});loop.forEach(x=>{const p=document.createElement('p');p.textContent=x.sev+' · CLOSED LOOP · '+x.month+'M · '+x.kpi+' — '+x.msg;list.append(p)});cons.forEach(x=>{const p=document.createElement('p');p.textContent='CROSS · '+x.month+'M · '+x.kpi+' ↔ '+x.related+' — '+x.msg;list.append(p)});
 $('hd24ExportDeepAnalysis').onclick=()=>exportXlsx(rows,cons).catch(e=>alert(e.message));
}
document.addEventListener('DOMContentLoaded',()=>setTimeout(render,1000));document.addEventListener('hd24:reply-feedback-ready',()=>setTimeout(render,0));document.addEventListener('hd24:reply-imported',()=>setTimeout(render,100));document.addEventListener('change',e=>{if(e.target?.id==='plantSelect')setTimeout(render,100)});
window.hd24DeepReplyValidation={render};
})();