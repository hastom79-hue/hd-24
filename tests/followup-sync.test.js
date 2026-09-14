const fs=require('fs');
const vm=require('vm');
function ok(cond,msg){if(!cond)throw new Error(msg)}
const src=fs.readFileSync('hd24-followup-sync.js','utf8');
const legacy=fs.readFileSync('hd24-followup.js','utf8');
const action=fs.readFileSync('hd24-action-export.js','utf8');
const loader=fs.readFileSync('hd24-ui-v3.js','utf8');
const refresh=fs.readFileSync('refresh-runtime.html','utf8');

// Static production wiring/invariant checks.
ok(src.includes('window.hd24FollowupSyncOwnsAutoPackage=true'),'sync must claim single auto-package ownership');
ok(legacy.includes('if(window.hd24FollowupSyncOwnsAutoPackage)'),'legacy auto-package must honor sync ownership');
ok(src.includes('actionExportSignature!==sig||!snap||!a.ready'),'follow-up must wait for safe-reflect, action export snapshot, and current analysis');
ok(src.includes('async function validateReplyFile(file,sig)'),'actual reply workbook verifier missing');
ok(src.includes('await wb.xlsx.load(await file.arrayBuffer())'),'reply workbook bytes are not reopened for validation');
ok(src.includes('Preview↔회신 Excel KPI 건수 불일치'),'Preview/reply count gate missing');
ok(src.includes('회신 Excel Target 불일치'),'Target cross-check missing');
ok(src.includes('회신 Excel Actual 불일치'),'Actual cross-check missing');
ok(src.includes('회신 Excel Status/Trend 불일치'),'Status/Trend cross-check missing');
ok(src.includes('replyDownloadedSignature=sig'),'verified reply completion signature missing');
ok(src.includes('replyAttempts[sig]'),'bounded retry gate missing');
ok(src.includes('withSnapshot(sig,()=>mailBtn.click())'),'Preview generation must pin action-export snapshot');
ok(src.includes("p.dataset.hd24Month=String(snap.month)"),'Preview month tag missing');
ok(src.includes("p.dataset.hd24Count=String(meta.count)"),'Preview KPI count tag missing');
ok(action.includes('month:horizon,items:analysisSnapshot'),'action export must emit frozen current-month snapshot');
ok(loader.includes('hd24-action-export.js?v=26'),'production loader must use action export v26');
ok(loader.includes('hd24-followup.js?v=24'),'production loader must use legacy UI module v24 with owner guard');
ok(loader.includes('hd24-followup-sync.js?v=6'),'production loader must use follow-up sync v6');
ok(refresh.includes('hd24-followup-sync.js?v=6'),'refresh helper must preload follow-up sync v6');

(async()=>{
  // Executable VM regression: the fake reply file is created only after the async button
  // path is invoked, then v6 must reopen and verify workbook rows before considering it done.
  const listeners={};
  const files={src:{name:'india-source.xlsx',size:111,lastModified:1},master:{name:'master.xlsx',size:222,lastModified:2}};
  const elements={};
  function elem(id,extra={}){return elements[id]=Object.assign({id,style:{display:'none'},dataset:{},disabled:false,textContent:'',scrollTop:0,scrollHeight:0,addEventListener(){},click(){}},extra)}
  elem('plantSelect',{value:'india'});elem('srcFile',{files:[files.src]});elem('masterFile',{files:[files.master]});elem('log');
  const preview=elem('hd24Preview');const subject=elem('hd24PreviewSubject');elem('hd24MailStatus');elem('resultCard');
  const currentSig=['india',files.src.name,files.src.size,files.src.lastModified,files.master.name,files.master.size,files.master.lastModified].join('|');
  const snapshotItems=[
    {month:7,masterRow:11,kpi:'KPI A',kpiEn:'KPI A',target:90,actual:80,achieved:false,streak:2,trend:'down'},
    {month:7,masterRow:12,kpi:'KPI B',kpiEn:'KPI B',target:95,actual:96,achieved:true,streak:0,trend:'up'}
  ];
  let mailClicks=0,replyClicks=0,replySeen=null,blobSeq=0;
  class FakeAnchor{constructor(){this.href='';this.download=''}click(){}}
  const URLobj={createObjectURL(){return 'blob:fake-'+(++blobSeq)},revokeObjectURL(){}};
  function fakeRow(vals){return {getCell(i){return {value:vals[i-1]}}}}
  const fakeWs={eachRow(cb){
    cb(fakeRow(['Plant','Target Month','KPI (KR)','KPI (EN)','Target','Actual','Status / Trend']),1);
    cb(fakeRow(['India',7,'KPI A','KPI A',90,80,'Target Miss / Temporary / Consecutive Miss / Worsening']),2);
    cb(fakeRow(['India',7,'KPI B','KPI B',95,96,'Review']),3);
  }};
  class FakeWorkbook{constructor(){this.worksheets=[];this.xlsx={load:async()=>{this.worksheets=[fakeWs]}}}}
  const sandbox={
    console,selectedMonth:7,allResults:[{month:7,masterRow:99,kpi:'STALE KPI',target:1,actual:1,achieved:true,streak:0,trend:'flat'}],
    document:{readyState:'complete',getElementById:id=>elements[id]||null,addEventListener(){}},
    MutationObserver:class{constructor(cb){this.cb=cb}observe(){}},
    HTMLAnchorElement:FakeAnchor,URL:URLobj,ExcelJS:{Workbook:FakeWorkbook},
    setTimeout(fn,ms=0){if(ms<1000)fn();return 1},clearTimeout(){},setInterval(){return 1},clearInterval(){},window:null
  };
  sandbox.window=sandbox;sandbox.hd24SafeReflectSuccessSignature=currentSig;
  sandbox.addEventListener=(name,cb)=>{(listeners[name]||(listeners[name]=[])).push(cb)};
  sandbox.dispatchEvent=e=>{for(const cb of listeners[e.type]||[])cb(e)};
  sandbox.CustomEvent=class{constructor(type,init={}){this.type=type;this.detail=init.detail}};sandbox.log=()=>{};

  elem('btnMailWatch',{click(){mailClicks++;preview.style.display='block';subject.textContent='[HDPS KPI Action Required] India - 7M (2 KPIs)'}});
  elem('hd24DownloadReply',{click(){
    replyClicks++;
    replySeen={month:sandbox.selectedMonth,kpis:sandbox.allResults.map(x=>x.kpi),actuals:sandbox.allResults.map(x=>x.actual)};
    const file={name:'HDPS_KPI_Response_India_7M.xlsx',arrayBuffer:async()=>new ArrayBuffer(0)};
    const href=sandbox.URL.createObjectURL(file),a=new sandbox.HTMLAnchorElement();a.href=href;a.download=file.name;a.click();
  }});

  vm.createContext(sandbox);vm.runInContext(src,sandbox,{filename:'hd24-followup-sync.js'});
  ok(sandbox.hd24FollowupSyncOwnsAutoPackage===true,'v6 must expose ownership flag immediately');
  ok(mailClicks===0&&replyClicks===0,'must not package before action-export snapshot');

  sandbox.dispatchEvent(new sandbox.CustomEvent('hd24-action-export-complete',{detail:{signature:'wrong-signature',month:7,items:snapshotItems}}));
  ok(mailClicks===0&&replyClicks===0,'wrong-signature snapshot must not package');

  sandbox.dispatchEvent(new sandbox.CustomEvent('hd24-action-export-complete',{detail:{signature:currentSig,month:7,items:snapshotItems,fileName:'master_분석후속조치본.xlsx'}}));
  await new Promise(r=>setTimeout(r,20));
  ok(mailClicks===1,'correct snapshot must trigger exactly one Preview package');
  ok(replyClicks===1,'correct snapshot must request exactly one reply workbook');
  ok(replySeen.month===7,'reply generation must remain pinned to snapshot month until actual file creation');
  ok(JSON.stringify(replySeen.kpis)===JSON.stringify(['KPI A','KPI B']),'reply generation must use frozen action-export KPI list');
  ok(JSON.stringify(replySeen.actuals)===JSON.stringify([80,96]),'reply generation must preserve frozen Actual values');
  ok(preview.dataset.hd24Signature===currentSig&&preview.dataset.hd24Month==='7'&&preview.dataset.hd24Count==='2','Preview identity tags mismatch');
  ok(sandbox.allResults[0].kpi==='STALE KPI','live analysis globals must restore after actual reply file creation');

  // Duplicate completion events must remain idempotent after verified workbook bytes.
  sandbox.dispatchEvent(new sandbox.CustomEvent('hd24-action-export-complete',{detail:{signature:currentSig,month:7,items:snapshotItems}}));
  sandbox.dispatchEvent(new sandbox.CustomEvent('hd24-safe-reflect-complete',{detail:{signature:currentSig}}));
  await new Promise(r=>setTimeout(r,10));
  ok(mailClicks===1&&replyClicks===1,'duplicate completion events must not regenerate verified package');

  console.log('PASS follow-up v6: actual reply workbook bytes reopened -> plant/month/count/KPI/Target/Actual/Status verified -> completion exactly once');
})().catch(e=>{console.error(e);process.exit(1)});
