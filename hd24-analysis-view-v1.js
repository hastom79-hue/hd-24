(()=>{'use strict';
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
function getRows(){try{return Array.isArray(allResults)?allResults:[]}catch(_){return []}}
function currentMonth(){try{return Number(selectedMonth||0)}catch(_){return 0}}
function koState(s){return ({'DATA/REPLY VALIDATION':'데이터/회신 검증','PDCA CANDIDATE':'PDCA 과제 후보','ACTION TRACKING':'기존대책 추적','RECOVERING':'회복 중','FOLLOW-UP REQUIRED':'확인 필요','WATCH':'관찰'})[s]||s}
function ensure(){
 const card=$('resultCard');if(!card)return null;
 let box=$('hd24FullAnalysis');
 if(!box){box=document.createElement('section');box.id='hd24FullAnalysis';box.style.cssText='margin:16px 0 18px;padding:16px;border:1px solid var(--line);border-radius:8px;background:#fbfcfd';const strip=$('monthStrip');strip?strip.after(box):card.prepend(box)}
 return box;
}
function render(){
 const engine=window.HD24_RULE_MATRIX_V1,rows=getRows(),box=ensure();if(!engine||!box||!rows.length){if(box)box.style.display='none';return}
 const mo=currentMonth()||Math.max(...rows.map(r=>Number(r.month||r.targetMonth||0))), analyzed=engine.analyzeAll(rows).filter(x=>Number(x.record.month??x.record.targetMonth)===mo);
 const counts={};analyzed.forEach(x=>counts[x.managementState]=(counts[x.managementState]||0)+1);
 const follow=analyzed.filter(x=>x.questions.length), findings=analyzed.reduce((n,x)=>n+x.findings.length,0);
 box.style.display='block';
 box.innerHTML='<div style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start;flex-wrap:wrap"><div><div style="font-size:11px;font-weight:900;letter-spacing:.1em;color:#6c8da3">FULL ANALYTICAL FINDINGS · RULE MATRIX v'+esc(engine.version)+'</div><h3 style="margin:5px 0 3px;font-size:16px">'+mo+'월 관리분석</h3><div style="font-size:12px;color:var(--muted)">분석결과는 모두 표시하고, 법인 확인질문만 별도로 최소화합니다.</div></div><div style="font-size:12px;color:var(--muted)">Findings <b>'+findings+'</b> · Follow-up Issue <b>'+follow.length+'</b></div></div>'+
 '<div style="display:flex;gap:7px;flex-wrap:wrap;margin:12px 0">'+Object.entries(counts).map(([k,v])=>'<span class="tag tag-flat">'+esc(koState(k))+' '+v+'</span>').join('')+'</div>'+
 '<div style="overflow:auto"><table style="width:100%;border-collapse:collapse;font-size:12.5px"><thead><tr><th style="text-align:left;padding:7px;border-bottom:1px solid var(--line)">KPI</th><th style="text-align:left;padding:7px;border-bottom:1px solid var(--line)">Management State</th><th style="text-align:left;padding:7px;border-bottom:1px solid var(--line)">Analytical Findings</th><th style="text-align:left;padding:7px;border-bottom:1px solid var(--line)">Required Follow-up</th></tr></thead><tbody>'+
 analyzed.map(x=>'<tr><td style="padding:8px;border-bottom:1px solid #edf0f2;font-weight:700">'+esc(x.record.kpiEn||x.record.kpi)+'</td><td style="padding:8px;border-bottom:1px solid #edf0f2">'+esc(koState(x.managementState))+'</td><td style="padding:8px;border-bottom:1px solid #edf0f2">'+x.findings.map(f=>'<div><b>'+esc(f.statement)+'</b> <span style="color:var(--muted)">['+esc(f.confidence)+']</span><br><span style="color:var(--muted)">'+esc(f.evidence)+'</span></div>').join('<div style="height:5px"></div>')+'</td><td style="padding:8px;border-bottom:1px solid #edf0f2">'+(x.questions.length?x.questions.map(q=>'<div>• '+esc(q)+'</div>').join(''):'<span style="color:var(--muted)">추가 회신요구 없음</span>')+'</td></tr>').join('')+
 '</tbody></table></div>';
}
function schedule(){setTimeout(render,80)}
document.addEventListener('DOMContentLoaded',schedule);
document.addEventListener('hd24:reply-imported',schedule);
document.addEventListener('hd24:rule-matrix-ready',schedule);
document.addEventListener('click',e=>{if(e.target?.closest?.('#monthStrip .m'))schedule()});
const mo=new MutationObserver(()=>{const card=$('resultCard');if(card&&card.style.display!=='none'&&getRows().length)schedule()});
document.addEventListener('DOMContentLoaded',()=>{const card=$('resultCard');if(card)mo.observe(card,{attributes:true,attributeFilter:['style']})});
window.hd24RenderFullAnalysis=render;
})();