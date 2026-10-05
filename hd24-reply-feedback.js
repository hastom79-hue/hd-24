(()=>{'use strict';
const KEY='hd24_kpi_reply_history_v2',get=id=>document.getElementById(id);
let lang='ko',drafts={ko:'',en:''},draftKey='',demo=false,lastExportKey='',latestFeedbackAttachment=null;const SEND_LOG='hd24_reply_feedback_mail_v1';
const fields=[['reason','미달성 사유','Reason'],['rootCause','근본원인','Root cause'],['recoveryPlan','만회계획','Recovery plan'],['actionOwner','담당자','Action owner'],['plannedCompletionDate','완료예정일','Due date'],['nextMonthRecoveryTarget','차월 회복목표','Next-month target']];
const txt=v=>String(v??'').trim(), esc=s=>txt(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const kpiKey=r=>txt(r?.kpiEn||r?.kpi).toLowerCase();
const sameKpi=(a,b)=>{const keys=r=>[txt(r?.kpiEn).toLowerCase(),txt(r?.kpi).toLowerCase()].filter(Boolean);const A=keys(a),B=keys(b);return A.some(x=>B.includes(x))};
const phraseNorm=v=>txt(v).toLowerCase().replace(/[^a-z0-9가-힣]+/g,' ').replace(/\s+/g,' ').trim();
function phraseSimilarity(a,b){a=phraseNorm(a);b=phraseNorm(b);if(!a||!b)return 0;if(a===b||a.includes(b)||b.includes(a))return 1;const A=new Set(a.split(' ').filter(x=>x.length>1)),B=new Set(b.split(' ').filter(x=>x.length>1));if(!A.size||!B.size)return 0;let hit=0;A.forEach(x=>B.has(x)&&hit++);return hit/Math.max(1,Math.min(A.size,B.size))}
const materiallySame=(a,b)=>phraseSimilarity(a,b)>=0.6;
const replyOrder=(a,b)=>{const sa=Number(a?.replySequence)||0,sb=Number(b?.replySequence)||0;if(sa!==sb)return sb-sa;return String(b?.replyReceivedAt||'').localeCompare(String(a?.replyReceivedAt||''))};
const previousReply=(history,current)=>history.filter(x=>x!==current).sort(replyOrder)[0]||null;
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
 if(plan&&!owner)flags.push(['만회계획은 있으나 실행 담당자가 없어 책임주체 지정 필요','Recovery plan exists but no action owner is assigned']);
 if(plan&&!due)flags.push(['만회계획은 있으나 완료예정일이 없어 실행기한 지정 필요','Recovery plan exists but no completion date is assigned']);
 if(plan&&!target)flags.push(['만회계획은 있으나 차월 회복목표가 없어 효과검증 기준 필요','Recovery plan exists but no next-month recovery target is defined']);
 if(root&&plan&&root.length>7&&plan.toLowerCase().includes(root.toLowerCase()))flags.push(['근본원인을 만회계획에 반복 기재했습니다. 원인 제거를 위한 구체적 실행조치 확인 필요','Recovery plan repeats the root cause; specify the concrete action that removes the cause']);
 const complete=fields.length-missing.length,score=Math.round(complete/fields.length*100);
 const level=score===100&&flags.length===0?'충분':score>=67?'보완 필요':'중점 보완';
 return {missing,flags,score,level,reason,root,plan,owner,due,target};
}

function analysisResultFor(r,a,history=[]){
 const k=txt(r.kpiEn||r.kpi)||'KPI',parts=[];
 parts.push(`${k}: response completeness ${a.score}%`);
 if(!a.reason)parts.push('miss/deterioration reason is not explained');
 if(!a.root)parts.push('verified root cause is absent'); else if(a.root.length<8)parts.push('root cause is stated but mechanism/evidence is insufficient'); else parts.push('root cause is documented');
 if(!a.plan)parts.push('recovery action is absent'); else if(a.plan.length<12)parts.push('recovery action exists but execution method/completion criteria are insufficient'); else parts.push('recovery action is documented');
 if(!a.owner)parts.push('accountable owner is not assigned'); else parts.push(`owner: ${a.owner}`);
 if(!a.due)parts.push('committed completion date is absent'); else parts.push(`due: ${a.due}`);
 if(!a.target)parts.push('next-month recovery target is absent, so action effectiveness cannot be quantitatively verified'); else parts.push(`next-month recovery target: ${a.target}`);
 if(a.reason&&a.root&&a.reason.toLowerCase()===a.root.toLowerCase())parts.push('reason and root cause use the same statement, so causal depth is insufficient');
 const prior=previousReply(history,r),prev=prior?analyze(prior):null;
 if(prev&&a.root&&prev.root&&materiallySame(a.root,prev.root))parts.push('same root cause recurs from the previous reply');
 if(prev&&a.plan&&prev.plan&&materiallySame(a.plan,prev.plan))parts.push('recovery action is unchanged from the previous reply; progress/effect evidence is required');
 const due=a.due?new Date(a.due):null;if(due&&!isNaN(due)&&due<new Date()&&!/완료|complete|done/i.test(a.plan||''))parts.push('planned completion date has passed without clear completion evidence');
 return parts.join('. ')+'.';
}

function reviewGapFor(r,a,history=[]){
 const gaps=[];
 if(!a.reason)gaps.push('회고분석 미흡: KPI 미달/악화 결과에 대한 사실기반 원인 회고가 없음');
 if(!a.root)gaps.push('근인분석 미흡: 현상에서 근본원인까지의 인과관계가 정의되지 않음');
 else if(a.reason&&a.reason.toLowerCase()===a.root.toLowerCase())gaps.push('근인분석 오류: 현상/미달사유를 근본원인으로 반복 기재함');
 if(!a.plan)gaps.push('대책수립 미흡: 확인된 근인을 제거하는 Recovery Action이 없음');
 else if(a.plan.length<12)gaps.push('대책수립 구체성 부족: 실행방법·완료조건·검증방법이 불명확함');
 if(!a.owner||!a.due)gaps.push('실행관리 미흡: 대책의 책임자 또는 완료기한이 없어 추적관리가 어려움');
 if(!a.target)gaps.push('지표 연계관계 미흡: 활동→회복판단→KPI 결과의 연결기준이 불명확함. 단, 모든 활동에 별도 수치자료를 요구하기보다 기존 KPI 또는 확인 가능한 완료조건을 우선 활용');
 else if(!a.plan)gaps.push('지표-활동 연계 미흡: 회복목표는 있으나 이를 달성할 실행대책이 연결되지 않음');
 const prior=previousReply(history,r),prev=prior?analyze(prior):null;
 if(prev&&a.root&&prev.root&&materiallySame(a.root,prev.root))gaps.push('재발방지 미흡: 이전 회신과 동일 근인이 반복되었으나 재발방지 관점의 추가 분석이 없음');
 if(prev&&a.plan&&prev.plan&&materiallySame(a.plan,prev.plan))gaps.push('활동결과 회고 미흡: 이전과 동일 대책을 유지하면서 진척·효과·실패원인에 대한 회고가 없음');
 const due=a.due?new Date(a.due):null;if(due&&!isNaN(due)&&due<new Date()&&!/완료|complete|done/i.test(a.plan||''))gaps.push('기한관리 미흡: 완료예정일이 경과했으나 완료근거 또는 지연원인/재계획이 없음');
 return gaps.length?gaps.join(' | '):'주요 관리요소(회고분석·근인·대책·책임/기한·차월목표)가 연결되어 있음. 차월 실적으로 대책 효과를 검증할 것';
}

function finalRequestFor(r,a,history=[]){
 const req=[];
 if(!a.root||a.root.length<8)req.push('근본원인 판단근거 보완(추가 자료 제출 자체보다 현상→원인의 논리와 확인근거 중심)');
 if(!a.plan||a.plan.length<12)req.push('근인 제거 대책의 실행방법·완료조건·효과확인 방법 보완(필요 최소한의 근거만 제시)');
 if(!a.owner)req.push('Action Owner 지정');
 if(!a.due)req.push('완료예정일 확정');
 if(!a.target)req.push('차월 회복의 판단기준을 제시(정량 KPI가 적합하면 수치목표, 그렇지 않으면 확인 가능한 정성 기준/완료조건)');
 const prior=previousReply(history,r),prev=prior?analyze(prior):null;
 if(prev&&a.root&&prev.root&&materiallySame(a.root,prev.root))req.push('반복 근인에 대한 재발방지 대책 및 추가 근인분석 제출');
 if(prev&&a.plan&&prev.plan&&materiallySame(a.plan,prev.plan))req.push('기존 대책의 진척·효과·미흡원인 회고 및 변경/추가조치 제출');
 const due=a.due?new Date(a.due):null;if(due&&!isNaN(due)&&due<new Date()&&!/완료|complete|done/i.test(a.plan||''))req.push('기한초과 사유, 현재 진척률 및 재설정 완료일 회신');
 return req.length?req.map((x,i)=>`${i+1}. ${x}`).join(' / '):'추가 필수 보완사항 없음. 차월 KPI 실적으로 Recovery Action 효과를 확인하고 결과를 회신';
}

function feedbackFor(r,a,history=[]){
 const k=txt(r.kpiEn||r.kpi)||'KPI', out=[];
 if(!a.root)out.push(`${k}: Identify the verified root cause with evidence, not only the symptom or result.`);
 if(a.root&&a.root.length<8)out.push(`${k}: Expand the root cause to explain the failure mechanism and supporting evidence.`);
 if(!a.plan)out.push(`${k}: Define a concrete recovery action linked directly to the verified root cause.`);
 else if(a.plan.length<12)out.push(`${k}: Specify the recovery action, execution method and completion criteria in measurable terms.`);
 if(!a.owner)out.push(`${k}: Assign one accountable action owner for the recovery action.`);
 if(!a.due)out.push(`${k}: Set a committed completion date for the recovery action.`);
 if(!a.target)out.push(`${k}: Define a practical recovery criterion linked to the KPI result. Use a numeric target where meaningful; otherwise use a clear observable completion/effect criterion without creating unnecessary reporting data.`);
 if(a.reason&&a.root&&a.reason.toLowerCase()===a.root.toLowerCase())out.push(`${k}: Separate the observed reason/symptom from the underlying root cause and explain why the issue occurred.`);
 if(a.root&&a.plan&&a.plan.toLowerCase().includes(a.root.toLowerCase()))out.push(`${k}: Replace the repeated cause statement with a specific cause-removal action and verification method.`);
 return out.length?out.join(' '):`${k}: Response structure is complete. Confirm execution evidence and verify whether the next KPI result achieves the stated recovery target.`;
}

async function exportFeedbackWorkbook(rows,plant){
 if(typeof ExcelJS==='undefined'||!rows.length)return;
 const wb=new ExcelJS.Workbook(),ws=wb.addWorksheet('Reply Feedback');
 const headers=['Plant','Target Month','KPI','Reason for Miss / Deterioration','Root Cause','Recovery / Catch-up Plan','Action Owner','Planned Completion Date','Next-Month Recovery Target','HDPS Analysis Result','What Was Wrong / Management Review Gap','HDPS Feedback / Required Follow-up','Final Additional Request / Points to Supplement'];
 ws.columns=headers.map((h,i)=>({header:h,key:'c'+i,width:[14,14,34,34,34,38,20,22,24,48,62,58,58][i]}));
 const hr=ws.getRow(1);hr.font={bold:true,color:{argb:'FFFFFFFF'}};hr.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF1D4E7D'}};hr.alignment={vertical:'middle',horizontal:'center',wrapText:true};
 let saved=[];try{saved=JSON.parse(localStorage.getItem(KEY)||'[]').filter(x=>x.plant===plant)}catch{};saved.sort((a,b)=>String(b.replyReceivedAt||'').localeCompare(String(a.replyReceivedAt||'')));rows.forEach(r=>{const a=analyze(r),history=saved.filter(x=>sameKpi(x,r)&&x!==r),feedback=feedbackFor(r,a,history);const row=ws.addRow([plant,r.targetMonth,r.kpiEn||r.kpi||'',a.reason,a.root,a.plan,a.owner,a.due,a.target,analysisResultFor(r,a,history),reviewGapFor(r,a,history),feedback,finalRequestFor(r,a,history)]);row.alignment={vertical:'top',wrapText:true};row.getCell(10).font={bold:true};row.getCell(11).font={bold:true};row.getCell(11).fill={type:'pattern',pattern:'solid',fgColor:{argb:'FFFFE2E2'}};row.getCell(12).fill={type:'pattern',pattern:'solid',fgColor:{argb:'FFFFF2CC'}};row.getCell(13).fill={type:'pattern',pattern:'solid',fgColor:{argb:'FFE2F0D9'}};row.getCell(13).font={bold:true}});
 ws.views=[{state:'frozen',ySplit:1,xSplit:3}];ws.autoFilter={from:'A1',to:'M1'};ws.getRow(1).height=34;ws.eachRow((row,n)=>{if(n>1)row.height=72});
 const buf=await wb.xlsx.writeBuffer(),name=`HDPS_KPI_Reply_Feedback_${plant}_${new Date().toISOString().slice(0,10)}.xlsx`;let binary='';const bytes=new Uint8Array(buf);for(let i=0;i<bytes.length;i+=0x8000)binary+=String.fromCharCode(...bytes.subarray(i,i+0x8000));latestFeedbackAttachment={filename:name,mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',base64:btoa(binary),plant,createdAt:new Date().toISOString()};const file=new File([buf],name,{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});latestFeedbackAttachment.file=file;
 const st=get('hd24FeedbackExportStatus');if(st)st.textContent='피드백 Excel 자동 생성 완료 · '+name;
}
function ensureDedicatedPanels(){
 const main=document.querySelector('main');if(!main)return{};
 let analysis=get('hd24ReplyAnalysisPanel');if(!analysis){analysis=document.createElement('section');analysis.id='hd24ReplyAnalysisPanel';analysis.className='panel hd24-tab-hidden';main.append(analysis)}
 let mail=get('hd24ReplyMailPanel');if(!mail){mail=document.createElement('section');mail.id='hd24ReplyMailPanel';mail.className='panel hd24-tab-hidden';main.append(mail)}
 return{analysis,mail};
}
function render(){
 const panel=get('hd24ReplyPanel');if(!panel)return;const dedicated=ensureDedicatedPanels(),analysisPanel=dedicated.analysis,mailPanel=dedicated.mail;let box=get('hd24Feedback');if(!box){box=document.createElement('section');box.id='hd24Feedback';analysisPanel.append(box)}else if(box.parentElement!==analysisPanel)analysisPanel.append(box)
 const plant=get('plantSelect')?.value||'india';let all=[];try{all=JSON.parse(localStorage.getItem(KEY)||'[]').filter(x=>x.plant===plant)}catch{}
 all.sort((a,b)=>String(b.replyReceivedAt||'').localeCompare(String(a.replyReceivedAt||'')));
 const groups=[];all.forEach(r=>{let g=groups.find(x=>x.month===Number(r.targetMonth)&&sameKpi(x.rows[0],r));if(!g){g={month:Number(r.targetMonth),rows:[]};groups.push(g)}g.rows.push(r)});
 let rows=groups.map(g=>g.rows[0]);
 const nextKey=plant+'|'+rows.map(r=>[r.targetMonth,r.kpiEn||r.kpi,r.replyReceivedAt,r.replySequence].join(':')).join('|');
 if(nextKey!==draftKey){draftKey=nextKey;drafts={ko:'',en:''};if(rows.length)demo=false}
 if(!rows.length&&!demo){box.innerHTML='<h3>회신 상세 분석 및 피드백</h3><div style="padding:22px;border:1px dashed #a9b9ce;border-radius:10px;background:#f7faff;margin:12px 0"><strong>등록된 회신이 없습니다.</strong><p>회신 Excel을 등록하면 KPI별 사유·근본원인·만회계획·담당자·완료일·차월목표를 구조적으로 분석하고 이전 회신과 비교합니다.</p><button type="button" id="hd24DemoPreview">샘플 분석 미리보기 (저장·발송 안 함)</button></div>';get('hd24DemoPreview').onclick=()=>{demo=true;render()};return}
 if(!rows.length&&demo){rows=[{plant,targetMonth:7,kpiEn:'Sample KPI (DEMO)',reason:'Production delay',rootCause:'',recoveryPlan:'Improve process',actionOwner:'',plannedCompletionDate:'',nextMonthRecoveryTarget:''}];groups=[{month:7,rows}]}
 const analyses=rows.map(r=>{const history=(groups.find(g=>g.month===Number(r.targetMonth)&&sameKpi(g.rows[0],r))?.rows||[]),a=analyze(r),prev=previousReply(history,r);if(prev){const p=analyze(prev);if(a.root&&p.root&&materiallySame(a.root,p.root))a.flags.push(['반복 근인','이전 회신과 동일한 근본원인이 반복됩니다. 재발방지 조치와 효과검증 근거를 명확히 제시하십시오.']);if(a.plan&&p.plan&&materiallySame(a.plan,p.plan))a.flags.push(['조치 정체','이전 회신과 동일한 Recovery Plan입니다. 실행 진척·완료근거 또는 변경 조치를 제시하십시오.'])}const due=a.due?new Date(a.due):null;if(due&&!isNaN(due)&&due<new Date()&&!/완료|complete|done/i.test(a.plan||''))a.flags.push(['기한 초과','완료예정일이 경과했습니다. 현재 상태, 지연사유 및 재설정 완료일을 회신하십시오.']);return{r,a,history}});
 const stats={total:analyses.length,complete:analyses.filter(x=>x.a.score===100).length,attention:analyses.filter(x=>x.a.score<67).length,history:analyses.filter(x=>x.history.length>1).length};
 const gaps={root:analyses.filter(x=>!x.a.root||x.a.root.length<8).length,plan:analyses.filter(x=>!x.a.plan||x.a.plan.length<12).length,target:analyses.filter(x=>!x.a.target).length,owner:analyses.filter(x=>!x.a.owner||!x.a.due).length};
 const signals={recurring:analyses.filter(x=>x.a.flags.some(f=>f[0]==='반복 근인')).length,stagnant:analyses.filter(x=>x.a.flags.some(f=>f[0]==='조치 정체')).length,overdue:analyses.filter(x=>x.a.flags.some(f=>f[0]==='기한 초과')).length,retrospective:analyses.filter(x=>/회고/.test(reviewGapFor(x.r,x.a,x.history))).length};

 const exportKey=plant+'|'+rows.map(r=>[r.targetMonth,r.kpiEn||r.kpi,r.replyReceivedAt,r.replySequence].join(':')).join('|');
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
 box.innerHTML=`<div class="hd24-section-tag">REPLY ANALYTICS</div><h2>회신 상세분석 대시보드</h2><p class="hint">회신의 완성도뿐 아니라 근인·대책·실행관리·지표연계·회고 품질을 함께 봅니다.</p><div class="hd24-kpi-strip"><div class="hd24-kpi-mini"><span>분석 KPI</span><b>${stats.total}</b></div><div class="hd24-kpi-mini"><span>중점 보완</span><b>${stats.attention}</b></div><div class="hd24-kpi-mini"><span>근인 취약</span><b>${gaps.root}</b></div><div class="hd24-kpi-mini"><span>대책 취약</span><b>${gaps.plan}</b></div><div class="hd24-kpi-mini"><span>연계기준 미흡</span><b>${gaps.target}</b></div><div class="hd24-kpi-mini"><span>책임/기한 미흡</span><b>${gaps.owner}</b></div></div><div style="margin-top:14px;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px"><div class="hd24-kpi-mini"><span>반복 근인</span><b>${signals.recurring}</b></div><div class="hd24-kpi-mini"><span>대책 정체</span><b>${signals.stagnant}</b></div><div class="hd24-kpi-mini"><span>기한 초과</span><b>${signals.overdue}</b></div><div class="hd24-kpi-mini"><span>회고 취약</span><b>${signals.retrospective}</b></div></div><div style="margin-top:14px;padding:12px 14px;border-left:4px solid #1d4e7d;background:#f7faff"><b>관리 해석</b><div style="margin-top:5px;color:#51657a">단순 미기재 건수보다 반복 원인, 동일 대책의 정체, 기한 경과, 활동결과 회고 부족을 우선 확인합니다. 추가 자료는 판단에 필요한 최소 범위만 요청합니다.</div></div><h3 style="margin-top:22px">KPI별 상세 분석</h3>`'+(demo?'<p style="color:#a45300;font-weight:bold">샘플 분석 · 실제 회신 이력과 무관하며 저장·발송되지 않습니다.</p>':'')+
 '<div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin:12px 0"><div class="hd24-kpi-mini"><span>분석 KPI</span><b>'+stats.total+'</b></div><div class="hd24-kpi-mini"><span>필수정보 100%</span><b>'+stats.complete+'</b></div><div class="hd24-kpi-mini"><span>중점 보완</span><b>'+stats.attention+'</b></div><div class="hd24-kpi-mini"><span>이전 회신 비교</span><b>'+stats.history+'</b></div></div>'+
 '<div style="margin:18px 0 10px;padding:14px 16px;border-left:5px solid #1d4e7d;background:#f3f7fb"><b style="font-size:18px">① 회신 분석결과</b><div id="hd24FeedbackExportStatus" style="margin-top:6px;font-size:13px;color:#51657a">회신 분석 완료 시 피드백 Excel 1개를 메일 첨부용으로 자동 생성합니다. 브라우저 다운로드는 실행하지 않습니다.</div><div style="margin-top:4px;color:#51657a">KPI별 핵심 회신내용과 보완 필요사항을 먼저 확인합니다.</div></div><div id="hd24FeedbackFindings"></div>';
 if(mailPanel)mailPanel.innerHTML=`<div class="hd24-section-tag">REPLY FEEDBACK MAIL</div><h2>회신 피드백 메일</h2><p class="hint">회신 상세분석 결과와 재피드백 Excel을 첨부하여 별도로 발송합니다.</p><div style="margin:22px 0 10px;padding:14px 16px;border-left:5px solid #1d4e7d;background:#f3f7fb"><b style="font-size:18px">② 회신 분석결과 별도 메일링</b><div style="margin-top:4px;color:#51657a">위 분석결과를 기반으로 해외사업장에 보낼 피드백 메일입니다.</div></div><h4 style="margin:0 0 8px;font-size:17px">메일 작성 · 검토 · 발송</h4><p style="margin:6px 0 12px;color:#51657a">최초 KPI 메일과 별개로, 등록된 회신의 사유·근본원인·만회계획을 분석한 피드백 메일입니다.</p><div style="display:flex;gap:8px;margin:12px 0"><button type="button" id="hd24FeedbackKo">한글 · 영문 발송내용 검토</button><button type="button" id="hd24FeedbackEn">English · 해외 발송</button></div><label>메일 제목</label><input id="hd24FeedbackSubject" style="width:100%;padding:10px;margin:6px 0 12px"><label>메일 본문 (수정 가능)</label><textarea id="hd24FeedbackDraft" rows="18" style="width:100%;padding:16px;font-size:14px;line-height:1.7;border:1px solid #b9c9da;border-radius:8px;background:#fff"></textarea><div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:12px 0"><div><label>수신자</label><input id="hd24FeedbackTo" style="width:100%;padding:10px" placeholder="메일 탭 담당자 연동"></div><div><label>참조(CC)</label><input id="hd24FeedbackCc" readonly style="width:100%;padding:10px;background:#f3f6f9;color:#51657a" placeholder="사업장 필수 CC 자동 연동"></div></div><div style="padding:12px 14px;background:#f7faff;border:1px solid #cbd8e6;border-radius:8px;margin:10px 0"><b>첨부파일</b><div id="hd24FeedbackAttachment">재피드백 Excel 생성상태 확인 중</div></div><div style="display:flex;gap:8px;align-items:center;margin-top:12px"><button id="hd24FeedbackCopy" type="button">현재 언어 메일 복사</button><button id="hd24FeedbackSend" type="button">회신 피드백 메일 발송</button><span id="hd24FeedbackSendStatus" style="font-size:13px;color:#51657a">발송 대기</span></div><div id="hd24FeedbackMailLog" style="margin-top:10px;font-size:12px;color:#51657a"></div><p>한글은 검토용이며 실제 해외 발송은 영문을 사용합니다. 추가 자료는 분석상 필요한 최소 범위만 요청합니다.</p>`;
 const findings=get('hd24FeedbackFindings');
 analyses.forEach(({r,a,history})=>{const d=document.createElement('details');d.open=a.score<100||a.flags.length>0;d.style.cssText='margin:10px 0;border:1px solid #cbd8e6;border-radius:10px;background:#fff;box-shadow:0 2px 7px rgba(29,78,125,.07)';const s=document.createElement('summary');s.style.cssText='cursor:pointer;padding:14px 16px;font-weight:800;font-size:15px;color:#17324d';s.textContent=r.targetMonth+'M / '+(r.kpiEn||r.kpi)+' · '+a.level+' · 필수정보 '+a.score+'%'+(history.length>1?' · 회신 '+history.length+'차':'');d.append(s);const body=document.createElement('div');body.style.cssText='padding:4px 16px 16px;line-height:1.75;background:#fbfdff';const vals=[['미달성 사유',a.reason],['근본원인',a.root],['만회계획',a.plan],['담당자',a.owner],['완료예정일',a.due],['차월 회복목표',a.target]];body.innerHTML=vals.map(x=>'<div><b>'+x[0]+'</b> · '+esc(x[1]||'미기재')+'</div>').join('')+(a.flags.length?'<div style="margin-top:8px"><b>검토 포인트</b><ul>'+a.flags.map(x=>'<li>'+esc(x[0])+'</li>').join('')+'</ul></div>':'<div style="margin-top:8px"><b>검토 포인트</b> · 필수 항목 기재 확인. 차기 실적에서 개선효과 검증 필요</div>');d.append(body);findings.append(d)});
 const linkedTo=(get('mailTo')?.value||'').trim(),linkedCc=(get('mailCc')?.value||'').trim();if(get('hd24FeedbackTo'))get('hd24FeedbackTo').value=linkedTo;if(get('hd24FeedbackCc'))get('hd24FeedbackCc').value=linkedCc;if(get('hd24FeedbackAttachment'))get('hd24FeedbackAttachment').textContent=latestFeedbackAttachment&&latestFeedbackAttachment.plant===plant?latestFeedbackAttachment.filename+' · 메일 첨부 준비 완료':'HDPS_KPI_Reply_Feedback_'+plant+'_YYYY-MM-DD.xlsx · 분석 완료 후 자동 생성';let mh=[];try{mh=JSON.parse(localStorage.getItem(SEND_LOG)||'[]')}catch{}if(get('hd24FeedbackMailLog'))get('hd24FeedbackMailLog').textContent=mh.filter(x=>x.plant===plant).slice(0,5).map(x=>(x.status==='sent'?'성공':'실패')+' · '+new Date(x.sentAt||x.failedAt).toLocaleString()+' · '+x.to+(x.error?' · '+x.error:'')).join('  |  ')||'발송 이력 없음';get('hd24FeedbackSubject').value=subject;get('hd24FeedbackDraft').value=drafts[lang];get('hd24FeedbackDraft').oninput=e=>drafts[lang]=e.target.value;
 if(get('hd24FeedbackKo'))get('hd24FeedbackKo').onclick=()=>{drafts[lang]=get('hd24FeedbackDraft').value;lang='ko';render()};if(get('hd24FeedbackEn'))get('hd24FeedbackEn').onclick=()=>{drafts[lang]=get('hd24FeedbackDraft').value;lang='en';render()};
 get(lang==='ko'?'hd24FeedbackKo':'hd24FeedbackEn').style.cssText='background:#1d4e7d;color:#fff';
 if(!demo&&exportKey&&(!latestFeedbackAttachment||latestFeedbackAttachment.plant!==plant||exportKey!==lastExportKey)){lastExportKey=exportKey;latestFeedbackAttachment=null;setTimeout(()=>exportFeedbackWorkbook(rows,plant).catch(e=>{lastExportKey='';const st=get('hd24FeedbackExportStatus');if(st)st.textContent='피드백 Excel 추출 실패 · '+(e?.message||e)}),80)}
  get('hd24FeedbackCopy').disabled=demo;get('hd24FeedbackCopy').onclick=()=>navigator.clipboard.writeText(get('hd24FeedbackSubject').value+'\n\n'+get('hd24FeedbackDraft').value);
 const send=get('hd24FeedbackSend'),status=get('hd24FeedbackSendStatus');if(send){send.disabled=demo;send.onclick=async()=>{if(demo)return;const endpoint=(window.HD24_MAIL_ENDPOINT||localStorage.getItem('hd24_mail_endpoint_v1')||'').trim();const subject=get('hd24FeedbackSubject').value.trim(),body=get('hd24FeedbackDraft').value.trim();if(!subject||!body){status.textContent='제목/본문을 확인해주세요.';return}const to=(get('hd24FeedbackTo')?.value||get('mailTo')?.value||'').trim(),cc=(get('mailCc')?.value||'').trim();if(get('hd24FeedbackCc'))get('hd24FeedbackCc').value=cc;if(!to){status.textContent='수신자 이메일을 확인해주세요.';return}if(!latestFeedbackAttachment||latestFeedbackAttachment.plant!==plant){status.textContent='재피드백 Excel 첨부파일이 아직 준비되지 않았습니다. 회신 상세분석을 먼저 완료해주세요.';return}if(!endpoint){status.textContent='메일 API 미설정 · 본문 복사 후 발송하거나 메일 API를 설정해주세요.';return}send.disabled=true;status.textContent='회신 분석결과 발송 중...';try{const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),30000);let res;try{res=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({to,cc,subject,body,plant,targetMonth:null,mailType:'reply-feedback',attachment:latestFeedbackAttachment&&latestFeedbackAttachment.plant===plant?{filename:latestFeedbackAttachment.filename,mimeType:latestFeedbackAttachment.mimeType,base64:latestFeedbackAttachment.base64,plant:latestFeedbackAttachment.plant,createdAt:latestFeedbackAttachment.createdAt}:null}),signal:controller.signal})}finally{clearTimeout(timer)}const t=await res.text();if(!res.ok)throw new Error('HTTP '+res.status+(t?' · '+t.slice(0,160):''));let api=null;try{api=t?JSON.parse(t):null}catch{}if(api&&api.success===false)throw new Error(api.error||api.message||'메일 API가 실패를 반환했습니다.');let h=[];try{h=JSON.parse(localStorage.getItem(SEND_LOG)||'[]')}catch{}h.unshift({plant,to,cc,subject,sentAt:new Date().toISOString(),status:'sent'});localStorage.setItem(SEND_LOG,JSON.stringify(h.slice(0,100)));status.textContent='회신 분석결과 메일 발송 성공 · '+new Date().toLocaleString();}catch(e){const error=(e?.name==='AbortError'?'30초 응답시간 초과':e?.message||e);let h=[];try{h=JSON.parse(localStorage.getItem(SEND_LOG)||'[]')}catch{}h.unshift({plant,to,cc,subject,failedAt:new Date().toISOString(),status:'send-failed',error:String(error)});localStorage.setItem(SEND_LOG,JSON.stringify(h.slice(0,100)));status.textContent='발송 실패 · '+error}finally{send.disabled=false}}}
}
document.addEventListener('DOMContentLoaded',()=>{setTimeout(render,700);document.addEventListener('hd24:reply-imported',()=>setTimeout(render,50));document.addEventListener('change',e=>{if(e.target?.id==='plantSelect'||e.target?.id==='hd24ReplyFile')setTimeout(render,1200)});document.addEventListener('click',e=>{if(e.target?.id==='hd24ImportReply')setTimeout(render,1200)})});
window.hd24ReplyFeedback={render};
})();