(()=>{
  'use strict';
  const SAFE_SCORE=0.90, EXACT_SCORE=0.995, EPS=1e-9;

  function sourceKpiCol(){
    if(currentPlant==='india') return 7;   // Final With HQ Suggestion: G열 KPI명
    if(currentPlant==='brazil') return 6;  // HCEB KPIs: F열 KPI명
    return 6;
  }
  function sourceUnitCol(){
    if(currentPlant==='india') return 9;   // I열
    if(currentPlant==='brazil') return 10; // J열
    return 0;
  }

  function runtimeMappings(){
    const list=[...mappingData];
    const has=(en)=>list.some(m=>normText(m.kpiEn)===normText(en));
    if(currentPlant==='india' && !has('Manufacturing Lead Time (Fab Tacking to FDI out)')){
      list.push({labelRow:94,actualRow:95,kpiEn:'Manufacturing Lead Time (Fab Tacking to FDI out)',direction:'하향',masterRow:42,kpiKr:'제조 리드타임(Fab.to Machine Stock)',scale:1,valueFormat:'숫자',unit:'일'});
    }
    if(currentPlant==='brazil' && !has('IQ 200 Issues with Production responsibility (Assembly)')){
      list.push({labelRow:62,actualRow:63,kpiEn:'IQ 200 Issues with Production responsibility (Assembly)',direction:'하향',masterRow:34,kpiKr:'IQ200(생산귀책)',scale:1,valueFormat:'숫자',unit:'DPTU'});
    }
    return list;
  }

  function findStrictInColumn(ws,col,wantedRaw){
    const wanted=normText(wantedRaw||''),b=sheetBounds(ws),hits=[];
    if(!wanted)return {row:0,score:0,ambiguous:true};
    for(let r=1;r<=b.maxR;r++){
      const text=normText(getCell(ws,r,col)); if(!text)continue;
      let score=0;
      if(text===wanted)score=EXACT_SCORE;
      else if(text.includes(wanted)||wanted.includes(text)){
        const ratio=Math.min(text.length,wanted.length)/Math.max(text.length,wanted.length);
        score=0.90+0.08*ratio;
      }else score=similarity(text,wanted);
      if(score>=0.75)hits.push({row:r,score,text});
    }
    hits.sort((a,b)=>b.score-a.score||a.row-b.row);
    if(!hits.length)return {row:0,score:0,ambiguous:true};
    const top=hits[0],second=hits[1];
    return {...top,ambiguous:!!(second&&top.score<EXACT_SCORE&&Math.abs(top.score-second.score)<0.05)};
  }

  function parseMonth(v){
    if(v===null||v===undefined)return null;
    if(v instanceof Date)return v.getUTCMonth()+1;
    const s=String(v).trim();
    let m=s.match(/(?:^|\D)(1[0-2]|[1-9])\s*월/); if(m)return Number(m[1]);
    const names={jan:1,feb:2,mar:3,apr:4,may:5,jun:6,jul:7,aug:8,sep:9,sept:9,oct:10,nov:11,dec:12,dez:12};
    const low=s.toLowerCase(); for(const [k,n] of Object.entries(names))if(low.includes(k))return n;
    return null;
  }

  function discoverMonthCols(ws,preferredRow){
    const b=sheetBounds(ws),rows=[]; if(preferredRow)rows.push(preferredRow);
    for(let r=1;r<=Math.min(25,b.maxR);r++)if(!rows.includes(r))rows.push(r);
    let best={count:0,map:{},row:0,duplicates:[]};
    for(const r of rows){
      const map={},duplicates=[];
      for(let c=1;c<=b.maxC;c++){
        const mo=parseMonth(getCell(ws,r,c)); if(!mo)continue;
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
    if(info.count!==12||info.duplicates.length)throw new Error(`${label} 월 헤더 검증 실패: ${info.count}/12개월 인식`);
    const cols=Object.values(info.map);
    if(new Set(cols).size!==12)throw new Error(`${label} 월 헤더 열 중복 감지`);
    return info;
  }

  function unitFamily(v){
    const s=normText(v||'').replace(/\s+/g,'');
    if(!s)return '';
    if(s.includes('%')||s.includes('percent')||s.includes('rate')||s==='비율')return 'pct';
    if(s.includes('dptu'))return 'dptu';
    if(s.includes('ppm')||s==='nos.'||s==='nos')return 'ppm';
    if(s.includes('mh/unit')||s.includes('mh/대')||s.includes('mhperunit'))return 'mh';
    if(s.includes('day')||s==='일')return 'day';
    if(s.includes('person')||s==='명')return 'person';
    if(s.includes('case')||s.includes('건'))return 'case';
    if(s.includes('turn')||s.includes('rev'))return 'turn';
    return '';
  }

  function validateUnit(ws,labelRow,m){
    const c=sourceUnitCol(); if(!c||!m.unit)return true;
    const sf=unitFamily(getCell(ws,labelRow,c)),mf=unitFamily(m.unit);
    if(!sf||!mf)return true;
    return sf===mf;
  }

  function strictActualRow(ws,labelRow,m,srcInfo){
    const r=labelRow+1,b=sheetBounds(ws),kcol=sourceKpiCol();
    if(r>b.maxR)return 0;
    if(normText(getCell(ws,r,kcol))!=='')return 0;
    let seen=0;
    for(let mo=1;mo<=12;mo++){
      const raw=getCell(ws,r,srcInfo.map[mo]);
      if(raw!==null&&raw!==undefined&&String(raw).trim()!=='')seen++;
    }
    return seen?r:0;
  }

  window.hd24SafeResolveMappings=function(srcWs,masterWs,srcInfo){
    const source=runtimeMappings(),rejected=[],out=[],usedMaster=new Set(),kcol=sourceKpiCol();
    let movedSrc=0,movedMaster=0;
    for(const m of source){
      const sr=findStrictInColumn(srcWs,kcol,m.kpiEn),mr=findStrictInColumn(masterWs,13,m.kpiKr);
      if(sr.ambiguous||mr.ambiguous||sr.score<SAFE_SCORE||mr.score<SAFE_SCORE){
        rejected.push(`${m.kpiKr||m.kpiEn} (원본 ${sr.score.toFixed(2)} / 총괄 ${mr.score.toFixed(2)})`); continue;
      }
      if(!validateUnit(srcWs,sr.row,m)){
        rejected.push(`${m.kpiKr||m.kpiEn} (단위 불일치: ${getCell(srcWs,sr.row,sourceUnitCol())} ↔ ${m.unit})`); continue;
      }
      const actualRow=strictActualRow(srcWs,sr.row,m,srcInfo);
      if(!actualRow){rejected.push(`${m.kpiKr||m.kpiEn} (KPI 바로 다음 Actual 행 구조 불일치)`);continue;}
      if(usedMaster.has(mr.row)){rejected.push(`${m.kpiKr||m.kpiEn} (총괄 KPI 행 중복 ${mr.row})`);continue;}
      usedMaster.add(mr.row);
      if(sr.row!==m.labelRow)movedSrc++; if(mr.row!==m.masterRow)movedMaster++;
      out.push({...m,labelRow:sr.row,actualRow,masterRow:mr.row,_srcScore:sr.score,_masterScore:mr.score});
    }
    log(`안전 매핑 검증: ${out.length}/${source.length}건 / 제외 ${rejected.length}건 / 원본행 재탐색 ${movedSrc}건 / 총괄행 재탐색 ${movedMaster}건`);
    if(rejected.length)log(`반영 차단 원인: ${rejected.slice(0,15).join(' | ')}${rejected.length>15?' 외 '+(rejected.length-15)+'건':''}`);
    if(out.length!==source.length||rejected.length)throw new Error(`KPI 전수검증 실패: ${out.length}/${source.length}. 총괄파일 생성 중단`);
    return out;
  };

  function sourceHorizon(srcWs,resolved,srcInfo){
    let horizon=0;
    for(const m of resolved)for(let mo=1;mo<=12;mo++){
      const raw=getCell(srcWs,m.actualRow,srcInfo.map[mo]);
      if(raw===null||raw===undefined||String(raw).trim()==='')continue;
      if(normalizeValue(raw)!==null)horizon=Math.max(horizon,mo);
    }
    return horizon;
  }

  function almostEqual(a,b){return Math.abs(Number(a)-Number(b))<=EPS*Math.max(1,Math.abs(Number(a)),Math.abs(Number(b)));}
  function numericCell(v){const n=normalizeValue(v);return n===null?null:n;}
  function colNo(ref){let n=0;for(const ch of ref.match(/^[A-Z]+/)[0])n=n*26+ch.charCodeAt(0)-64;return n;}

  function patchCell(xml,ref,val){
    const re=new RegExp('<c r="'+ref+'"([^>]*?)(?:/>|>([\\s\\S]*?)</c>)'),m=re.exec(xml);
    if(m){
      let attrs=(m[1]||'').replace(/\s+t="[^"]*"/g,'');
      const cell='<c r="'+ref+'"'+attrs+'><v>'+fmtVal(val)+'</v></c>';
      return {xml:xml.slice(0,m.index)+cell+xml.slice(m.index+m[0].length),ok:true};
    }
    const rowNo=Number(ref.match(/\d+$/)[0]),targetCol=colNo(ref),rowRe=new RegExp('<row([^>]*\\br="'+rowNo+'"[^>]*)>([\\s\\S]*?)</row>'),rm=rowRe.exec(xml);
    if(!rm)return {xml,ok:false};
    const body=rm[2],cells=[...body.matchAll(/<c r="([A-Z]+\d+)"([^>]*)/g)];
    let style='',nearest=null;
    for(const cm of cells){const c=colNo(cm[1]),dist=Math.abs(c-targetCol);if(!nearest||dist<nearest.dist)nearest={dist,attrs:cm[2]||''};}
    if(nearest){const sm=nearest.attrs.match(/\s+s="([^"]+)"/);if(sm)style=' s="'+sm[1]+'"';}
    const newCell='<c r="'+ref+'"'+style+'><v>'+fmtVal(val)+'</v></c>';
    let insertAt=body.length; for(const cm of cells){if(colNo(cm[1])>targetCol){insertAt=cm.index;break;}}
    const newBody=body.slice(0,insertAt)+newCell+body.slice(insertAt),newRow='<row'+rm[1]+'>'+newBody+'</row>';
    return {xml:xml.slice(0,rm.index)+newRow+xml.slice(rm.index+rm[0].length),ok:true};
  }

  function xmlNumeric(xml,ref){
    const re=new RegExp('<c r="'+ref+'"[^>]*>([\\s\\S]*?)</c>'),m=re.exec(xml);
    if(!m)return null;
    const vm=m[1].match(/<v>([^<]+)<\/v>/); if(!vm)return null;
    const n=Number(vm[1]); return Number.isFinite(n)?n:null;
  }

  async function safeReflect(ev){
    try{
      if(!cfg().hasSource)return;
      ev.preventDefault();ev.stopImmediatePropagation();
      log('=== 안전 실적 반영 v8 시작 ===');
      const srcWs=srcWorkbook.Sheets[cfg().srcSheet],masterWs=masterWorkbook.Sheets[cfg().masterSheet];
      if(!srcWs)throw new Error('원본 시트 없음: '+cfg().srcSheet);
      if(!masterWs)throw new Error('총괄 시트 없음: '+cfg().masterSheet);
      const srcInfo=strictMonthCols(srcWs,typeof SRC_MONTH_HEADER_ROW!=='undefined'?SRC_MONTH_HEADER_ROW:null,'원본');
      const masterInfo=strictMonthCols(masterWs,4,'총괄');
      const resolved=window.hd24SafeResolveMappings(srcWs,masterWs,srcInfo);
      const horizon=sourceHorizon(srcWs,resolved,srcInfo);
      if(!horizon)throw new Error('원본 실적 기준월 확인 실패');
      log(`구조 검증 완료: KPI열 ${sourceKpiCol()} / 원본 월헤더 ${srcInfo.row}행 / 총괄 월헤더 ${masterInfo.row}행 / 기준월 ${horizon}월`);

      const patches={},historyMismatch=[]; let currentWrites=0,backfills=0,blankPreserved=0,textPreserved=0,sameHistory=0;
      for(const m of resolved){
        for(let mo=1;mo<=horizon;mo++){
          const raw=getCell(srcWs,m.actualRow,srcInfo.map[mo]);
          if(raw===null||raw===undefined||String(raw).trim()===''){blankPreserved++;continue;}
          const nv=normalizeValue(raw); if(nv===null){textPreserved++;continue;}
          const expected=nv*(m.scale||1),mcol=masterInfo.map[mo],ref=colLetter(mcol)+m.masterRow;
          const cur=numericCell(getCell(masterWs,m.masterRow,mcol));
          if(mo<horizon && cur!==null){
            if(almostEqual(cur,expected)){sameHistory++;continue;}
            historyMismatch.push(`${m.kpiKr} ${mo}월: 총괄 ${cur} / 원본 ${expected}`); continue;
          }
          if(Object.prototype.hasOwnProperty.call(patches,ref))throw new Error('중복 KPI×월 대상 감지: '+ref);
          patches[ref]=expected;
          if(mo===horizon)currentWrites++; else backfills++;
        }
      }
      if(historyMismatch.length){
        log(`과거월 값 불일치 ${historyMismatch.length}건 감지 — 기존 총괄값을 자동 덮어쓰지 않습니다.`);
        log(historyMismatch.slice(0,15).join(' | ')+(historyMismatch.length>15?' 외 '+(historyMismatch.length-15)+'건':''));
        throw new Error('과거월 데이터 불일치 감지. 자동반영을 차단했습니다. 매핑/기준 확인 필요');
      }
      log(`반영 사전검증: 당월 ${currentWrites}셀 / 과거 공란 백필 ${backfills}셀 / 과거 동일 ${sameHistory}셀 / 공란 보존 ${blankPreserved} / 비수치 보존 ${textPreserved}`);

      const path=await findSheetXmlPath(masterZip,cfg().masterSheet);
      let xml=await masterZip.file(path).async('string'),applied=0,missing=[];
      for(const [ref,v] of Object.entries(patches)){
        const r=patchCell(xml,ref,v); xml=r.xml; if(r.ok)applied++; else missing.push(ref);
      }
      if(missing.length)throw new Error('총괄 셀 생성/수정 실패: '+missing.slice(0,12).join(', '));

      const verifyFail=[];
      for(const [ref,v] of Object.entries(patches)){
        const got=xmlNumeric(xml,ref);
        if(got===null||!almostEqual(got,v))verifyFail.push(`${ref}: ${got} != ${v}`);
      }
      if(verifyFail.length)throw new Error('반영 후 셀 재검증 실패: '+verifyFail.slice(0,12).join(', '));
      if(applied!==Object.keys(patches).length)throw new Error(`반영 건수 불일치: ${applied}/${Object.keys(patches).length}`);

      masterZip.file(path,xml);
      log(`반영 후 재검증 PASS: ${applied}셀 / 타 사업장 0셀 / 미래월 0셀 / 과거 기존값 덮어쓰기 0셀`);

      const blob=await masterZip.generateAsync({type:'blob',compression:'DEFLATE'}),ext=(masterFileName.match(/\.(xlsx|xlsm)$/i)||['','.xlsx'])[1],base=masterFileName.replace(/\.(xlsx|xlsm)$/i,'');
      const a=document.createElement('a'); a.href=URL.createObjectURL(blob);a.download=base+'_'+cfg().label+'검증반영본.'+ext;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),30000);
      log('=== 완료: '+a.download+' ===');
      addHistory({action:'실적 반영',plantKey:currentPlant,srcName:(document.getElementById('srcFile').files[0]||{}).name||'',masterName:masterFileName,result:`${applied}셀 검증반영 / 기준월 ${horizon}월`});
    }catch(err){log('오류: '+err.message);console.error(err);}
  }

  try{
    resolveMappings=(srcWs,masterWs)=>{
      const srcInfo=strictMonthCols(srcWs,typeof SRC_MONTH_HEADER_ROW!=='undefined'?SRC_MONTH_HEADER_ROW:null,'원본');
      return window.hd24SafeResolveMappings(srcWs,masterWs,srcInfo);
    };
    buildMonthCols=(ws,startCol,headerRow)=>strictMonthCols(ws,headerRow,'월').map;
    replaceCell=(xml,ref,val)=>patchCell(xml,ref,val);
    const btn=document.getElementById('btnReflect'); if(btn)btn.addEventListener('click',safeReflect,true);
    log('안전 매핑 보호모드 v8 활성화');
  }catch(e){console.error('HD24 safe mapping guard install failed',e);}
})();
