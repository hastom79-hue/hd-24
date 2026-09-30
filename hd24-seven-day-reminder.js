(()=>{
'use strict';
const MAIL_KEY='hd24_kpi_mail_history_v2',REPLY_KEY='hd24_kpi_reply_history_v2',ENDPOINT_KEY='hd24_mail_endpoint_v1';
const DAY=86400000,DELAY=7*DAY,GLOBAL=['dylee07@hd.com','hastom@hd.com'],EXTRA={india:['minsu.kim01@hd.com','deokho.kim@hd.com'],brazil:['antos2082@hd.com','yhchoi@hd.com']};
const read=k=>{try{return JSON.parse(localStorage.getItem(k)||'[]')}catch(_){return []}};
const norm=v=>String(v||'').toLowerCase().replace(/[^a-z0-9가-힣]/g,'');
const plant=()=>{try{return currentPlant||document.getElementById('plantSelect')?.value||''}catch(_){return document.getElementById('plantSelect')?.value||''}};
const required=(p,cc)=>[...new Set([...GLOBAL,...(EXTRA[p]||[]),...String(cc||'').split(/[;,\s]+/).filter(Boolean)].map(s=>s.trim().toLowerCase()))].join('; ');
const greeting=n=>n?'Dear '+String(n).replace(/[\r\n<>]/g,' ').trim().replace(/,+$/,'')+',':'Dear Team,';
const reminderText=n=>[greeting(n),'',
'This is a follow-up regarding the HDPS KPI results previously shared. No reply results have been uploaded to the KPI monitoring system within seven days of the original email. Please upload your completed response and reply to this email.','',
'Daily management and utilization of Lean performance indicators does not merely mean setting KPIs and tracking actual results. It encompasses short-, medium-, and long-term trend management and the corresponding response activities by operational departments and shop-floor teams.','',
'Please recognize that each plant is required to manage these activities independently as part of its daily operations, and confirm your understanding by replying to this email.','',
'Best Regards,','Mr.Seoh'].join('\n');
const status=s=>{const el=document.getElementById('hd24SevenDayStatus');if(el)el.textContent=s};
function pending(now=Date.now()){
 const mails=read(MAIL_KEY),replies=read(REPLY_KEY),seen=new Set(),out=[];
 for(const m of mails){
  if(m.status!=='sent'||!m.sentAt||!m.to||!['india','brazil'].includes(m.plant))continue;
  const sent=Date.parse(m.sentAt);if(!Number.isFinite(sent)||now-sent<DELAY)continue;
  const id=[m.plant,m.sentAt,m.to.toLowerCase()].join('|');if(seen.has(id))continue;seen.add(id);
  const batch=mails.filter(x=>x.status==='sent'&&x.plant===m.plant&&x.sentAt===m.sentAt&&x.to===m.to);
  const answered=batch.every(x=>replies.some(r=>r.plant===x.plant&&Number(r.targetMonth)===Number(x.targetMonth)&&norm(r.kpiEn||r.kpi)===norm(x.kpiEn||x.kpi)&&Date.parse(r.replyReceivedAt)>=sent));
  const reminded=mails.some(x=>x.status==='seven-day-reminder-sent'&&x.originalMailId===id);
  if(!answered&&!reminded)out.push({id,mail:m,batch});
 }
 return out;
}
function render(){const el=document.getElementById('hd24ReminderMailList');if(!el)return;const p=plant(),items=pending().filter(x=>x.mail.plant===p);const sent=read(MAIL_KEY).filter(x=>x.plant===p&&x.status==='seven-day-reminder-sent');const escape=s=>String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');el.innerHTML='<div style="display:flex;gap:12px;flex-wrap:wrap;margin:12px 0"><strong>미회신 D+7: '+items.length+'건</strong><span>재안내 발송완료: '+sent.length+'건</span></div>'+(items.length?items.map(x=>'<div style="padding:12px;margin:8px 0;border:1px solid #d3dce5;border-radius:8px"><b>'+escape(x.mail.to)+'</b><div>최초 발송: '+new Date(x.mail.sentAt).toLocaleString()+' · 미회신 KPI '+x.batch.length+'건</div><div style="color:#a14b00">D+7 경과 · 회신 결과 미업로드</div></div>').join(''):'<p>현재 미회신 D+7 대상이 없습니다.</p>')+(sent.length?'<h4>리마인드 발송 이력</h4>'+sent.slice(0,10).map(x=>'<div style="padding:6px 0;border-bottom:1px solid #e5e7eb">'+escape(x.to)+' · '+new Date(x.sentAt).toLocaleString()+'</div>').join(''):'');}
let busy=false;
async function check(){
 if(busy)return;const p=plant(),due=pending().filter(x=>x.mail.plant===p);if(!due.length){status('7일 미회신 재안내 대상 없음');render();return}
 const endpoint=String(window.HD24_MAIL_ENDPOINT||localStorage.getItem(ENDPOINT_KEY)||'').trim();
 if(!endpoint){status('7일 미회신 '+due.length+'건: 자동 발송 API 미설정. 발송하려면 메일 API를 설정하세요.');return}
 busy=true;
 try{
  for(const item of due){
   const m=item.mail,lock='hd24_7day_lock_'+item.id,now=Date.now(),previous=Number(localStorage.getItem(lock)||0);
   if(previous&&now-previous<15*60*1000)continue;
   localStorage.setItem(lock,String(now));
   try{
    // Re-read replies immediately before dispatch to prevent stale reminder sends.
    if(!pending().some(x=>x.id===item.id)){localStorage.removeItem(lock);continue}
    const cc=required(m.plant,m.cc),body=reminderText(m.recipientName),subject='[HDPS KPI] 7-Day Follow-up: Reply and Daily Lean KPI Management - '+(m.plant==='india'?'India':'Brazil');
    const res=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({to:m.to,cc,subject,body,bodyHtml:'<html><body style="font-family:Arial,sans-serif;white-space:pre-line">'+body.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')+'</body></html>',plant:m.plant,reminder:true,originalSentAt:m.sentAt,originalMailId:item.id})});
    if(!res.ok)throw new Error('HTTP '+res.status);
    const history=read(MAIL_KEY);history.unshift({plant:m.plant,status:'seven-day-reminder-sent',to:m.to,cc,recipientName:m.recipientName||'',originalSentAt:m.sentAt,originalMailId:item.id,sentAt:new Date().toISOString()});localStorage.setItem(MAIL_KEY,JSON.stringify(history.slice(0,3000)));
    localStorage.removeItem(lock);status('7일 미회신 재안내 발송 완료: '+m.to);
   }catch(e){localStorage.removeItem(lock);status('7일 재안내 발송 실패: '+String(e.message||e));}
  }
 }finally{busy=false;render()}
}
function init(){
 const panel=document.getElementById('hd24ReminderMailContent')||document.getElementById('hd24FollowupPanel');if(panel&&!document.getElementById('hd24SevenDayStatus')){const el=document.createElement('div');el.id='hd24SevenDayStatus';el.style.cssText='padding:8px 12px;margin:8px 0;border:1px solid #cbd5e1;border-radius:6px;font-size:13px';el.textContent='7일 미회신 재안내 확인 중';panel.appendChild(el)}
 render();check();setInterval(check,60*60*1000);
 document.getElementById('plantSelect')?.addEventListener('change',()=>setTimeout(check,200));
 document.getElementById('hd24ReplyFile')?.addEventListener('change',()=>setTimeout(check,3000));
}
window.hd24SevenDayReminder={pending,check,render,reminderText,required};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();