(()=>{
'use strict';

function norm(v){return String(v??'').replace(/\r?\n/g,' ').replace(/\s+/g,' ').trim();}

function findHeaderColumn(ws,row,text){
  const wanted=norm(text);
  for(let c=1;c<=ws.columnCount;c++){
    if(norm(ws.getCell(row,c).value)===wanted)return c;
  }
  return 0;
}

function monthNumber(v){
  const m=norm(v).match(/^(1[0-2]|[1-9])월$/);
  return m?Number(m[1]):0;
}

function discoverMasterLayout(ws,headerRow=4){
  const kpiCol=findHeaderColumn(ws,headerRow,'표준 성과지표(KPIs)');
  const targetCol=findHeaderColumn(ws,headerRow,'목표/단위');
  if(!kpiCol)throw new Error('후속조치 생성 차단: KPI 헤더 탐색 실패');
  if(!targetCol)throw new Error('후속조치 생성 차단: 목표/단위 헤더 탐색 실패');
  const monthCols={};
  for(let c=1;c<=ws.columnCount;c++){
    const m=monthNumber(ws.getCell(headerRow,c).value);
    if(m){
      if(monthCols[m])throw new Error(`후속조치 생성 차단: ${m}월 헤더 중복`);
      monthCols[m]=c;
    }
  }
  if(Object.keys(monthCols).length!==12)throw new Error(`후속조치 생성 차단: 월 헤더 ${Object.keys(monthCols).length}/12`);
  return {headerRow,kpiCol,targetCol,unitCol:targetCol+1,monthCols};
}

function valueOf(cell){
  const v=cell?.value;
  if(v&&typeof v==='object'){
    if(Object.prototype.hasOwnProperty.call(v,'result'))return v.result;
    if(Object.prototype.hasOwnProperty.call(v,'text'))return v.text;
  }
  return v;
}

function applyFillAndFont(cell,token){
  if(!token||!token.fill)return;
  cell.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF'+token.fill}};
  cell.font={...(cell.font||{}),bold:true,color:{argb:'FF'+token.font}};
}

function applyKpiActionColumn({worksheet,resolvedMappings,horizon,classifier,headerRow=4}){
  if(!worksheet)throw new Error('후속조치 생성 차단: worksheet 없음');
  if(!Array.isArray(resolvedMappings)||!resolvedMappings.length)throw new Error('후속조치 생성 차단: 안전 매핑 결과 없음');
  if(!classifier||typeof classifier.classifyKpi!=='function')throw new Error('후속조치 생성 차단: classifier 없음');
  if(!(horizon>=1&&horizon<=12))throw new Error('후속조치 생성 차단: 기준월 오류');

  const layout=discoverMasterLayout(worksheet,headerRow);
  const actionCol=Math.max(worksheet.columnCount+1,Math.max(...Object.values(layout.monthCols))+1);
  const header=worksheet.getCell(headerRow,actionCol);
  header.value='미달사유 / 만회계획';
  header.font={...(header.font||{}),bold:true};
  header.alignment={vertical:'middle',horizontal:'center',wrapText:true};
  header.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FFD9EAF7'}};
  worksheet.getColumn(actionCol).width=38;

  const results=[];
  for(const m of resolvedMappings){
    const row=Number(m.masterRow);
    if(!row||row<=headerRow)throw new Error(`후속조치 생성 차단: 잘못된 masterRow ${m.masterRow}`);
    const kpiCell=worksheet.getCell(row,layout.kpiCol);
    const kpiBefore=valueOf(kpiCell);
    const target=valueOf(worksheet.getCell(row,layout.targetCol));
    const values=[];
    for(let mo=1;mo<=horizon;mo++)values.push(valueOf(worksheet.getCell(row,layout.monthCols[mo])));
    const result=classifier.classifyKpi({values,target,direction:m.direction});
    const token=classifier.visualToken(result);
    applyFillAndFont(kpiCell,token);

    const actionCell=worksheet.getCell(row,actionCol);
    actionCell.value=classifier.actionPrompt(result);
    actionCell.alignment={vertical:'top',wrapText:true};

    if(valueOf(kpiCell)!==kpiBefore)throw new Error(`KPI명 원문 보존 실패: row ${row}`);
    results.push({row,kpi:kpiBefore,result,actionCol});
  }

  const duplicated=new Set();
  const seen=new Set();
  for(const x of results){if(seen.has(x.row))duplicated.add(x.row);seen.add(x.row);}
  if(duplicated.size)throw new Error(`후속조치 생성 차단: 중복 KPI 행 ${[...duplicated].join(',')}`);

  return {layout,actionCol,results};
}

const api={norm,findHeaderColumn,monthNumber,discoverMasterLayout,applyKpiActionColumn};
if(typeof window!=='undefined')window.hd24KpiActionWorkbook=api;
if(typeof module!=='undefined'&&module.exports)module.exports=api;
})();
