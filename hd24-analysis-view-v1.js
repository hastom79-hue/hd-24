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
let dashboardFilter='ALL', clusterFilter=null;
function matchDashboard(x,key){
 if(key==='RECOVERY')return ['RECOVERING','RECOVERY_CONFIRMED'].includes(x.trend.state);
 if(key==='PERSISTENT')return x.target.state==='TARGET_MISS'&&!['RECOVERING','NEW_REGRESSION'].includes(x.trend.state);
 if(key==='REGRESSION')return x.trend.state==='NEW_REGRESSION'||x.trend.state==='WORSENING_MISS';
 if(key==='INTEGRITY')return x.findings.some(f=>f.type==='DATA_INTEGRITY'||f.type==='REPLY_VALIDATION');
 if(key==='FOLLOW')return x.questions.length>0;
 return true;
}
function render(){
 const engine=window.HD24_RULE_MATRIX_V1,rows=getRows(),box=ensure();if(!engine||!box||!rows.length){if(box)box.style.display='none';return}
 const audit=engine.auditSummary?engine.auditSummary(rows):null;
 const mo=currentMonth()||Math.max(...rows.map(r=>Number(r.month||r.targetMonth||0))), analyzed=engine.analyzeAll(rows).filter(x=>Number(x.record.month??x.record.targetMonth)===mo);
 const visibleAnalyzed=analyzed.filter(x=>matchDashboard(x,dashboardFilter)).filter(x=>!clusterFilter||clusterFilter.kpis.map(v=>String(v).toLowerCase().trim()).includes(String(x.record.kpiEn||x.record.kpi||'').toLowerCase().trim()));
 const integrityRows=analyzed.filter(x=>x.findings.some(f=>f.type==='DATA_INTEGRITY'));
 const counts={};analyzed.forEach(x=>counts[x.managementState]=(counts[x.managementState]||0)+1);
 const follow=analyzed.filter(x=>x.questions.length), findings=analyzed.reduce((n,x)=>n+x.findings.length,0);
 const metrics={
  total:analyzed.length,
  recovery:analyzed.filter(x=>['RECOVERING','RECOVERY_CONFIRMED'].includes(x.trend.state)).length,
  persistent:analyzed.filter(x=>x.target.state==='TARGET_MISS'&&!['RECOVERING','NEW_REGRESSION'].includes(x.trend.state)).length,
  regression:analyzed.filter(x=>x.trend.state==='NEW_REGRESSION'||x.trend.state==='WORSENING_MISS').length,
  integrity:analyzed.filter(x=>x.findings.some(f=>f.type==='DATA_INTEGRITY'||f.type==='REPLY_VALIDATION')).length,
  follow:follow.length
 };
 const clusters=(engine.clusterFindings?engine.clusterFindings(rows):[]).filter(x=>Number(x.month)===mo);
 box.style.display='block';
 box.innerHTML='<div style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start;flex-wrap:wrap"><div><div style="font-size:11px;font-weight:900;letter-spacing:.1em;color:#6c8da3">FULL ANALYTICAL FINDINGS · RULE MATRIX v'+esc(engine.version)+'</div><h3 style="margin:5px 0 3px;font-size:16px">'+mo+'월 관리분석</h3><div style="font-size:12px;color:var(--muted)">분석결과는 모두 표시하고, 법인 확인질문만 별도로 최소화합니다.</div></div><div style="font-size:12px;color:var(--muted)">Findings <b>'+findings+'</b> · Follow-up Issue <b>'+follow.length+'</b></div></div>'+
 (audit?'<div style="margin:12px 0 4px"><div style="font-size:11px;font-weight:900;letter-spacing:.06em;color:#6c8da3;margin-bottom:6px">UPLOAD DATA AUDIT</div><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(115px,1fr));gap:7px">'+[
 ['검증행',audit.rows],['정상',audit.valid],['Status 불일치',audit.statusMismatch],['Direction 미등록',audit.directionUnregistered],['계산불가',audit.uncalculable],['Master Coverage',audit.masterCoveragePct+'%']
 ].map(v=>'<div style="background:#fff;border:1px solid var(--line);border-radius:7px;padding:8px 10px"><div style="font-size:10.5px;color:var(--muted)">'+v[0]+'</div><b style="font-size:17px">'+v[1]+'</b></div>').join('')+'</div></div>':'')+
  '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(125px,1fr));gap:8px;margin:14px 0">'+[
 ['전체 KPI',metrics.total,'분석 대상','ALL'],
 ['Recovery',metrics.recovery,'회복/회복확인','RECOVERY'],
 ['Persistent Miss',metrics.persistent,'지속 미달','PERSISTENT'],
 ['Regression',metrics.regression,'신규/재악화','REGRESSION'],
 ['Data / Reply Gap',metrics.integrity,'무결성·회신','INTEGRITY'],
 ['Follow-up',metrics.follow,'확인 필요','FOLLOW']
 ].map(v=>'<button type="button" data-analysis-filter="'+v[3]+'" style="text-align:left;background:'+(dashboardFilter===v[3]?'#eef6fb':'#fff')+';border:'+(dashboardFilter===v[3]?'2px solid var(--accent)':'1px solid var(--line)')+';border-radius:8px;padding:10px 11px;cursor:pointer"><div style="font-size:11px;color:var(--muted);font-weight:700">'+v[0]+'</div><div style="font-size:22px;font-weight:900;line-height:1.25;margin:3px 0">'+v[1]+'</div><div style="font-size:10.5px;color:var(--muted)">'+v[2]+'</div></button>').join('')+'</div>'+
 '<div style="margin:4px 0 12px">'+(integrityRows.length?
 '<div style="background:#fff8ed;border:1px solid #e7c98a;border-radius:8px;padding:10px 12px"><div style="font-size:12px;font-weight:900">Data Integrity · Source Status Recalculation</div><div style="font-size:11px;color:var(--muted);margin:3px 0 7px">Direction Master + Target/Actual 재계산 결과와 원본 Status를 대조합니다. 불일치가 있어도 원본을 임의 수정하지 않고 검증 대상으로 분리합니다.</div>'+
 integrityRows.map(x=>'<div style="padding:4px 0;border-top:1px solid #f0dfbd"><b>'+esc(x.record.kpiEn||x.record.kpi)+' · '+esc(x.record.month)+'월</b> — '+esc(x.findings.filter(f=>f.type==='DATA_INTEGRITY').map(f=>f.evidence).join(' / '))+'</div>').join('')+'</div>':
 '<div style="background:#f7faf8;border:1px solid var(--line);border-radius:8px;padding:9px 11px;font-size:12px"><b>Data Integrity</b> · 해당 월 Source Status 불일치 없음</div>')+'</div>'+
  '<div style="display:flex;gap:7px;flex-wrap:wrap;margin:8px 0 12px">'+Object.entries(counts).map(([k,v])=>'<span class="tag tag-flat">'+esc(koState(k))+' '+v+'</span>').join('')+'</div>'+
 '<div style="margin:8px 0 14px">'+(clusters.length?'<div style="font-size:12px;font-weight:800;margin-bottom:6px">Cross-KPI Management Findings</div>'+clusters.map((x,i)=>'<button type="button" data-cluster-index="'+i+'" style="display:block;width:100%;text-align:left;padding:9px 10px;margin:5px 0;border:1px solid var(--line);border-left:3px solid var(--accent);border-radius:4px;background:'+(clusterFilter&&clusterFilter.cluster===x.cluster?'#eef6fb':'#fff')+';cursor:pointer"><b>'+esc(x.cluster)+' · '+esc(x.state)+'</b> <span style="color:var(--muted)">['+esc(x.confidence)+']</span><br><span>'+esc(x.statement)+'</span><br><span style="font-size:11.5px;color:var(--muted)">Related KPI: '+esc(x.kpis.join(' / '))+'</span></button>').join(''):'<span style="font-size:12px;color:var(--muted)">해당 월 Cross-KPI 특이사항 없음</span>')+(clusterFilter?'<div style="margin-top:6px"><button type="button" data-cluster-clear="1" class="ghost" style="font-size:11px;padding:4px 8px">Cross-KPI 필터 해제</button></div>':'')+'</div>'+
 '<div style="font-size:12px;font-weight:800;margin:12px 0 6px">Issue Detail · Management Review Flow</div>'+
 '<div style="display:grid;gap:8px;margin-bottom:14px">'+
 (clusters.length?clusters.map(x=>{
   const related=analyzed.filter(a=>(x.kpis||[]).map(v=>String(v).toLowerCase().trim()).includes(String(a.record.kpiEn||a.record.kpi||'').toLowerCase().trim()));
   const evidence=[...new Set(related.flatMap(a=>a.findings.map(f=>f.evidence)).filter(Boolean))].slice(0,3);
   const actions=[...new Set(related.map(a=>{const d=a.actionDetail||{};return [d.text,d.owner&&('Owner '+d.owner),d.due&&('Due '+d.due),d.completed?'Completed':''].filter(Boolean).join(' · ')}).filter(Boolean))];
   const effects=[...new Set(related.map(a=>a.actionDetail?.effect||a.trend?.state).filter(Boolean))];
   const followups=engine.consolidateIssueFollowups?engine.consolidateIssueFollowups(related,[x]):[];
   return '<div style="background:#fff;border:1px solid var(--line);border-radius:8px;padding:11px 12px">'+
    '<div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap"><b>'+esc(x.cluster)+' · '+esc(x.state)+'</b><span style="font-size:11px;color:var(--muted)">Confidence '+esc(x.confidence||'MEDIUM')+'</span></div>'+
    '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(155px,1fr));gap:7px;margin-top:9px">'+
      '<div><b style="font-size:11px">① 현재상태</b><div>'+esc(x.state)+'</div></div>'+
      '<div><b style="font-size:11px">② 근거</b><div>'+esc(evidence.join(' / ')||x.statement)+'</div></div>'+
      '<div><b style="font-size:11px">③ 기존대책</b><div>'+esc(actions.join(' / ')||'확인 필요')+'</div></div>'+
      '<div><b style="font-size:11px">④ 효과판정</b><div>'+esc(effects.join(' / ')||'효과 검증 대기')+'</div></div>'+
      '<div><b style="font-size:11px">⑤ Management Implication</b><div>'+esc(x.statement)+'</div></div>'+
      '<div><b style="font-size:11px">⑥ Follow-up</b><div>'+esc(followups.map(v=>v.question).join(' / ')||'추가 회신요구 없음')+'</div></div>'+
    '</div><div style="font-size:11px;color:var(--muted);margin-top:8px">Related KPI: '+esc((x.kpis||[]).join(' / '))+'</div></div>';
 }).join(''):'<div style="font-size:12px;color:var(--muted)">Issue-level 특이사항 없음</div>')+'</div>'+
  '<div style="font-size:12px;font-weight:800;margin:10px 0 6px">KPI-Level Full Analytical Findings <span style="font-weight:500;color:var(--muted)">· 내부 분석 전체 보존</span></div>'+
 '<div style="overflow:auto"><table style="width:100%;border-collapse:collapse;font-size:12.5px"><thead><tr><th style="text-align:left;padding:7px;border-bottom:1px solid var(--line)">KPI</th><th style="text-align:left;padding:7px;border-bottom:1px solid var(--line)">Management State</th><th style="text-align:left;padding:7px;border-bottom:1px solid var(--line)">Analytical Findings</th><th style="text-align:left;padding:7px;border-bottom:1px solid var(--line)">Required Follow-up</th></tr></thead><tbody>'+
 visibleAnalyzed.map(x=>'<tr><td style="padding:8px;border-bottom:1px solid #edf0f2;font-weight:700">'+esc(x.record.kpiEn||x.record.kpi)+'</td><td style="padding:8px;border-bottom:1px solid #edf0f2">'+esc(koState(x.managementState))+'</td><td style="padding:8px;border-bottom:1px solid #edf0f2">'+x.findings.map(f=>'<div><b>'+esc(f.statement)+'</b> <span style="color:var(--muted)">['+esc(f.confidence)+']</span><br><span style="color:var(--muted)">'+esc(f.evidence)+'</span></div>').join('<div style="height:5px"></div>')+'</td><td style="padding:8px;border-bottom:1px solid #edf0f2">'+(x.questions.length?x.questions.map(q=>'<div>• '+esc(q)+'</div>').join(''):'<span style="color:var(--muted)">추가 회신요구 없음</span>')+'</td></tr>').join('')+
 '</tbody></table></div>';
}
function schedule(){setTimeout(render,80)}
document.addEventListener('DOMContentLoaded',schedule);
document.addEventListener('hd24:reply-imported',schedule);
document.addEventListener('hd24:rule-matrix-ready',schedule);
document.addEventListener('click',e=>{
 const cluster=e.target?.closest?.('[data-cluster-index]');
 if(cluster){const rows=getRows(),mo=currentMonth()||Math.max(...rows.map(r=>Number(r.month||r.targetMonth||0))),cs=(window.HD24_RULE_MATRIX_V1?.clusterFindings?.(rows)||[]).filter(x=>Number(x.month)===mo);clusterFilter=cs[Number(cluster.dataset.clusterIndex)]||null;dashboardFilter='ALL';render();setTimeout(()=>$('hd24FullAnalysis')?.querySelector('table')?.scrollIntoView({behavior:'smooth',block:'start'}),30);return}
 if(e.target?.closest?.('[data-cluster-clear]')){clusterFilter=null;render();return}
 const filter=e.target?.closest?.('[data-analysis-filter]');
 if(filter){dashboardFilter=filter.dataset.analysisFilter||'ALL';clusterFilter=null;render();setTimeout(()=>$('hd24FullAnalysis')?.querySelector('table')?.scrollIntoView({behavior:'smooth',block:'start'}),30);return}
 if(e.target?.closest?.('#monthStrip .m')){dashboardFilter='ALL';clusterFilter=null;schedule()}
});
const mo=new MutationObserver(()=>{const card=$('resultCard');if(card&&card.style.display!=='none'&&getRows().length)schedule()});
document.addEventListener('DOMContentLoaded',()=>{const card=$('resultCard');if(card)mo.observe(card,{attributes:true,attributeFilter:['style']})});
window.hd24RenderFullAnalysis=render;
})();