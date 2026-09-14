'use strict';
const assert=require('assert');
const classifier=require('../kpi-action-classifier.js');
const post=require('../kpi-action-workbook.js');

class Cell{
  constructor(v=null){this.value=v;this.font={};this.fill=null;this.alignment={};}
}
class Column{constructor(){this.width=null;}}
class Ws{
  constructor(rows,cols){this.rowCount=rows;this.rows=rows;this.columnCount=cols;this.cells=new Map();this.cols=new Map();}
  key(r,c){return `${r}:${c}`;}
  getCell(r,c){const k=this.key(r,c);if(!this.cells.has(k))this.cells.set(k,new Cell());return this.cells.get(k);}
  getColumn(c){if(!this.cols.has(c))this.cols.set(c,new Column());return this.cols.get(c);}
}

// Mirror real India/Brazil reporting-sheet shape:
// L4:M4 merged KPI header, actual KPI names in M, Y target, Z unit, AA:AL months,
// AM contains an existing formula so the new action column must be AN.
const ws=new Ws(20,45);
ws.getCell(4,12).value='표준 성과지표(KPIs)';
ws.getCell(4,25).value='목표/단위';
for(let m=1;m<=12;m++)ws.getCell(4,26+m).value=`${m}월`;
ws.getCell(1,39).value='=25/Q1';
ws.getCell(5,12).value=5;
ws.getCell(5,13).value='KPI A';
ws.getCell(5,25).value=95;
[100,98,96,94,92,90].forEach((v,i)=>ws.getCell(5,27+i).value=v);
ws.getCell(6,12).value='+1';
ws.getCell(6,13).value='KPI B';
ws.getCell(6,25).value=3;
[2,2.2,2.4,2.6,2.8,3.2].forEach((v,i)=>ws.getCell(6,27+i).value=v);

const mappings=[
  {masterRow:5,direction:'상향',kpiKr:'KPI A'},
  {masterRow:6,direction:'하향',kpiKr:'KPI B'}
];

const layout=post.discoverMasterLayout(ws,4);
assert.strictEqual(layout.kpiHeaderCol,12);
assert.strictEqual(layout.targetCol,25);
assert.strictEqual(layout.monthCols[1],27);
assert.strictEqual(layout.monthCols[12],38);
assert.strictEqual(post.resolveKpiDataColumn(ws,layout,mappings),13,'must resolve actual KPI names in M');
assert.strictEqual(post.resolveActionColumn(ws,layout,4),40,'must skip populated AM and choose AN');

const beforeA=ws.getCell(5,13).value;
const beforeB=ws.getCell(6,13).value;
let out=post.applyKpiActionColumn({worksheet:ws,resolvedMappings:mappings,horizon:6,classifier,headerRow:4});
assert.strictEqual(out.actionCol,40,'must create AN, not append after formatted AS');
assert.strictEqual(ws.getCell(4,40).value,'미달사유 / 만회계획');
assert.strictEqual(ws.getCell(5,13).value,beforeA,'KPI name changed');
assert.strictEqual(ws.getCell(6,13).value,beforeB,'KPI name changed');
assert(ws.getCell(5,40).value.includes('만회계획'),'action prompt missing');
assert(ws.getCell(6,40).value.includes('미달사유'),'action prompt missing for lower-is-better miss');
assert(ws.getCell(5,13).fill&&ws.getCell(6,13).fill,'visual token not applied');

// Idempotency: rerun must reuse AN and preserve manual owner input.
ws.getCell(5,40).value='미달사유 : 설비정지\n만회계획 : 9월 회복';
out=post.applyKpiActionColumn({worksheet:ws,resolvedMappings:mappings,horizon:6,classifier,headerRow:4});
assert.strictEqual(out.actionCol,40,'rerun must reuse existing action column');
assert.strictEqual(ws.getCell(5,40).value,'미달사유 : 설비정지\n만회계획 : 9월 회복','manual action text overwritten');
assert.strictEqual(out.results[0].manualActionPreserved,true,'manual preservation flag missing');

console.log('PASS kpi-action-workbook: real merged header, M KPI names, AN selection, KPI preservation, idempotency, manual text preservation');
