const fs=require('fs');
const vm=require('vm');
const assert=require('assert');
const src=fs.readFileSync('hd24-reply-cycle-guard.js','utf8');

(async()=>{
  const elements={},downloads=[],logs=[];
  const files={src:{name:'india-a.xlsx',size:111,lastModified:1},master:{name:'master-a.xlsx',size:222,lastModified:2}};
  function elem(id,extra={}){const listeners={};return elements[id]=Object.assign({id,style:{display:'none'},dataset:{},value:'',files:[],textContent:'',addEventListener(type,cb){(listeners[type]||(listeners[type]=[])).push(cb)},click(){const e={preventDefault(){},stopImmediatePropagation(){this.stopped=true},stopped:false};for(const cb of listeners.click||[]){cb(e);if(e.stopped)break}}},extra)}
  const plant=elem('plantSelect',{value:'india'}),srcFile=elem('srcFile',{files:[files.src]}),masterFile=elem('masterFile',{files:[files.master]}),preview=elem('hd24Preview',{style:{display:'block'}});elem('log');
  const button=elem('hd24DownloadReply');
  function signature(){const a=srcFile.files[0],b=masterFile.files[0];return [plant.value,a.name,a.size,a.lastModified,b.name,b.size,b.lastModified].join('|')}
  let cycle=7;
  const itemA={month:7,masterRow:11,kpi:'KPI A',kpiEn:'KPI A',target:90,actual:80,achieved:false,streak:2,trend:'down'};
  const itemB={month:8,masterRow:21,kpi:'KPI B',kpiEn:'KPI B',target:95,actual:70,achieved:false,streak:3,trend:'down'};
  function applySnapshot(item){const sig=signature();preview.dataset.hd24Signature=sig;preview.dataset.hd24Cycle=String(cycle);preview.dataset.hd24Rows=String(item.masterRow);sandbox.hd24FollowupSnapshot={signature:sig,cycle,month:item.month,items:[item]}}

  let buildNo=0,releaseA,releaseB;
  const gateA=new Promise(r=>releaseA=r),gateB=new Promise(r=>releaseB=r);
  class FakeSheet{constructor(){this.columns=[];this.views=[];this.autoFilter=null}getRow(){return {font:null,fill:null,alignment:null}}addRow(){return {getCell(){return {fill:null,alignment:null}}}}}
  class FakeWorkbook{constructor(){const n=++buildNo;this.xlsx={writeBuffer:async()=>{await (n===1?gateA:gateB);return new ArrayBuffer(8)}}}addWorksheet(){return new FakeSheet()}}
  class FakeFile{constructor(parts,name,opts){this.parts=parts;this.name=name;this.type=opts?.type||''}}
  class FakeAnchor{constructor(){this.href='';this.download=''}click(){downloads.push(this.download)}}
  let blobNo=0;
  const sandbox={
    console,localStorage:{getItem(){return null},setItem(){}},ExcelJS:{Workbook:FakeWorkbook},File:FakeFile,
    URL:{createObjectURL(){return 'blob:'+(++blobNo)},revokeObjectURL(){}},
    document:{readyState:'complete',getElementById:id=>elements[id]||null,createElement(tag){if(tag==='a')return new FakeAnchor();return elem('x'+Math.random())},addEventListener(){}},
    setTimeout(fn,ms=0){if(ms<1000)fn();return 1},clearTimeout(){},window:null
  };
  sandbox.window=sandbox;sandbox.hd24ActionCycle=cycle;sandbox.log=m=>logs.push(String(m));
  vm.createContext(sandbox);applySnapshot(itemA);vm.runInContext(src,sandbox,{filename:'hd24-reply-cycle-guard.js'});

  button.click();
  await new Promise(r=>setTimeout(r,5));
  assert.equal(buildNo,1,'first cycle must start one async reply workbook build');
  assert.equal(downloads.length,0,'first build is intentionally still pending');

  // Change upload cycle while A is still writing. Start B before A resolves.
  cycle=8;sandbox.hd24ActionCycle=cycle;
  srcFile.files=[{name:'india-b.xlsx',size:333,lastModified:3}];masterFile.files=[{name:'master-b.xlsx',size:444,lastModified:4}];
  applySnapshot(itemB);
  button.click();
  await new Promise(r=>setTimeout(r,5));
  assert.equal(buildNo,2,'new cycle must be allowed to start its own workbook while old build is pending');

  // Resolve the new cycle first: only B is allowed to download.
  releaseB();await new Promise(r=>setTimeout(r,10));
  assert.deepEqual(downloads,['HDPS_KPI_Response_India_8M.xlsx'],'current cycle workbook must download');

  // Resolve stale A afterwards: it must be quarantined and never reach URL/anchor download.
  releaseA();await new Promise(r=>setTimeout(r,10));
  assert.deepEqual(downloads,['HDPS_KPI_Response_India_8M.xlsx'],'stale prior-cycle workbook must never download after reset');
  assert(logs.some(x=>x.includes('회신 Excel stale 생성 차단: cycle 7')),'stale prior-cycle block must be logged');
  console.log('PASS reply cycle guard: async old-cycle build dropped, current-cycle build downloaded exactly once');
})().catch(e=>{console.error(e);process.exit(1)});
