(()=>{'use strict';
const KEY='hd24_kpi_reply_history_v2',get=id=>document.getElementById(id);
let lang='ko',drafts={ko:'',en:''},draftKey='',demo=false;
const fields=[['reason','미달성 사유','Reason'],['rootCause','근본원인','Root cause'],['recoveryPlan','만회계획','Recovery plan'],['actionOwner','담당자','Action owner'],['plannedCompletionDate','완료예정일','Due date'],['nextMonthRecoveryTarget','차월 회복목표','Next-month target']];
const txt=v=>String(v??'').trim(), esc=s=>txt(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function analyze(r){
 const missing=fields.filter(([k])=>!txt(r[k]));
 const reason=txt(r.reason),root=txt(r.rootCause),plan=txt(r.recoveryPlan),owner=txt(r.actionOwner),due=txt(r.plannedCompletionDate),target=txt(r.nextMonthRecoveryTarget);
 const flags=[];
 if(!reason)flags.push(['원인 설명 없음','No reason for miss/deterioration']);
 if(!root)flags.push(['근본원인 미기재','Root cause is missing']);
 if(!plan)flags.push(['만회계획 미기재','Recovery plan is missing']);
 if(!owner)flags.push(['담당자 미지정','Action owner is not assigned']);
 if(!due)flags.push(['완료예정일 미지정','Due date is not specified']);
 if(!target)flags.push(['차월 회복목표 미기재','Next-month recovery target is missing']);
 if(reason&&root&&reason.toLowerCase()===root.toLowerCase())flags.push(['현상/사유와 근본원인이 동일 문구입니다. 근인 분석의 구체화가 필요','Reason and root cause are identical; please clarify the underlying cause']);
 if(plan&&plan.length<12)flags.push(['만회계획이 매우 짧아 실행방법·완료조건 확인 필요','Recovery plan is too brief; clarify execution method and completion criteria']);
 if(root&&root.length<8)flags.push(['근본원인 설명이 짧아 발생 메커니즘/근거 확인 필요','Root-cause description is brief; clarify mechanism and evidence']);
 const complete=fields.length-missing.length,score=Math.round(complete/fields.length*100);
 const level=score===100&&flags.length===0?'충분':score>=67?'보완 필요':'중점 보완';
 return {missing,flags,score,level,reason,root,plan,owner,due,target};
}
function render(){
 const panel=get('hd24ReplyPanel');if(!panel)return;let box=get('hd24Feedback');if(!box){box=document.createElement('section');box.id='hd24Feedback';panel.append(box)}
 const plant=get('plantSelect')?.value||'india';let all=[];try{all=JSON.parse(localStorage.getItem(KEY)||'[]').filter(x=>x.plant===plant)}catch{}
 all.sort((a,b)=>String(b.replyReceivedAt||'').localeCompare(String(a.replyReceivedAt||'')));
 const groups={};all.forEach(r=>{const k=String(r.targetMonth)+'|'+txt(r.kpiEn||r.kpi).toLowerCase();(groups[k]||(groups[k]=[])).push(r)});
 let rows=Object.values(groups).map(a=>a[0]);
 const nextKey=plant+'|'+rows.map(r=>[r.targetMonth,r.kpiEn||r.kpi,r.replyReceivedAt,r.replySequence].join(':')).join('|');
 if(nextKey!==draftKey){draftKey=nextKey;drafts={ko:'',en:''};if(rows.length)demo=false}
 if(!rows.length&&!demo){box.innerHTML='<h3>회신 상세 분석 및 피드백</h3><div style="padding:22px;border:1px dashed #a9b9ce;border-radius:10px;background:#f7faff;margin:12px 0"><strong>등록된 회신이 없습니다.</strong><p>회신 Excel을 등록하면 KPI별 사유·근본원인·만회계획·담당자·완료일·차월목표를 구조적으로 분석하고 이전 회신과 비교합니다.</p><button type="button" id="hd24DemoPreview">샘플 분석 미리보기 (저장·발송 안 함)</button></div>';get('hd24DemoPreview').onclick=()=>{demo=true;render()};return}
 if(!rows.length&&demo){rows=[{plant,targetMonth:7,kpiEn:'Sample KPI (DEMO)',reason:'Production delay',rootCause:'',recoveryPlan:'Improve process',actionOwner:'',plannedCompletionDate:'',nextMonthRecoveryTarget:''}];groups['7|sample kpi (demo)']=rows}
 const analyses=rows.map(r=>({r,a:analyze(r),history:(groups[String(r.targetMonth)+'|'+txt(r.kpiEn||r.kpi).toLowerCase()]||[])}));
 const stats={total:analyses.length,complete:analyses.filter(x=>x.a.score===100).length,attention:analyses.filter(x=>x.a.score<67).length,history:analyses.filter(x=>x.history.length>1).length};
 const ko=['담당자님,','','KPI 회신 내용을 검토한 결과입니다. 아래 KPI별 확인사항과 보완 요청을 검토하여 회신해 주시기 바랍니다.',''];
 const en=['Dear Team,','','We reviewed your KPI response. Please review the KPI-specific findings and provide the requested clarifications and updates below.',''];
 analyses.forEach(({r,a,history})=>{
  const title=r.targetMonth+'M / '+(r.kpiEn||r.kpi);ko.push(title);en.push(title);
  ko.push(' - 회신 검토: '+a.level+' (필수정보 '+a.score+'%)');en.push(' - Review status: '+(a.level==='충분'?'Sufficient':a.level==='보완 필요'?'Needs clarification':'Priority clarification')+' (required information '+a.score+'%)');
  if(a.reason){ko.push(' - 미달성 사유: '+a.reason);en.push(' - Reason: '+a.reason)}
  if(a.root){ko.push(' - 근본원인: '+a.root);en.push(' - Root cause: '+a.root)}
  if(a.plan){ko.push(' - 만회계획: '+a.plan);en.push(' - Recovery plan: '+a.plan)}
  if(a.owner||a.due){ko.push(' - 실행책임/기한: '+(a.owner||'미지정')+' / '+(a.due||'미지정'));en.push(' - Owner / due date: '+(a.owner||'Not assigned')+' / '+(a.due||'Not specified'))}
  if(a.target){ko.push(' - 차월 회복목표: '+a.target);en.push(' - Next-month recovery target: '+a.target)}
  a.flags.forEach(f=>{ko.push(' - 확인 요청: '+f[0]);en.push(' - Clarification requested: '+f[1])});
  if(history.length>1){const prev=history[1],changed=[];fields.forEach(([k,kr,enLabel])=>{if(txt(r[k])!==txt(prev[k]))changed.push([kr,enLabel])});ko.push(' - 이전 회신 대비: '+(changed.length?changed.map(x=>x[0]).join(', ')+' 변경':'주요 회신 내용 변경 없음'));en.push(' - Versus previous reply: '+(changed.length?changed.map(x=>x[1]).join(', ')+' updated':'No material response-field change'))}
  ko.push('');en.push('');
 });
 ko.push('보완 내용과 현재 조치 현황을 회신해 주시기 바랍니다.','','감사합니다.','서지철 드림');en.push('Please reply with the clarifications above and the current action status.','','Best Regards,','Mr.Seoh');
 if(!drafts.ko)drafts.ko=ko.join('\n');if(!drafts.en)drafts.en=en.join('\n');
 const subject=(lang==='ko'?'[HDPS KPI] 회신 상세 검토 및 후속조치 요청 - ':'[HDPS KPI] Detailed Reply Review and Follow-up - ')+(plant==='india'?'India':'Brazil');
 box.innerHTML='<h3>회신 상세 분석 및 피드백</h3>'+(demo?'<p style="color:#a45300;font-weight:bold">샘플 분석 · 실제 회신 이력과 무관하며 저장·발송되지 않습니다.</p>':'')+
 '<div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin:12px 0"><div class="hd24-kpi-mini"><span>분석 KPI</span><b>'+stats.total+'</b></div><div class="hd24-kpi-mini"><span>필수정보 100%</span><b>'+stats.complete+'</b></div><div class="hd24-kpi-mini"><span>중점 보완</span><b>'+stats.attention+'</b></div><div class="hd24-kpi-mini"><span>이전 회신 비교</span><b>'+stats.history+'</b></div></div>'+
 '<div id="hd24FeedbackFindings"></div><h4>해외사업장 피드백 메일 초안</h4><div style="display:flex;gap:8px;margin:12px 0"><button type="button" id="hd24FeedbackKo">한글 · 영문 발송내용 검토</button><button type="button" id="hd24FeedbackEn">English · 해외 발송</button></div><label>메일 제목</label><input id="hd24FeedbackSubject" style="width:100%;padding:10px;margin:6px 0 12px"><label>메일 본문 (수정 가능)</label><textarea id="hd24FeedbackDraft" rows="18" style="width:100%;padding:14px"></textarea><div style="margin-top:12px"><button id="hd24FeedbackCopy" type="button">현재 언어 메일 복사</button></div><p>한글은 해외 발송용 영문 메일의 검토용 번역입니다. 실제 발송은 영문을 사용합니다.</p>';
 const findings=get('hd24FeedbackFindings');
 analyses.forEach(({r,a,history})=>{const d=document.createElement('details');d.open=a.score<100||a.flags.length>0;d.style.cssText='margin:9px 0;border:1px solid #dbe6f3;border-radius:9px;background:#fff';const s=document.createElement('summary');s.style.cssText='cursor:pointer;padding:12px 14px;font-weight:800';s.textContent=r.targetMonth+'M / '+(r.kpiEn||r.kpi)+' · '+a.level+' · 필수정보 '+a.score+'%'+(history.length>1?' · 회신 '+history.length+'차':'');d.append(s);const body=document.createElement('div');body.style.cssText='padding:0 14px 14px;line-height:1.65';const vals=[['미달성 사유',a.reason],['근본원인',a.root],['만회계획',a.plan],['담당자',a.owner],['완료예정일',a.due],['차월 회복목표',a.target]];body.innerHTML=vals.map(x=>'<div><b>'+x[0]+'</b> · '+esc(x[1]||'미기재')+'</div>').join('')+(a.flags.length?'<div style="margin-top:8px"><b>검토 포인트</b><ul>'+a.flags.map(x=>'<li>'+esc(x[0])+'</li>').join('')+'</ul></div>':'<div style="margin-top:8px"><b>검토 포인트</b> · 필수 항목 기재 확인. 차기 실적에서 개선효과 검증 필요</div>');d.append(body);findings.append(d)});
 get('hd24FeedbackSubject').value=subject;get('hd24FeedbackDraft').value=drafts[lang];get('hd24FeedbackDraft').oninput=e=>drafts[lang]=e.target.value;
 get('hd24FeedbackKo').onclick=()=>{drafts[lang]=get('hd24FeedbackDraft').value;lang='ko';render()};get('hd24FeedbackEn').onclick=()=>{drafts[lang]=get('hd24FeedbackDraft').value;lang='en';render()};
 get(lang==='ko'?'hd24FeedbackKo':'hd24FeedbackEn').style.cssText='background:#1d4e7d;color:#fff';
 get('hd24FeedbackCopy').disabled=demo;get('hd24FeedbackCopy').onclick=()=>navigator.clipboard.writeText(get('hd24FeedbackSubject').value+'\n\n'+get('hd24FeedbackDraft').value);
}
document.addEventListener('DOMContentLoaded',()=>{setTimeout(render,700);document.addEventListener('hd24:reply-imported',()=>setTimeout(render,50));document.addEventListener('change',e=>{if(e.target?.id==='plantSelect'||e.target?.id==='hd24ReplyFile')setTimeout(render,1200)});document.addEventListener('click',e=>{if(e.target?.id==='hd24ImportReply')setTimeout(render,1200)})});
window.hd24ReplyFeedback={render};
})();