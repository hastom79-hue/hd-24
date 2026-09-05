(()=>{
  'use strict';
  const SAFE_SCORE=0.86;
  const EXACT_SCORE=0.995;

  function findStrictInColumn(ws,col,wantedRaw){
    const wanted=normText(wantedRaw||'');
    const b=sheetBounds(ws),hits=[];
    if(!wanted)return {row:0,score:0,ambiguous:true};
    for(let r=1;r<=b.maxR;r++){
      const text=normText(getCell(ws,r,col));
      if(!text)continue;
      let score=0;
      if(text===wanted)score=EXACT_SCORE;
      else if(text.includes(wanted)||wanted.includes(text)){
        const ratio=Math.min(text.length,wanted.length)/Math.max(text.length,wanted.length);
        score=0.88+0.10*ratio;
      }else score=similarity(text,wanted);
      if(score>=0.70)hits.push({row:r,score,text});
    }
    hits.sort((a,b)=>b.score-a.score||a.row-b.row);
    if(!hits.length)return {row:0,score:0,ambiguous:true};
    const top=hits[0],second=hits[1];
    const ambiguous=!!(second&&top.score<EXACT_SCORE&&Math.abs(top.score-second.score)<0.04);
    return {...top,ambiguous};
  }

  function parseMonth(v){
    if(v===null||v===undefined)return null;
    if(v instanceof Date)return v.getUTCMonth()+1;
    const s=String(v).trim();
    let m=s.match(/(?:^|\D)(1[0-2]|[1-9])\s*월/); if(m)return Number(m[1]);
    const names={jan:1,feb:2,mar:3,apr:4,may:5,jun:6,jul:7,aug:8,sep:9,sept:9,oct:10,nov:11,dec:12,dez:12};
    const low=s.toLowerCase();
    for(const [k,n] of Object.entries(names))if(low.includes(k))return n;
    return null;
  }

  function discoverMonthCols(ws,preferredRow){
    const b=sheetBounds(ws),rows=[];
    if(preferredRow)rows.push(preferredRow);
    for(let r=1;r<=Math.min(25,b.maxR);r++)if(!rows.includes(r))rows.push(r);
    let best={count:0,map:{},row:0,duplicates:[]};
    for(const r of rows){
      const map={},duplicates=[];
      for(let c=1;c<=b.maxC;c++){
        const mo=parseMonth(getCell(ws,r,c));
        if(!mo)continue;
        if(map[mo])duplicates.push(mo); else map[mo]=c;
      }
      const count=Object.keys(map).length;
      if(count>best.count)best={count,map,row:r,duplicates};
      if(count===12&&!duplicates.length)return {count,map,row:r,duplicates};
    }
    return best;
  }

  function strictMonthCols(ws,preferredRow,label){
    const info=discoverMonthCols(ws,preferredRow);
    if(info.count!==12||info.duplicates.length){
      throw new Error(`${label} 월 헤더 검증 실패: ${info.count}/12개월 인식${info.duplicates.length?' / 중복 '+info.duplicates.join(','):''}`);
    }
    return info;
  }

  function findActualRow(ws,labelRow,m){
    const b=sheetBounds(ws),direct=labelRow+1;
    if(direct<=b.maxR&&normText(getCell(ws,direct,6))==='')return direct;
    const expectedDelta=Math.max(1,(m.actualRow||labelRow+1)-(m.labelRow||labelRow));
    const expected=labelRow+expectedDelta;
    for(let d=0;d<=2;d++){
      for(const r of [expected-d,expected+d]){
        if(r>labelRow&&r<=b.maxR&&normText(getCell(ws,r,6))==='')return r;
      }
    }
    return 0;
  }

  window.hd24SafeResolveMappings=function(srcWs,masterWs){
    let movedSrc=0,movedMaster=0;
    const rejected=[],out=[],usedMaster=new Set();
    for(const m of mappingData){
      const sr=findStrictInColumn(srcWs,6,m.kpiEn);
      const mr=findStrictInColumn(masterWs,13,m.kpiKr);
      if(sr.ambiguous||mr.ambiguous||sr.score<SAFE_SCORE||mr.score<SAFE_SCORE){
        rejected.push(`${m.kpiKr||m.kpiEn} (원본 ${sr.score.toFixed(2)} / 총괄 ${mr.score.toFixed(2)}${sr.ambiguous||mr.ambiguous?' / 중복후보':''})`);
        continue;
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
    const rowNo=Number(ref.match(/\d+$/)[0]),targetCol=colNo(ref);
    const rowRe=new RegExp('<row([^>]*\\br="'+rowNo+'"[^>]*)>([\\s\\S]*?)</row>');
    const rm=rowRe.exec(xml); if(!rm)return {xml,ok:false};
    const body=rm[2],cells=[...body.matchAll(/<c r="([A-Z]+\d+)"([^>]*)/g)];
    let style='',nearest=null;
    for(const cm of cells){const c=colNo(cm[1]),dist=Math.abs(c-targetCol);if(!nearest||dist<nearest.dist)nearest={dist,attrs:cm[2]||''};}
    if(nearest){const sm=nearest.attrs.match(/\s+s="([^"]+)"/);if(sm)style=' s="'+sm[1]+'"';}
    const newCell='<c r="'+ref+'"'+style+'><v>'+fmtVal(val)+'</v></c>';
    let insertAt=body.length;
    for(const cm of cells){if(colNo(cm[1])>targetCol){insertAt=cm.index;break;}}
    const newBody=body.slice(0,insertAt)+newCell+body.slice(insertAt);
    const newRow='<row'+rm[1]+'>'+newBody+'</row>';
    return {xml:xml.slice(0,rm.index)+newRow+xml.slice(rm.index+rm[0].length),ok:true};
  }

  async function safeReflect(ev){
    try{
      if(!cfg().hasSource)return;
      ev.preventDefault();ev.stopImmediatePropagation();
      log('=== 안전 실적 반영 시작 ===');
      const srcWs=srcWorkbook.Sheets[cfg().srcSheet],masterWs=masterWorkbook.Sheets[cfg().masterSheet];
      if(!srcWs)throw new Error('원본 시트 없음: '+cfg().srcSheet);
      if(!masterWs)throw new Error('총괄 시트 없음: '+cfg().masterSheet);
      const srcInfo=strictMonthCols(srcWs,typeof SRC_MONTH_HEADER_ROW!=='undefined'?SRC_MONTH_HEADER_ROW:null,'원본');
      const masterInfo=strictMonthCols(masterWs,4,'총괄');
      const resolved=window.hd24SafeResolveMappings(srcWs,masterWs);
      if(!resolved.length)throw new Error('안전하게 확인된 KPI 매핑이 없습니다.');
      log(`월 헤더 검증: 원본 ${srcInfo.row}행 12개월 / 총괄 ${masterInfo.row}행 12개월`);

      const patches={},skippedBlank=0,skippedText=0;
      for(const m of resolved){
        for(let mo=1;mo<=12;mo++){
          const raw=getCell(srcWs,m.actualRow,srcInfo.map[mo]);
          if(raw===null||raw===undefined||String(raw).trim()===''){skippedBlank++;continue;}
          const v=normalizeValue(raw);
          if(v===null){skippedText++;continue;}
          const ref=colLetter(masterInfo.map[mo])+m.masterRow;
          patches[ref]=v*(m.scale||1);
        }
      }
      log(`반영 후보 셀 ${Object.keys(patches).length}개 / 원본 공란 제외 ${skippedBlank}개 / 비수치 제외 ${skippedText}개`);

      const path=await findSheetXmlPath(masterZip,cfg().masterSheet);
      let xml=await masterZip.file(path).async('string'),applied=0,missing=[];
      for(const [ref,v] of Object.entries(patches)){
        const r=safeReplaceCell(xml,ref,v);xml=r.xml;
        if(r.ok)applied++;else missing.push(ref);
      }
      if(missing.length)throw new Error('총괄 대상 셀 생성/수정 실패: '+missing.slice(0,12).join(', '));
      masterZip.file(path,xml);
      log(`적용 ${applied}개 / 오류 0개`);

      const blob=await masterZip.generateAsync({type:'blob',compression:'DEFLATE'});
      const ext=(masterFileName.match(/\.(xlsx|xlsm)$/i)||['','.xlsx'])[1];
      const base=masterFileName.replace(/\.(xlsx|xlsm)$/i,'');
      const a=document.createElement('a');
      a.href=URL.createObjectURL(blob);a.download=base+'_'+cfg().label+'안전반영본.'+ext;a.click();
      setTimeout(()=>URL.revokeObjectURL(a.href),30000);
      log('=== 완료: '+a.download+' ===');
      addHistory({action:'실적 반영',plantKey:currentPlant,srcName:(document.getElementById('srcFile').files[0]||{}).name||'',masterName:masterFileName,result:applied+'셀 안전반영'});
    }catch(err){log('오류: '+err.message);console.error(err);}
  }

  try{
    resolveMappings=window.hd24SafeResolveMappings;
    buildMonthCols=(ws,startCol,headerRow)=>strictMonthCols(ws,headerRow,'월').map;
    replaceCell=safeReplaceCell;
    const btn=document.getElementById('btnReflect');if(btn)btn.addEventListener('click',safeReflect,true);
    log('안전 매핑 보호모드 v4 활성화');
  }catch(e){console.error('HD24 safe mapping guard install failed',e);}
})();
