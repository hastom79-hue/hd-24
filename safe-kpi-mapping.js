(()=>{
  'use strict';
  const SAFE_SCORE=0.82;
  const EXACT_SCORE=0.96;

  function safeFindSourceRow(ws,m){
    const b=sheetBounds(ws); let best={row:0,score:0};
    const wanted=normText(m.kpiEn||'');
    for(let r=1;r<=b.maxR;r++){
      const t=normText(rowText(ws,r,Math.min(b.maxC,17)));
      if(!t)continue;
      let s=similarity(t,wanted);
      if(wanted && t.includes(wanted)) s=Math.max(s,EXACT_SCORE);
      if(s>best.score)best={row:r,score:s};
    }
    return best;
  }

  function safeFindMasterRow(ws,m){
    const b=sheetBounds(ws); let best={row:0,score:0};
    const wanted=normText(m.kpiKr||'');
    for(let r=1;r<=b.maxR;r++){
      const t=normText(rowText(ws,r,Math.min(b.maxC,26)));
      if(!t)continue;
      let s=Math.max(similarity(t,wanted),similarity(t,coreText(wanted)));
      if(wanted && t.includes(wanted)) s=Math.max(s,EXACT_SCORE);
      if(s>best.score)best={row:r,score:s};
    }
    return best;
  }

  function findActualRow(ws,labelRow,m){
    const expectedDelta=Math.max(1,(m.actualRow||labelRow+1)-(m.labelRow||labelRow));
    const start=Math.max(labelRow+1,labelRow+expectedDelta-2);
    const end=Math.min(sheetBounds(ws).maxR,labelRow+expectedDelta+2);
    let best={row:0,score:-1};
    for(let r=start;r<=end;r++){
      const label=normText(getCell(ws,r,6));
      if(label)continue;
      let numeric=0,filled=0;
      for(let c=cfg().srcMonthStartCol;c<cfg().srcMonthStartCol+12;c++){
        const v=getCell(ws,r,c);
        if(v!==null&&v!==undefined&&String(v).trim()!==''){filled++;if(typeof v==='number'&&Number.isFinite(v))numeric++;}
      }
      const proximity=Math.max(0,3-Math.abs((labelRow+expectedDelta)-r));
      const score=numeric*3+filled+proximity;
      if(score>best.score)best={row:r,score};
    }
    return best.row;
  }

  window.hd24SafeResolveMappings=function(srcWs,masterWs){
    let movedSrc=0,movedMaster=0; const rejected=[]; const out=[];
    for(const m of mappingData){
      const sr=safeFindSourceRow(srcWs,m);
      const mr=safeFindMasterRow(masterWs,m);
      if(sr.score<SAFE_SCORE||mr.score<SAFE_SCORE){
        rejected.push(`${m.kpiKr||m.kpiEn} (원본 ${sr.score.toFixed(2)} / 총괄 ${mr.score.toFixed(2)})`);
        continue;
      }
      const actualRow=findActualRow(srcWs,sr.row,m);
      if(!actualRow){rejected.push(`${m.kpiKr||m.kpiEn} (Actual 행 확인 실패)`);continue;}
      if(sr.row!==m.labelRow)movedSrc++;
      if(mr.row!==m.masterRow)movedMaster++;
      out.push({...m,labelRow:sr.row,actualRow,masterRow:mr.row,_srcScore:sr.score,_masterScore:mr.score});
    }
    log(`안전 매핑 검증: 반영 ${out.length}건 / 제외 ${rejected.length}건 / 원본행 보정 ${movedSrc}건 / 총괄행 보정 ${movedMaster}건`);
    if(rejected.length)log(`반영 제외(오매핑 방지): ${rejected.slice(0,12).join(' | ')}${rejected.length>12?' 외 '+(rejected.length-12)+'건':''}`);
    return out;
  };

  // Existing reflection/judgement paths call resolveMappings. Replace only the resolver;
  // uncertain mappings are filtered out instead of falling back to fixed row numbers.
  try{resolveMappings=window.hd24SafeResolveMappings;}catch(e){console.error('HD24 safe mapping guard install failed',e);}
})();
