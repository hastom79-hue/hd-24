'use strict';
const assert=require('assert');
const classifier=require('../kpi-action-classifier.js');
const post=require('../kpi-action-workbook.js');

class Cell{
  constructor(v=null){this.value=v;this.font={};this.fill=null;this.alignment={};}
}
class Column{constructor(){this.width=null;}}
class Ws{
  constructor(rows,cols){this.rows=rows;this.columnCount=cols;this.cells=new Map();this.cols=new Map();}
  key(r,c){return `${r}:${c}`;}
  getCell(r,c){const k=this.key(r,c);if(!this.cells.has(k))this.cells.set(k,new Cell());return this.cells.get(k);}
  getColumn(c){if(!this.cols.has(c))this.cols.set(c,new Column());return this.cols.get(c);}
}

const ws=new Ws(20,39);
ws.getCell(4,13).value='표준 성과지표(KPIs)';
ws.getCell(4,25).value='목표/단위';
for(let m=1;m<=12;m++)ws.getCell(4,26+m).value=`${m}월`;
ws.getCell(5,13).value='KPI A';
ws.getCell(5,25).value=95;
[100,98,96,94,92,90].forEach((v,i)=>ws.getCell(5,27+i).value=v);
ws.getCell(6,13).value='KPI B';
ws.getCell(6,25).value=3;
[2,2.2,2.4,2.6,2.8,3.2].forEach((v,i)=>ws.getCell(6,27+i).value=v);

const layout=post.discoverMasterLayout(ws,4);
assert.strictEqual(layout.kpiCol,13);
assert.strictEqual(layout.targetCol,25);
assert.strictEqual(layout.monthCols[1],27);
assert.strictEqual(layout.monthCols[12],38);

const beforeA=ws.getCell(5,13).value;
const beforeB=ws.getCell(6,13).value;
const out=post.applyKpiActionColumn({
  worksheet:ws,
  resolvedMappings:[
    {masterRow:5,direction:'상향'},
    {masterRow:6,direction:'하향'}
  ],
  horizon:6,
  classifier,
  headerRow:4
});
assert.strictEqual(out.actionCol,40,'must create after existing AM col');
assert.strictEqual(ws.getCell(4,40).value,'미달사유 / 만회계획');
assert.strictEqual(ws.getCell(5,13).value,beforeA,'KPI name changed');
assert.strictEqual(ws.getCell(6,13).value,beforeB,'KPI name changed');
assert(ws.getCell(5,40).value.includes('만회계획'),'action prompt missing');
assert(ws.getCell(6,40).value.includes('미달사유'),'action prompt missing for lower-is-better miss');
assert(ws.getCell(5,13).fill&&ws.getCell(6,13).fill,'visual token not applied');

console.log('PASS kpi-action-workbook: dynamic headers, AN creation, KPI preservation, action prompt, visual marking');
