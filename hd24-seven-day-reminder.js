(()=>{
'use strict';
const MAIL_KEY='hd24_kpi_mail_history_v2',REPLY_KEY='hd24_kpi_reply_history_v2',ENDPOINT_KEY='hd24_mail_endpoint_v1';
const DAY=86400000,DELAY=7*DAY,GLOBAL=['dylee07@hd.com','hastom@hd.com'],EXTRA={india:['minsu.kim01@hd.com','deokho.kim@hd.com'],brazil:['antos2082@hd.com','yhchoi@hd.com']};
const read=k=>{try{return JSON.parse(localStorage.getItem(k)||'[]')}catch(_){return []}};
const norm=v=>String(v||'').toLowerCase().replace(/[^a-z0-9가-힣]/g,'');
const sameKpi=(a,b)=>{const A=[norm(a?.kpiEn),norm(a?.kpi)].filter(Boolean),B=[norm(b?.kpiEn),norm(b?.kpi)].filter(Boolean);return A.some(x=>B.includes(x))};
const plant=()=>{try{return currentPlant||document.getElementById('plantSelect')?.value||''}catch(_){return document.getElementById('plantSelect')?.value||''}};
const required=(p,cc)=>[...new Set([...GLOBAL,...(EXTRA[p]||[]),...String(cc||'').split(/[;,\s]+/).filter(Boolean)].map(s=>s.trim().toLowerCase()))].join('; ');
const greeting=n=>n?'Dear '+String(n).replace(/[\r\n<>]/g,' ').trim().replace(/,+$/,'')+',':'Dear Team,';
let reminderLang='en';
const reminderText=(n,lang=reminderLang)=>lang==='ko'?
[String(n||'담당자')+'님,','',
'기존 HDPS KPI 메일 발송 후 7일이 지났으나 회신 결과가 업로드되지 않았습니다. 회신 파일을 업로드하고 본 메일에 회신해 주시기 바랍니다.','',
'Lean 성과지표의 일상관리는 목표 설정과 실적 확인에 그치지 않습니다. 단기·중장기 추세를 관리하고, 현업 및 현장 팀이 그에 맞춰 대응하는 활동까지 포함합니다.','',
'각 사업장에서 이를 일상적으로 자체 관리해야 함을 인지하시고, 조치 현황과 함께 회신 바랍니다.','',
'감사합니다.','서지철 드림'].join('\n'):
[greeting(n),'',
'Seven days have passed since our HDPS KPI email, but your response has not been uploaded. Please upload the completed response and reply to this email.','',
'Daily Lean KPI management goes beyond setting targets and tracking results. It requires short- and long-term trend reviews and corresponding actions by operational and shop-floor teams.','',
'Each plant must manage these activities as part of its daily operations. Please confirm your understanding and share your action status in your reply.','',
'Best Regards,','Mr.Seoh'].join('\n');
const reminderSubject=(p,lang=reminderLang)=>lang==='ko'?'[HDPS KPI] D+7 미회신 안내 및 Lean 성과지표 일상관리 회신 요청 - '+(p==='india'?'인도':p==='brazil'?'브라질':p==='ulsan'?'울산':'사업장'):'[HDPS KPI] D+7 Reminder: Reply & Daily Lean KPI Management - '+(p==='india'?'India':p==='brazil'?'Brazil':p==='ulsan'?'Ulsan':'Plant');
const status=s=>{const el=document.getElementById('hd24SevenDayStatus');if(el)el.textContent=s};
function pending(now=Date.now()){
 const mails=read(MAIL_KEY),replies=read(REPLY_KEY),seen=new Set(),out=[];
 for(const m of mails){
  if(m.status!=='sent'||!m.sentAt||!m.to||!['ulsan','india','brazil'].includes(m.plant))continue;
  const sent=Date.parse(m.sentAt);if(!Number.isFinite(sent)||now-sent<DELAY)continue;
  const batch=mails.filter(x=>x.status==='sent'&&x.plant===m.plant&&x.sentAt===m.sentAt&&x.to===m.to);
  const batchKey=[...new Set(batch.map(x=>[Number(x.targetYear)||2026,Number(x.targetMonth)||0,norm(x.kpiEn||x.kpi)].join(':')).filter(Boolean))].sort().join(',');
  const id=[m.plant,m.sentAt,m.to.toLowerCase(),batchKey].join('|');if(seen.has(id))continue;seen.add(id);
  const unanswered=batch.filter(x=>!replies.some(r=>r.plant===x.plant&&(Number(r.targetYear)||2026)===(Number(x.targetYear)||2026)&&Number(r.targetMonth)===Number(x.targetMonth)&&sameKpi(r,x)&&Date.parse(r.replyReceivedAt)>=sent)),answered=unanswered.length===0;
  const unansweredKey=[...new Set(unanswered.map(x=>[Number(x.targetYear)||2026,Number(x.targetMonth)||0,norm(x.kpiEn||x.kpi)].join(':')))].sort().join(','),reminderId=id+'|unanswered:'+unansweredKey;
  const reminded=mails.some(x=>x.status==='seven-day-reminder-sent'&&x.originalMailId===id&&(!x.unansweredKey||x.unansweredKey===unansweredKey));
  if(!answered&&!reminded)out.push({id,reminderId,unansweredKey,mail:m,batch:unanswered,originalBatch:batch});
 }
 return out;
}
function render(){
 const el=document.getElementById('hd24ReminderMailList');if(!el)return;
 const p=plant(),items=pending().filter(x=>x.mail.plant===p);
 const history=read(MAIL_KEY),sent=history.filter(x=>x.plant===p&&x.status==='seven-day-reminder-sent'),failed=history.filter(x=>x.plant===p&&x.status==='seven-day-reminder-failed');
 const escape=s=>String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
 const current=items[0]?.mail;
 const name=current?.recipientName||document.getElementById('mailToName')?.value.trim()||'';
 const to=current?.to||document.getElementById('mailTo')?.value.trim()||'';
 const cc=required(p,current?.cc||document.getElementById('mailCc')?.value||'');
 const subject=reminderSubject(p);
 const body=reminderText(name);
 const preview='<section id="hd24ReminderPreview" style="border:1px solid #cad7e4;border-radius:8px;padding:16px;margin:14px 0;background:#fff">'+
 '<div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap"><h3 style="margin:0 0 12px">리마인드 메일 미리보기</h3><div style="display:flex;gap:6px"><button type="button" id="hd24ReminderKo" aria-pressed="'+(reminderLang==='ko')+'" style="padding:7px 14px;'+(reminderLang==='ko'?'background:#23547b;color:white;':'')+'">한글</button><button type="button" id="hd24ReminderEn" aria-pressed="'+(reminderLang==='en')+'" style="padding:7px 14px;'+(reminderLang==='en'?'background:#23547b;color:white;':'')+'">English</button></div></div>'+
 (current?'':'<p style="color:#7a5614;background:#fff8e7;padding:9px;border-radius:5px">현재 D+7 발송 대상이 없어 예시 본문을 표시합니다. 자동 발송되지 않습니다.</p>')+
 '<div style="margin:6px 0"><b>To:</b> '+escape(to||'(대상 발생 시 자동 반영)')+'</div>'+
 '<div style="margin:6px 0"><b>CC:</b> '+escape(cc)+'</div>'+
 '<div style="margin:6px 0"><b>Subject:</b> '+escape(subject)+'</div>'+
 '<div style="margin:14px 0 4px"><b>Body</b></div>'+
 '<div id="hd24ReminderPreviewBody" style="white-space:pre-wrap;line-height:1.65;background:#f7f9fc;border-radius:6px;padding:16px;overflow-wrap:anywhere">'+escape(body)+'</div></section>';
 el.innerHTML=preview+
 '<div style="display:flex;gap:12px;flex-wrap:wrap;margin:12px 0"><strong>미회신 D+7: '+items.length+'건</strong><span>재안내 발송완료: '+sent.length+'건</span></div>'+
 (items.length?items.map(x=>'<div style="padding:12px;margin:8px 0;border:1px solid #d3dce5;border-radius:8px"><b>'+escape(x.mail.to)+'</b><div>최초 발송: '+new Date(x.mail.sentAt).toLocaleString()+' · 미회신 KPI '+x.batch.length+'건</div><div style="color:#a14b00">D+7 경과 · 회신 결과 미업로드</div></div>').join(''):'<p>현재 미회신 D+7 대상이 없습니다.</p>')+
 (items.length?'<div style="margin:12px 0"><button type="button" id="hd24ReminderSend">D+7 리마인드 발송</button></div>':'')+
 (sent.length||failed.length?'<h4>리마인드 발송 이력</h4>'+[...sent.map(x=>({...x,_ok:true,_time:x.sentAt})),...failed.map(x=>({...x,_ok:false,_time:x.failedAt}))].sort((a,b)=>String(b._time||'').localeCompare(String(a._time||''))).slice(0,10).map(x=>'<div style="padding:6px 0;border-bottom:1px solid #e5e7eb"><b>'+(x._ok?'발송 성공':'발송 실패')+'</b> · '+escape(x.to)+' · '+new Date(x._time).toLocaleString()+(x.error?' · '+escape(x.error):'')+'</div>').join(''):'');
 document.getElementById('hd24ReminderKo')?.addEventListener('click',()=>{reminderLang='ko';render()});
 document.getElementById('hd24ReminderEn')?.addEventListener('click',()=>{reminderLang='en';render()});
 document.getElementById('hd24ReminderSend')?.addEventListener('click',async e=>{const b=e.currentTarget;if(b.disabled)return;b.disabled=true;const old=b.textContent;b.textContent='발송 중...';try{await sendDue()}finally{b.disabled=false;b.textContent=old}});
}
let busy=false;
async function check(){
 if(busy)return;const p=plant(),due=pending().filter(x=>x.mail.plant===p);if(!due.length){status('7일 미회신 재안내 대상 없음');render();return}
 status('7일 미회신 '+due.length+'건 · 리마인드 탭에서 확인 후 수동 발송');render();
}
async function sendDue(){
 if(busy)return;const p=plant(),due=pending().filter(x=>x.mail.plant===p);if(!due.length){status('7일 미회신 재안내 대상 없음');render();return}
 const endpoint=String(window.HD24_MAIL_ENDPOINT||localStorage.getItem(ENDPOINT_KEY)||'').trim();
 if(!endpoint){status('7일 미회신 '+due.length+'건: 메일 API 미설정. API 설정 후 발송 버튼을 눌러주세요.');render();return}
 busy=true;
 try{
  for(const item of due){
   const m=item.mail,lock='hd24_7day_lock_'+(item.reminderId||item.id),now=Date.now(),previous=Number(localStorage.getItem(lock)||0);
   if(previous&&now-previous<15*60*1000)continue;
   localStorage.setItem(lock,String(now));
   try{
    if(!pending().some(x=>x.id===item.id)){localStorage.removeItem(lock);continue}
    const cc=required(m.plant,m.cc),body=reminderText(m.recipientName),subject=reminderSubject(m.plant),unansweredKpis=item.batch.map(x=>({targetYear:Number(x.targetYear)||2026,targetMonth:Number(x.targetMonth)||0,kpi:x.kpi||'',kpiEn:x.kpiEn||''}));
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),30000);let res;
    try{res=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({to:m.to,cc,subject,body,bodyHtml:'<html><body style="font-family:Arial,sans-serif;white-space:pre-line">'+body.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')+'</body></html>',plant:m.plant,reminder:true,originalSentAt:m.sentAt,originalMailId:item.id,unansweredKey:item.unansweredKey||'',language:reminderLang,unansweredKpis}),signal:controller.signal})}
    catch(err){if(err?.name==='AbortError')throw new Error('메일 API 응답 시간초과(30초)');throw new Error('메일 API 연결 실패: '+(err?.message||err))}
    finally{clearTimeout(timer)}
    let responseText='';try{responseText=await res.text()}catch(_){}
    if(!res.ok)throw new Error('HTTP '+res.status+(responseText?' · '+responseText.slice(0,180):''));
    let responseJson=null;try{responseJson=responseText?JSON.parse(responseText):null}catch(_){}
    if(responseJson&&responseJson.success===false)throw new Error('메일 API 발송 거부: '+(responseJson.error||responseJson.message||'success=false'));
    const history=read(MAIL_KEY);history.unshift({plant:m.plant,status:'seven-day-reminder-sent',to:m.to,cc,recipientName:m.recipientName||'',targetYear:Number(m.targetYear)||2026,targetMonth:m.targetMonth||'',kpi:m.kpi||'',kpiEn:m.kpiEn||'',originalSentAt:m.sentAt,originalMailId:item.id,language:reminderLang,unansweredKpis,sentAt:new Date().toISOString()});localStorage.setItem(MAIL_KEY,JSON.stringify(history.slice(0,3000)));
    localStorage.removeItem(lock);status('7일 미회신 재안내 발송 완료: '+m.to);
   }catch(e){localStorage.removeItem(lock);const history=read(MAIL_KEY);history.unshift({plant:m.plant,status:'seven-day-reminder-failed',to:m.to,cc:required(m.plant,m.cc),recipientName:m.recipientName||'',targetYear:Number(m.targetYear)||2026,targetMonth:m.targetMonth||'',kpi:m.kpi||'',kpiEn:m.kpiEn||'',originalSentAt:m.sentAt,originalMailId:item.id,language:reminderLang,unansweredKpis,failedAt:new Date().toISOString(),error:String(e.message||e)});localStorage.setItem(MAIL_KEY,JSON.stringify(history.slice(0,3000)));status('7일 재안내 발송 실패: '+String(e.message||e));}
  }
 }finally{busy=false;render()}
}
function init(){
 if(window.__HD24_SEVEN_DAY_REMINDER_WIRED__)return;
 window.__HD24_SEVEN_DAY_REMINDER_WIRED__=true;
 const panel=document.getElementById('hd24ReminderMailContent')||document.getElementById('hd24FollowupPanel');if(panel&&!document.getElementById('hd24SevenDayStatus')){const el=document.createElement('div');el.id='hd24SevenDayStatus';el.style.cssText='padding:8px 12px;margin:8px 0;border:1px solid #cbd5e1;border-radius:6px;font-size:13px';el.textContent='7일 미회신 재안내 확인 중';panel.appendChild(el)}
 render();check();
 document.getElementById('plantSelect')?.addEventListener('change',()=>setTimeout(check,200));
 document.getElementById('hd24ReplyFile')?.addEventListener('change',()=>setTimeout(check,3000));
 ['mailTo','mailToName','mailCc'].forEach(id=>document.getElementById(id)?.addEventListener('input',render));
}
window.hd24SevenDayReminder={pending,check,sendDue,render,reminderText,required};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();