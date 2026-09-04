(()=>{
  'use strict';
  const SAFE_SCORE=0.84;
  const EXACT_SCORE=0.98;

  function safeFindSourceRow(ws,m){
    const b=sheetBounds(ws); let best={row:0,score:0};
    const wanted=normText(m.kpiEn||'');
    for(let r=1;r<=b.maxR;r++){
      const t=normText(rowText(ws,r,Math.min(b.maxC,17)));
      if(!t)continue;
      let s=similarity(t,wanted);
      if(wanted && (t===wanted || t.includes(wanted))) s=Math.max(s,EXACT_SCORE);
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
      if(wanted && (t===wanted || t.includes(wanted))) s=Math.max(s,EXACT_SCORE);
      if(s>best.score)best={row:r,score:s};
    }
    return best;
  }

  function hasMonthData(ws,row){
    let filled=0;
    for(let c=cfg().srcMonthStartCol;c<cfg().srcMonthStartCol+12;c++){
      const v=getCell(ws,row,c);
      if(v!==null&&v!==undefined&&String(v).trim()!=='')filled++;
    }
    return filled>0;
  }

  function findActualRow(ws,labelRow,m){
    // HCEI/HCEB templates use the row directly below each KPI label as Actual.
    // Prefer that structural relationship and only search nearby when the row is truly empty.
    const direct=labelRow+1;
    if(direct<=sheetBounds(ws).maxR && hasMonthData(ws,direct)) return direct;
    const expectedDelta=Math.max(1,(m.actualRow||labelRow+1)-(m.labelRow||labelRow));
    const expected=labelRow+expectedDelta;
    const start=Math.max(labelRow+1,expected-2), end=Math.min(sheetBounds(ws).maxR,expected+2);
    let best={row:0,score:-1};
    for(let r=start;r<=end;r++){
      if(!hasMonthData(ws,r))continue;
      const label=normText(getCell(ws,r,6));
      if(label)continue;
      let filled=0;
      for(let c=cfg().srcMonthStartCol;c<cfg().srcMonthStartCol+12;c++){
        const v=getCell(ws,r,c); if(v!==null&&v!==undefined&&String(v).trim()!=='')filled++;
      }
      const score=filled*3-Math.abs(expected-r);
      if(score>best.score)best={row:r,score};
    }
    return best.row;
  }

  window.hd24SafeResolveMappings=function(srcWs,masterWs){
    let movedSrc=0,movedMaster=0; const rejected=[],out=[],usedMaster=new Set();
    for(const m of mappingData){
      const sr=safeFindSourceRow(srcWs,m), mr=safeFindMasterRow(masterWs,m);
      if(sr.score<SAFE_SCORE||mr.score<SAFE_SCORE){
        rejected.push(`${m.kpiKr||m.kpiEn} (원본 ${sr.score.toFixed(2)} / 총괄 ${mr.score.toFixed(2)})`); continue;
      }
      const actualRow=findActualRow(srcWs,sr.row,m);
      if(!actualRow){rejected.push(`${m.kpiKr||m.kpiEn} (Actual 행 확인 실패)`);continue;}
      if(usedMaster.has(mr.row)){rejected.push(`${m.kpiKr||m.kpiEn} (총괄 KPI 행 중복 ${mr.row})`);continue;}
      usedMaster.add(mr.row);
      if(sr.row!==m.labelRow)movedSrc++;
      if(mr.row!==m.masterRow)movedMaster++;
      out.push({...m,labelRow:sr.row,actualRow,masterRow:mr.row,_srcScore:sr.score,_masterScore:mr.score});
    }
    log(`안전 매핑 검증: 반영 ${out.length}건 / 제외 ${rejected.length}건 / 원본행 보정 ${movedSrc}건 / 총괄행 보정 ${movedMaster}건`);
    if(rejected.length)log(`반영 제외(오매핑 방지): ${rejected.slice(0,12).join(' | ')}${rejected.length>12?' 외 '+(rejected.length-12)+'건':''}`);
    return out;
  };

  function colNo(ref){let n=0;for(const ch of ref.match(/^[A-Z]+/)[0])n=n*26+ch.charCodeAt(0)-64;return n;}
  function safeReplaceCell(xml,ref,val){
    const re=new RegExp('<c r="'+ref+'"([^>]*?)(?:/>|>([\\s\\S]*?)</c>)');
    const m=re.exec(xml);
    if(m){
      let attrs=(m[1]||'').replace(/\s+t="[^"]*"/g,'');
      const cell='<c r="'+ref+'"'+attrs+'><v>'+fmtVal(val)+'</v></c>';
      return {xml:xml.slice(0,m.index)+cell+xml.slice(m.index+m[0].length),ok:true};
    }
    // Blank formatted month cells can be omitted from worksheet XML. Insert a new cell into
    // the existing row, copying the nearest month's style so the workbook layout is preserved.
    const rowNo=Number(ref.match(/\d+$/)[0]), targetCol=colNo(ref);
    const rowRe=new RegExp('<row([^>]*\\br="'+rowNo+'"[^>]*)>([\\s\\S]*?)</row>');
    const rm=rowRe.exec(xml); if(!rm)return {xml,ok:false};
    const body=rm[2]; let style='';
    const cells=[...body.matchAll(/<c r="([A-Z]+\d+)"([^>]*)/g)];
    let nearest=null;
    for(const cm of cells){const c=colNo(cm[1]);const dist=Math.abs(c-targetCol);if(!nearest||dist<nearest.dist)nearest={dist,attrs:cm[2]||''};}
    if(nearest){const sm=nearest.attrs.match(/\s+s="([^"]+)"/);if(sm)style=' s="'+sm[1]+'"';}
    const newCell='<c r="'+ref+'"'+style+'><v>'+fmtVal(val)+'</v></c>';
    let insertAt=body.length;
    for(const cm of cells){if(colNo(cm[1])>targetCol){insertAt=cm.index;break;}}
    const newBody=body.slice(0,insertAt)+newCell+body.slice(insertAt);
    const newRow='<row'+rm[1]+'>'+newBody+'</row>';
    return {xml:xml.slice(0,rm.index)+newRow+xml.slice(rm.index+rm[0].length),ok:true};
  }

  try{resolveMappings=window.hd24SafeResolveMappings;replaceCell=safeReplaceCell;log('안전 매핑 보호모드 활성화');}
  catch(e){console.error('HD24 safe mapping guard install failed',e);}
})();
