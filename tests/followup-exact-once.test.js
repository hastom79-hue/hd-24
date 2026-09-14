const fs=require('fs');
const vm=require('vm');
const assert=require('assert');
const src=fs.readFileSync('hd24-followup-sync.js','utf8');

(async()=>{
  const listeners={},elements={},intervals=[];
  const files={src:{name:'india-source.xlsx',size:111,lastModified:1},master:{name:'master.xlsx',size:222,lastModified:2}};
  function elem(id,extra={}){return elements[id]=Object.assign({id,style:{display:'none'},dataset:{},disabled:false,textContent:'',scrollTop:0,scrollHeight:0,addEventListener(){},click(){}},extra)}
  elem('plantSelect',{value:'india'});elem('srcFile',{files:[files.src]});elem('masterFile',{files:[files.master]});elem('log');
  const preview=elem('hd24Preview'),subject=elem('hd24PreviewSubject');elem('hd24MailStatus');elem('resultCard');
  const sig=['india',files.src.name,files.src.size,files.src.lastModified,files.master.name,files.master.size,files.master.lastModified].join('|');
  const items=[
    {month:7,masterRow:11,kpi:'KPI A',kpiEn:'KPI A',target:90,actual:80,achieved:false,streak:2,trend:'down'},
    {month:7,masterRow:12,kpi:'KPI B',kpiEn:'KPI B',target:95,actual:96,achieved:true,streak:0,trend:'up'}
  ];
  let mailClicks=0,replyClicks=0,blobSeq=0;const logs=[];
  class FakeAnchor{constructor(){this.href='';this.download=''}click(){}}
  const URLobj={createObjectURL(){return 'blob:fake-'+(++blobSeq)},revokeObjectURL(){}};
  function fakeRow(vals){return {getCell(i){return {value:vals[i-1]}}}}
  const ws={eachRow(cb){cb(fakeRow(['Plant','Target Month','KPI (KR)','KPI (EN)','Target','Actual','Status / Trend']),1);cb(fakeRow(['India',7,'KPI A','KPI A',90,80,'Target Miss / Temporary / Consecutive Miss / Worsening']),2)}};
  class FakeWorkbook{constructor(){this.worksheets=[];this.xlsx={load:async()=>{this.worksheets=[ws]}}}}
  const sandbox={
    console,selectedMonth:7,allResults:[{month:7,masterRow:99,kpi:'STALE',target:1,actual:1,achieved:true,streak:0,trend:'flat'}],
    localStorage:{getItem(){return null},setItem(){}},document:{readyState:'complete',getElementById:id=>elements[id]||null,addEventListener(){}},
    MutationObserver:class{constructor(cb){this.cb=cb}observe(){}},HTMLAnchorElement:FakeAnchor,URL:URLobj,ExcelJS:{Workbook:FakeWorkbook},
    setTimeout(fn,ms=0){if(ms<1000)fn();return 1},clearTimeout(){},setInterval(fn){intervals.push(fn);return intervals.length},clearInterval(){},window:null
  };
  sandbox.window=sandbox;sandbox.hd24ActionCycle=7;sandbox.hd24SafeReflectSuccessSignature=sig;
  sandbox.addEventListener=(name,cb)=>{(listeners[name]||(listeners[name]=[])).push(cb)};
  sandbox.dispatchEvent=e=>{for(const cb of listeners[e.type]||[])cb(e)};
  sandbox.CustomEvent=class{constructor(type,init={}){this.type=type;this.detail=init.detail}};
  sandbox.log=m=>logs.push(String(m));
  elem('btnMailWatch',{click(){mailClicks++;preview.style.display='block';subject.textContent='[HDPS KPI Action Required] India - 7M (1 KPI)'}});
  elem('hd24DownloadReply',{click(){replyClicks++;const file={name:'HDPS_KPI_Response_India_7M.xlsx',arrayBuffer:async()=>new ArrayBuffer(0)};const href=sandbox.URL.createObjectURL(file),a=new sandbox.HTMLAnchorElement();a.href=href;a.download=file.name;a.click()}});

  vm.createContext(sandbox);vm.runInContext(src,sandbox,{filename:'hd24-followup-sync.js'});
  const actionEvent=()=>new sandbox.CustomEvent('hd24-action-export-complete',{detail:{signature:sig,cycle:7,month:7,items,fileName:'master_분석후속조치본.xlsx'}});
  sandbox.dispatchEvent(actionEvent());
  await new Promise(r=>setTimeout(r,20));
  assert.equal(mailClicks,1,'first valid cycle must create Preview exactly once');
  assert.equal(replyClicks,1,'first valid cycle must create reply workbook exactly once');
  assert.equal(logs.filter(x=>x.includes('후속조치 패키지 완료:')).length,1,'first valid cycle must complete exactly once');

  // Re-fire every signal that can normally wake the orchestrator after completion.
  sandbox.dispatchEvent(actionEvent());
  sandbox.dispatchEvent(new sandbox.CustomEvent('hd24-safe-reflect-complete',{detail:{signature:sig}}));
  for(let i=0;i<5;i++)for(const fn of intervals)fn();
  await new Promise(r=>setTimeout(r,20));
  assert.equal(mailClicks,1,'duplicate action/safe/watchdog signals must not create a second Preview');
  assert.equal(replyClicks,1,'duplicate action/safe/watchdog signals must not create a second reply workbook');
  assert.equal(logs.filter(x=>x.includes('후속조치 패키지 완료:')).length,1,'duplicate signals must not complete twice');

  console.log('PASS follow-up exact-once: same cycle duplicate action-export + safe-complete + watchdog signals stay at Preview=1, Reply=1, Complete=1');
})().catch(e=>{console.error(e);process.exit(1)});
