const fs=require('fs');
const vm=require('vm');
const assert=require('assert');

function deferred(){let resolve,reject;const promise=new Promise((r,j)=>{resolve=r;reject=j});return {promise,resolve,reject}}

async function run({mutateDuringWrite}){
  const src=fs.readFileSync('hd24-reply-cycle-guard.js','utf8');
  const gate=deferred();
  let downloads=0;
  const listeners={};
  const store={
    hd24_kpi_reply_history_v2:'[]',
    hd24_kpi_mail_history_v2:JSON.stringify([{plant:'india',targetMonth:7,kpiEn:'KPI A',preparedAt:'2026-09-15T00:00:00Z'}])
  };
  const files={src:{name:'india.xlsx',size:10,lastModified:1},master:{name:'master.xlsx',size:20,lastModified:2}};
  const elements={
    plantSelect:{value:'india'},
    srcFile:{files:[files.src]},
    masterFile:{files:[files.master]},
    hd24Preview:{style:{display:'block'},dataset:{hd24Signature:'india|india.xlsx|10|1|master.xlsx|20|2',hd24Cycle:'5',hd24Month:'7',hd24Count:'1',hd24Rows:'7'}},
    hd24DownloadReply:{addEventListener(type,fn){listeners[type]=fn}},
    log:{textContent:''}
  };
  const fakeRow={getCell(){return {fill:null,alignment:null}}};
  class Workbook{
    constructor(){this.xlsx={writeBuffer:()=>gate.promise};}
    addWorksheet(){return {columns:[],views:[],autoFilter:null,getRow(){return {font:null,fill:null,alignment:null}},addRow(){return fakeRow}}}
  }
  class FakeFile{constructor(parts,name,opts){this.parts=parts;this.name=name;this.type=opts?.type||''}}
  const sandbox={
    console,
    ExcelJS:{Workbook},
    File:FakeFile,
    localStorage:{getItem:k=>store[k]??null,setItem:(k,v)=>{store[k]=String(v)}},
    document:{readyState:'complete',getElementById:id=>elements[id]||null,createElement(tag){if(tag==='a')return {href:'',download:'',click(){downloads++}};return {}}},
    URL:{createObjectURL(){return 'blob:test'},revokeObjectURL(){}},
    setTimeout(fn){fn();return 1},clearTimeout(){},
    window:null
  };
  sandbox.window=sandbox;
  sandbox.window.hd24ActionCycle=5;
  sandbox.window.hd24FollowupSnapshot={signature:'india|india.xlsx|10|1|master.xlsx|20|2',cycle:5,month:7,items:[{month:7,masterRow:7,kpi:'지표A',kpiEn:'KPI A',target:100,actual:90,achieved:false,streak:1,trend:'flat'}]};
  vm.createContext(sandbox);vm.runInContext(src,sandbox,{filename:'hd24-reply-cycle-guard.js'});
  assert(listeners.click,'reply guard click listener missing');
  const ev={preventDefault(){},stopImmediatePropagation(){}};
  listeners.click(ev);
  await Promise.resolve();
  if(mutateDuringWrite){
    store.hd24_kpi_mail_history_v2=JSON.stringify([{plant:'india',targetMonth:7,kpiEn:'KPI A',preparedAt:'2026-09-15T01:00:00Z',sentAt:'2026-09-15T01:05:00Z'}]);
  }
  gate.resolve(Buffer.from('xlsx'));
  await new Promise(r=>setImmediate(r));
  await new Promise(r=>setImmediate(r));
  return {downloads,log:elements.log.textContent};
}

(async()=>{
  const stale=await run({mutateDuringWrite:true});
  assert.strictEqual(stale.downloads,0,'same-cycle mail/reply state mutation must block stale workbook download');
  assert(/stale 생성 차단/.test(stale.log),'stale block must be logged');
  const stable=await run({mutateDuringWrite:false});
  assert.strictEqual(stable.downloads,1,'unchanged same-cycle state must allow exactly one workbook download');
  console.log('PASS reply-cycle same-cycle state mutation regression');
})().catch(e=>{console.error(e);process.exit(1)});
