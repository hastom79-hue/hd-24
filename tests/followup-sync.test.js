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
ok(src.includes('function expectedWatchItems(sig)'),'exact watch selector missing');
ok(src.includes("const REPLY_KEY='hd24_kpi_reply_history_v2'"),'recurrence history source must match legacy follow-up');
ok(src.includes("return !r.achieved||Number(r.streak)>=2||r.trend==='down'||!!rec?.isRecurrence"),'watch selector semantics drifted');
ok(src.includes('count===watch.length'),'Preview count must equal exact watch count');
ok(src.includes('p.dataset.hd24Rows=watchFingerprint(sig)'),'Preview exact-set fingerprint missing');
ok(src.includes('expectedSet.has(uniq)'),'reply KPI must belong to exact watch set');
ok(src.includes("[...expectedSet].some(x=>!seen.has(x))"),'reply workbook must cover complete watch set');
ok(src.includes('actual reply workbook'),'v6+ actual reply workbook intent missing');
ok(src.includes('async function validateReplyFile(file,sig)'),'actual reply workbook verifier missing');
ok(src.includes('await wb.xlsx.load(await file.arrayBuffer())'),'reply workbook bytes are not reopened for validation');
ok(src.includes('회신 Excel Target 불일치'),'Target cross-check missing');
ok(src.includes('회신 Excel Actual 불일치'),'Actual cross-check missing');
ok(src.includes('회신 Excel Status/Trend 불일치'),'Status/Trend cross-check missing');
ok(src.includes('replyDownloadedSignature=sig'),'verified reply completion signature missing');
ok(src.includes('replyAttempts[sig]'),'bounded retry gate missing');
ok(action.includes('month:horizon,items:analysisSnapshot'),'action export must emit frozen current-month snapshot');
ok(loader.includes('hd24-action-export.js?v=26'),'production loader must use action export v26');
ok(loader.includes('hd24-followup.js?v=24'),'production loader must use legacy UI module v24 with owner guard');
ok(loader.includes('hd24-followup-sync.js?v=7'),'production loader must use follow-up sync v7');
ok(refresh.includes('hd24-followup-sync.js?v=7'),'refresh helper must preload follow-up sync v7');

async function scenario({wrongSet=false}){
  const listeners={};
  const files={src:{name:'india-source.xlsx',size:111,lastModified:1},master:{name:'master.xlsx',size:222,lastModified:2}};
  const elements={};
  function elem(id,extra={}){return elements[id]=Object.assign({id,style:{display:'none'},dataset:{},disabled:false,textContent:'',scrollTop:0,scrollHeight:0,addEventListener(){},click(){}},extra)}
  elem('plantSelect',{value:'india'});elem('srcFile',{files:[files.src]});elem('masterFile',{files:[files.master]});elem('log');
  const preview=elem('hd24Preview');const subject=elem('hd24PreviewSubject');elem('hd24MailStatus');elem('resultCard');
  const currentSig=['india',files.src.name,files.src.size,files.src.lastModified,files.master.name,files.master.size,files.master.lastModified].join('|');
  // KPI A is watch-target. KPI B is healthy/non-watch. Same-count substitution of B for A must fail closed.
  const snapshotItems=[
    {month:7,masterRow:11,kpi:'KPI A',kpiEn:'KPI A',target:90,actual:80,achieved:false,streak:2,trend:'down'},
    {month:7,masterRow:12,kpi:'KPI B',kpiEn:'KPI B',target:95,actual:96,achieved:true,streak:0,trend:'up'}
  ];
  let mailClicks=0,replyClicks=0,replySeen=null,blobSeq=0,logs=[];
  class FakeAnchor{constructor(){this.href='';this.download=''}click(){}}
  const URLobj={createObjectURL(){return 'blob:fake-'+(++blobSeq)},revokeObjectURL(){}};
  function fakeRow(vals){return {getCell(i){return {value:vals[i-1]}}}}
  const dataRow=wrongSet
    ? ['India',7,'KPI B','KPI B',95,96,'Review']
    : ['India',7,'KPI A','KPI A',90,80,'Target Miss / Temporary / Consecutive Miss / Worsening'];
  const fakeWs={eachRow(cb){cb(fakeRow(['Plant','Target Month','KPI (KR)','KPI (EN)','Target','Actual','Status / Trend']),1);cb(fakeRow(dataRow),2)}};
  class FakeWorkbook{constructor(){this.worksheets=[];this.xlsx={load:async()=>{this.worksheets=[fakeWs]}}}}
  const localStore={};
  const sandbox={
    console,selectedMonth:7,allResults:[{month:7,masterRow:99,kpi:'STALE KPI',target:1,actual:1,achieved:true,streak:0,trend:'flat'}],
    localStorage:{getItem:k=>localStore[k]||null,setItem:(k,v)=>localStore[k]=String(v)},
    document:{readyState:'complete',getElementById:id=>elements[id]||null,addEventListener(){}},
    MutationObserver:class{constructor(cb){this.cb=cb}observe(){}},
    HTMLAnchorElement:FakeAnchor,URL:URLobj,ExcelJS:{Workbook:FakeWorkbook},
    setTimeout(fn,ms=0){if(ms<1000)fn();return 1},clearTimeout(){},setInterval(){return 1},clearInterval(){},window:null
  };
  sandbox.window=sandbox;sandbox.hd24SafeReflectSuccessSignature=currentSig;
  sandbox.addEventListener=(name,cb)=>{(listeners[name]||(listeners[name]=[])).push(cb)};
  sandbox.dispatchEvent=e=>{for(const cb of listeners[e.type]||[])cb(e)};
  sandbox.CustomEvent=class{constructor(type,init={}){this.type=type;this.detail=init.detail}};sandbox.log=m=>logs.push(String(m));

  elem('btnMailWatch',{click(){mailClicks++;preview.style.display='block';subject.textContent='[HDPS KPI Action Required] India - 7M (1 KPI)'}});
  elem('hd24DownloadReply',{click(){
    replyClicks++;
    replySeen={month:sandbox.selectedMonth,kpis:sandbox.allResults.map(x=>x.kpi),actuals:sandbox.allResults.map(x=>x.actual)};
    const file={name:'HDPS_KPI_Response_India_7M.xlsx',arrayBuffer:async()=>new ArrayBuffer(0)};
    const href=sandbox.URL.createObjectURL(file),a=new sandbox.HTMLAnchorElement();a.href=href;a.download=file.name;a.click();
  }});

  vm.createContext(sandbox);vm.runInContext(src,sandbox,{filename:'hd24-followup-sync.js'});
  sandbox.dispatchEvent(new sandbox.CustomEvent('hd24-action-export-complete',{detail:{signature:currentSig,month:7,items:snapshotItems,fileName:'master_분석후속조치본.xlsx'}}));
  await new Promise(r=>setTimeout(r,20));
  return {sandbox,currentSig,snapshotItems,preview,mailClicks,replyClicks,replySeen,logs};
}

(async()=>{
  const good=await scenario({wrongSet:false});
  ok(good.sandbox.hd24FollowupSyncOwnsAutoPackage===true,'v7 ownership flag missing');
  ok(good.mailClicks===1,'valid exact watch set must trigger one Preview');
  ok(good.replyClicks===1,'valid exact watch set must trigger one reply workbook');
  ok(good.replySeen.month===7,'reply generation must remain pinned to snapshot month');
  ok(JSON.stringify(good.replySeen.kpis)===JSON.stringify(['KPI A','KPI B']),'reply build context must use frozen action-export snapshot');
  ok(good.preview.dataset.hd24Signature===good.currentSig&&good.preview.dataset.hd24Month==='7'&&good.preview.dataset.hd24Count==='1','Preview identity/count tags mismatch');
  ok(good.preview.dataset.hd24Rows==='11','Preview exact watch-set fingerprint mismatch');
  ok(good.sandbox.allResults[0].kpi==='STALE KPI','live analysis globals must restore after reply creation');
  ok(good.logs.some(x=>x.includes('exact-set 검증 PASS')),'valid reply workbook exact-set PASS was not observed');

  // Negative executable case: same row count and valid snapshot membership, but wrong healthy KPI B
  // substituted for watch KPI A. v6 could accept this shape; v7 must reject it and never complete.
  const bad=await scenario({wrongSet:true});
  ok(bad.replyClicks===2,'wrong exact-set must use bounded two attempts and stop');
  ok(bad.logs.some(x=>x.includes('회신 Excel KPI가 관리대상 집합에 없음: KPI B')),'same-count wrong-KPI substitution was not fail-closed');
  ok(!bad.logs.some(x=>x.includes('후속조치 패키지 완료:')),'wrong KPI set must never reach completion');

  console.log('PASS follow-up v7: exact watch KPI set -> Preview fingerprint -> actual reply workbook bytes; same-count wrong-set rejected fail-closed');
})().catch(e=>{console.error(e);process.exit(1)});
