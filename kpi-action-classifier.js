(()=>{
'use strict';

const EPS=1e-9;

function finite(v){
  if(v===null||v===undefined||v==='') return null;
  const n=Number(v);
  return Number.isFinite(n)?n:null;
}

function dirToken(direction){
  const s=String(direction||'').toLowerCase().replace(/\s+/g,'');
  if(['하향','lower','down','min','smaller','낮을수록좋음','낮음'].some(x=>s.includes(x))) return 'lower';
  if(['상향','higher','up','max','greater','높을수록좋음','높음'].some(x=>s.includes(x))) return 'higher';
  return '';
}

function isMiss(actual,target,direction){
  const a=finite(actual),t=finite(target),d=dirToken(direction);
  if(a===null||t===null||!d) return false;
  return d==='higher' ? a<t-EPS : a>t+EPS;
}

function worsened(prev,current,direction){
  const p=finite(prev),c=finite(current),d=dirToken(direction);
  if(p===null||c===null||!d) return false;
  return d==='higher' ? c<p-EPS : c>p+EPS;
}

function consecutiveWorsening(values,direction){
  const clean=(values||[]).map(finite);
  if(!clean.length||clean[clean.length-1]===null) return 0;
  let months=0;
  for(let i=clean.length-1;i>0;i--){
    if(clean[i]===null||clean[i-1]===null) break;
    if(worsened(clean[i-1],clean[i],direction)) months++;
    else break;
  }
  return months ? months+1 : 0;
}

function classifyKpi({values=[],target=null,direction='',targetComparable=true}){
  const clean=(values||[]).map(finite);
  const actual=clean.length?clean[clean.length-1]:null;
  const hasCurrentActual=actual!==null;
  const miss=hasCurrentActual&&targetComparable!==false ? isMiss(actual,target,direction) : false;
  const streak=hasCurrentActual ? consecutiveWorsening(clean,direction) : 0;

  let trend='normal';
  let severity=0;
  if(streak>=6){ trend='worsening_6m_plus'; severity=4; }
  else if(streak>=3){ trend='worsening_3m_plus'; severity=3; }
  else if(streak===2){ trend='temporary_worsening'; severity=1; }

  if(miss) severity=Math.max(severity,2);

  const labels=[];
  if(miss) labels.push('당월 목표미달');
  if(trend==='worsening_6m_plus') labels.push('6개월 이상 장기 지속 악화');
  else if(trend==='worsening_3m_plus') labels.push('3개월 이상 지속 악화');
  else if(trend==='temporary_worsening') labels.push('일시적 악화');

  return {
    actual,
    target:finite(target),
    direction:dirToken(direction),
    hasCurrentActual,
    targetComparable:targetComparable!==false,
    missedTarget:miss,
    worseningMonths:streak,
    trend,
    severity,
    label:labels.length?labels.join(' + '):'정상/개선'
  };
}

function visualToken(result){
  const r=result||{};
  if(r.trend==='worsening_6m_plus') return {key:'critical-long',fill:'F4CCCC',font:'9C0006'};
  if(r.trend==='worsening_3m_plus') return {key:'warning-long',fill:'FCE5CD',font:'B45F06'};
  if(r.missedTarget) return {key:'miss',fill:'F4CCCC',font:'9C0006'};
  if(r.trend==='temporary_worsening') return {key:'watch',fill:'FFF2CC',font:'7F6000'};
  return {key:'normal',fill:null,font:null};
}

function actionPrompt(result){
  if(!result||result.label==='정상/개선') return '';
  return '미달사유 :\n근본원인 :\n만회계획 :\n완료예정일 :\n차월 예상실적 :';
}

const api={finite,dirToken,isMiss,worsened,consecutiveWorsening,classifyKpi,visualToken,actionPrompt};
if(typeof window!=='undefined') window.hd24KpiActionClassifier=api;
if(typeof module!=='undefined'&&module.exports) module.exports=api;
})();
