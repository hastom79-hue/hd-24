(()=>{
'use strict';
const MAIL_KEY='hd24_kpi_mail_history_v2';
const REPLY_KEY='hd24_kpi_reply_history_v2';
const $=id=>document.getElementById(id);
const norm=v=>String(v??'').toLowerCase().replace(/\s+/g,' ').trim();
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
function load(k){try{return JSON.parse(localStorage.getItem(k)||'[]')}catch(_){return []}}
function plantLabel(v){return v==='india'?'India':v==='brazil'?'Brazil':v==='ulsan'?'Ulsan':v||'-'}
function dt(v){if(!v)return '-';try{return new Date(v).toLocaleString()}catch(_){return v}}
function keyOf(x){return [x.plant,x.targetMonth,norm(x.kpiEn||x.kpi)].join('|')}
function buildRows(){
  const mails=load(MAIL_KEY),replies=load(REPLY_KEY),keys=new Set([...mails.map(keyOf),...replies.map(keyOf)]),out=[];
  for(const key of keys){
    const ms=mails.filter(x=>keyOf(x)===key).sort((a,b)=>String(b.sentAt||b.mailOpenedAt||b.preparedAt||'').localeCompare(String(a.sentAt||a.mailOpenedAt||a.preparedAt||'')));
    const rs=replies.filter(x=>keyOf(x)===key).sort((a,b)=>String(b.replyReceivedAt||'').localeCompare(String(a.replyReceivedAt||'')));
    const base=rs[0]||ms[0]||{};
    const latestMail=ms[0]||{},latestReply=rs[0]||{};
    const cause=norm(latestReply.rootCause||latestReply.reason||'');
    const same=cause?rs.filter(x=>{const c=norm(x.rootCause||x.reason||'');return c&&(c===cause||c.includes(cause)||cause.includes(c))}).length:0;
    out.push({plant:base.plant,targetMonth:base.targetMonth,kpi:base.kpi||'',kpiEn:base.kpiEn||'',preparedAt:latestMail.preparedAt||'',sentAt:latestMail.sentAt||'',openedAt:latestMail.mailOpenedAt||'',mailStatus:latestMail.status||'',replyAt:latestReply.replyReceivedAt||'',replySequence:latestReply.replySequence||rs.length||0,responder:latestReply.responder||'',reason:latestReply.reason||'',rootCause:latestReply.rootCause||'',plan:latestReply.recoveryPlan||'',owner:latestReply.actionOwner||'',due:latestReply.plannedCompletionDate||'',nextTarget:latestReply.nextMonthRecoveryTarget||'',replyFile:latestReply.replyFileName||'',recurrence:same>=2?`Repeated x${same}`:'',mailCount:ms.length,replyCount:rs.length});
  }
  return out.sort((a,b)=>String(b.replyAt||b.sentAt||b.openedAt||b.preparedAt).localeCompare(String(a.replyAt||a.sentAt||a.openedAt||a.preparedAt)));
}
function ensure(){
  if($('hd24TimelinePanel'))return;
  const main=document.querySelector('main');if(!main)return;
  const sec=document.createElement('section');sec.id='hd24TimelinePanel';sec.className='panel';sec.innerHTML=`<h2>메일 발송 · 회신 · 재발 이력</h2><div style="display:grid;grid-template-columns:160px 120px 1fr 150px;gap:8px;margin-bottom:12px"><select id="hd24HistPlant"><option value="">전체 사업장</option><option value="india">India</option><option value="brazil">Brazil</option><option value="ulsan">Ulsan</option></select><select id="hd24HistMonth"><option value="">전체 월</option>${Array.from({length:12},(_,i)=>`<option value="${i+1}">${i+1}월</option>`).join('')}</select><input id="hd24HistKpi" type="text" placeholder="KPI 검색"><select id="hd24HistStatus"><option value="">전체 상태</option><option value="sent">발송완료</option><option value="opened">메일앱 열림</option><option value="reply">회신수신</option><option value="recurrence">재발</option></select></div><div style="overflow:auto;max-height:460px"><table class="results" style="min-width:1580px"><thead><tr><th>사업장</th><th>대상월</th><th>메일차수</th><th>KPI</th><th>메일 준비</th><th>실제 발송</th><th>메일앱 열림</th><th>회신 수신</th><th>회신차수</th><th>회신자</th><th>재발</th><th>사유</th><th>근본원인</th><th>만회계획</th><th>Owner</th><th>완료예정일</th><th>차월목표</th></tr></thead><tbody id="hd24TimelineBody"></tbody></table></div><p class="hint">메일차수와 회신차수는 동일 사업장 + 대상월 + KPI 기준 누적 건수입니다. ‘실제 발송’은 메일 API 성공 응답이 있는 경우만 기록합니다. 기본 메일앱 방식은 ‘메일앱 열림’으로 별도 표시하며 실제 발송으로 간주하지 않습니다.</p>`;main.appendChild(sec);
  ['hd24HistPlant','hd24HistMonth','hd24HistStatus'].forEach(id=>$(id)?.addEventListener('change',render));$('hd24HistKpi')?.addEventListener('input',render);render();
  window.addEventListener('storage',render);window.addEventListener('hd24-history-updated',render);
  setInterval(render,3000);
}
function render(){
  const body=$('hd24TimelineBody');if(!body)return;const p=$('hd24HistPlant')?.value||'',m=$('hd24HistMonth')?.value||'',q=norm($('hd24HistKpi')?.value||''),s=$('hd24HistStatus')?.value||'';
  let rows=buildRows().filter(r=>(!p||r.plant===p)&&(!m||String(r.targetMonth)===m)&&(!q||norm(r.kpiEn||r.kpi).includes(q)));
  if(s==='sent')rows=rows.filter(r=>r.sentAt);else if(s==='opened')rows=rows.filter(r=>r.openedAt&&!r.sentAt);else if(s==='reply')rows=rows.filter(r=>r.replyAt);else if(s==='recurrence')rows=rows.filter(r=>r.recurrence);
  body.innerHTML=rows.length?rows.map(r=>`<tr><td>${esc(plantLabel(r.plant))}</td><td>${esc(r.targetMonth||'-')}</td><td><b>${esc(r.mailCount||'-')}</b></td><td title="${esc(r.kpi)}"><b>${esc(r.kpiEn||r.kpi)}</b></td><td>${esc(dt(r.preparedAt))}</td><td>${r.sentAt?`<span class="pill ok">${esc(dt(r.sentAt))}</span>`:'-'}</td><td>${r.openedAt?esc(dt(r.openedAt)):'-'}</td><td>${r.replyAt?`<b>${esc(dt(r.replyAt))}</b>`:'-'}</td><td>${esc(r.replySequence||'-')}</td><td>${esc(r.responder||'-')}</td><td>${r.recurrence?`<span class="pill miss">${esc(r.recurrence)}</span>`:'-'}</td><td>${esc(r.reason||'-')}</td><td>${esc(r.rootCause||'-')}</td><td>${esc(r.plan||'-')}</td><td>${esc(r.owner||'-')}</td><td>${esc(r.due||'-')}</td><td>${esc(r.nextTarget||'-')}</td></tr>`).join(''):`<tr><td colspan="17" style="text-align:center;padding:18px;color:#66707d">조건에 맞는 메일/회신 이력이 없습니다.</td></tr>`;
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ensure,{once:true});else ensure();
})();