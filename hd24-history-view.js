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
function eventTime(x,type){return type==='reply'?(x.replyReceivedAt||''):(x.sentAt||x.mailOpenedAt||x.preparedAt||'')}
function buildRows(){
  const mails=load(MAIL_KEY),replies=load(REPLY_KEY),keys=new Set([...mails.map(keyOf),...replies.map(keyOf)]),out=[];
  for(const key of keys){
    const ms=mails.filter(x=>keyOf(x)===key).sort((a,b)=>String(eventTime(b,'mail')).localeCompare(String(eventTime(a,'mail'))));
    const rs=replies.filter(x=>keyOf(x)===key).sort((a,b)=>String(eventTime(b,'reply')).localeCompare(String(eventTime(a,'reply'))));
    const base=rs[0]||ms[0]||{},latestMail=ms[0]||{},latestReply=rs[0]||{};
    const cause=norm(latestReply.rootCause||latestReply.reason||'');
    const same=cause?rs.filter(x=>{const c=norm(x.rootCause||x.reason||'');return c&&(c===cause||c.includes(cause)||cause.includes(c))}).length:0;
    out.push({plant:base.plant,targetMonth:base.targetMonth,kpi:base.kpi||'',kpiEn:base.kpiEn||'',preparedAt:latestMail.preparedAt||'',sentAt:latestMail.sentAt||'',openedAt:latestMail.mailOpenedAt||'',mailStatus:latestMail.status||'',replyAt:latestReply.replyReceivedAt||'',replySequence:latestReply.replySequence||rs.length||0,responder:latestReply.responder||'',reason:latestReply.reason||'',rootCause:latestReply.rootCause||'',plan:latestReply.recoveryPlan||'',owner:latestReply.actionOwner||'',due:latestReply.plannedCompletionDate||'',nextTarget:latestReply.nextMonthRecoveryTarget||'',replyFile:latestReply.replyFileName||'',recurrence:same>=2?`Repeated x${same}`:'',mailCount:ms.length,replyCount:rs.length});
  }
  return out.sort((a,b)=>String(b.replyAt||b.sentAt||b.openedAt||b.preparedAt).localeCompare(String(a.replyAt||a.sentAt||a.openedAt||a.preparedAt)));
}
function buildEvents(){
  const mails=load(MAIL_KEY),replies=load(REPLY_KEY),events=[];
  const mailGroups={};
  mails.slice().sort((a,b)=>String(eventTime(a,'mail')).localeCompare(String(eventTime(b,'mail')))).forEach(m=>{const k=keyOf(m);mailGroups[k]=(mailGroups[k]||0)+1;const status=m.sentAt?'실제 발송':m.mailOpenedAt?'메일앱 열림':'Preview 준비';events.push({type:'mail',sequence:mailGroups[k],time:eventTime(m,'mail'),plant:m.plant,targetMonth:m.targetMonth,kpi:m.kpi||'',kpiEn:m.kpiEn||'',status,detail:m.sentAt?'메일 API 성공 응답':m.mailOpenedAt?'메일앱 호출 · 실제 발송 여부 미확인':m.autoPrepared?'자동분석 Preview':'수동 Preview'});});
  replies.forEach(r=>events.push({type:'reply',sequence:r.replySequence||1,time:r.replyReceivedAt||'',plant:r.plant,targetMonth:r.targetMonth,kpi:r.kpi||'',kpiEn:r.kpiEn||'',status:'회신 수신',detail:[r.responder&&`회신자 ${r.responder}`,r.rootCause&&`근본원인: ${r.rootCause}`,r.recoveryPlan&&`만회계획: ${r.recoveryPlan}`].filter(Boolean).join(' · ')}));
  return events.sort((a,b)=>String(b.time).localeCompare(String(a.time)));
}
function filters(){return {p:$('hd24HistPlant')?.value||'',m:$('hd24HistMonth')?.value||'',q:norm($('hd24HistKpi')?.value||''),s:$('hd24HistStatus')?.value||''}}
function matchBase(r,f){return (!f.p||r.plant===f.p)&&(!f.m||String(r.targetMonth)===f.m)&&(!f.q||norm(r.kpiEn||r.kpi).includes(f.q))}
function ensure(){
  if($('hd24TimelinePanel'))return;
  const main=document.querySelector('main');if(!main)return;
  const sec=document.createElement('section');sec.id='hd24TimelinePanel';sec.className='panel';sec.innerHTML=`<h2>메일 발송 · 회신 · 재발 이력</h2><div style="display:grid;grid-template-columns:160px 120px 1fr 150px;gap:8px;margin-bottom:12px"><select id="hd24HistPlant"><option value="">전체 사업장</option><option value="india">India</option><option value="brazil">Brazil</option><option value="ulsan">Ulsan</option></select><select id="hd24HistMonth"><option value="">전체 월</option>${Array.from({length:12},(_,i)=>`<option value="${i+1}">${i+1}월</option>`).join('')}</select><input id="hd24HistKpi" type="text" placeholder="KPI 검색"><select id="hd24HistStatus"><option value="">전체 상태</option><option value="sent">발송완료</option><option value="opened">메일앱 열림</option><option value="reply">회신수신</option><option value="recurrence">재발</option></select></div><h3 style="font-size:13px;margin:14px 0 8px">KPI별 최신 상태</h3><div style="overflow:auto;max-height:420px"><table class="results" style="min-width:1580px"><thead><tr><th>사업장</th><th>대상월</th><th>메일차수</th><th>KPI</th><th>메일 준비</th><th>실제 발송</th><th>메일앱 열림</th><th>회신 수신</th><th>회신차수</th><th>회신자</th><th>재발</th><th>사유</th><th>근본원인</th><th>만회계획</th><th>Owner</th><th>완료예정일</th><th>차월목표</th></tr></thead><tbody id="hd24TimelineBody"></tbody></table></div><h3 style="font-size:13px;margin:22px 0 8px">상세 Timeline · 1차 발송 → 1차 회신 → 2차 발송/독촉 → 2차 회신</h3><div style="overflow:auto;max-height:420px"><table class="results" style="min-width:1050px"><thead><tr><th>시점</th><th>사업장</th><th>대상월</th><th>KPI</th><th>구분</th><th>차수</th><th>상태</th><th>상세</th></tr></thead><tbody id="hd24EventBody"></tbody></table></div><p class="hint">‘실제 발송’은 메일 API 성공 응답이 있는 경우만 기록합니다. 기본 메일앱 방식은 ‘메일앱 열림’으로 별도 표시합니다. 상세 Timeline은 준비/발송/메일앱 호출과 회신 수신을 시간순 이력으로 분리해 보여줍니다.</p>`;main.appendChild(sec);
  ['hd24HistPlant','hd24HistMonth','hd24HistStatus'].forEach(id=>$(id)?.addEventListener('change',render));$('hd24HistKpi')?.addEventListener('input',render);render();
  window.addEventListener('storage',render);window.addEventListener('hd24-history-updated',render);setInterval(render,3000);
}
function render(){
  const body=$('hd24TimelineBody'),eventBody=$('hd24EventBody');if(!body||!eventBody)return;const f=filters();
  let rows=buildRows().filter(r=>matchBase(r,f));
  if(f.s==='sent')rows=rows.filter(r=>r.sentAt);else if(f.s==='opened')rows=rows.filter(r=>r.openedAt&&!r.sentAt);else if(f.s==='reply')rows=rows.filter(r=>r.replyAt);else if(f.s==='recurrence')rows=rows.filter(r=>r.recurrence);
  body.innerHTML=rows.length?rows.map(r=>`<tr><td>${esc(plantLabel(r.plant))}</td><td>${esc(r.targetMonth||'-')}</td><td>${esc(r.mailCount||'-')}</td><td title="${esc(r.kpi)}"><b>${esc(r.kpiEn||r.kpi)}</b></td><td>${esc(dt(r.preparedAt))}</td><td>${r.sentAt?`<span class="pill ok">${esc(dt(r.sentAt))}</span>`:'-'}</td><td>${r.openedAt?esc(dt(r.openedAt)):'-'}</td><td>${r.replyAt?`<b>${esc(dt(r.replyAt))}</b>`:'-'}</td><td>${esc(r.replySequence||'-')}</td><td>${esc(r.responder||'-')}</td><td>${r.recurrence?`<span class="pill miss">${esc(r.recurrence)}</span>`:'-'}</td><td>${esc(r.reason||'-')}</td><td>${esc(r.rootCause||'-')}</td><td>${esc(r.plan||'-')}</td><td>${esc(r.owner||'-')}</td><td>${esc(r.due||'-')}</td><td>${esc(r.nextTarget||'-')}</td></tr>`).join(''):`<tr><td colspan="17" style="text-align:center;padding:18px;color:#66707d">조건에 맞는 메일/회신 이력이 없습니다.</td></tr>`;
  let events=buildEvents().filter(r=>matchBase(r,f));
  if(f.s==='sent')events=events.filter(r=>r.type==='mail'&&r.status==='실제 발송');else if(f.s==='opened')events=events.filter(r=>r.type==='mail'&&r.status==='메일앱 열림');else if(f.s==='reply')events=events.filter(r=>r.type==='reply');else if(f.s==='recurrence'){const recurrentKeys=new Set(rows.map(keyOf));events=events.filter(r=>recurrentKeys.has(keyOf(r)))}
  eventBody.innerHTML=events.length?events.map(e=>`<tr><td>${esc(dt(e.time))}</td><td>${esc(plantLabel(e.plant))}</td><td>${esc(e.targetMonth||'-')}</td><td title="${esc(e.kpi)}"><b>${esc(e.kpiEn||e.kpi)}</b></td><td>${e.type==='reply'?'<span class="pill ok">회신</span>':'메일'}</td><td>${esc(e.sequence||'-')}차</td><td>${esc(e.status)}</td><td>${esc(e.detail||'-')}</td></tr>`).join(''):`<tr><td colspan="8" style="text-align:center;padding:18px;color:#66707d">조건에 맞는 상세 Timeline 이력이 없습니다.</td></tr>`;
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ensure,{once:true});else ensure();
})();