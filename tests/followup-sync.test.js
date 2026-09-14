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
ok(src.includes("window.addEventListener('hd24-action-export-complete',actionExportComplete)"),'action-export completion listener missing');
ok(src.includes('window.hd24FollowupSnapshot={signature:sig,month,items:items.map'),'validated snapshot storage missing');
ok(src.includes('withSnapshot(sig,()=>mailBtn.click())'),'Preview generation must pin action-export snapshot');
ok(src.includes('withSnapshot(sig,()=>b.click())'),'reply workbook generation must pin action-export snapshot');
ok(src.includes("p.dataset.hd24Month=String(snap.month)"),'Preview month tag missing');
ok(src.includes("p.dataset.hd24Count=String(meta.count)"),'Preview KPI count tag missing');
ok(src.includes("if(activeSignature!==sig)hardReset"),'duplicate safe-complete must not reset same-signature state');
ok(action.includes('month:horizon,items:analysisSnapshot'),'action export must emit frozen current-month snapshot');
ok(loader.includes('hd24-action-export.js?v=26'),'production loader must use action export v26');
ok(loader.includes('hd24-followup.js?v=24'),'production loader must use legacy UI module v24 with owner guard');
ok(loader.includes('hd24-followup-sync.js?v=5'),'production loader must use follow-up sync v5');
ok(refresh.includes('hd24-action-export.js?v=26'),'refresh helper must preload action export v26');
ok(refresh.includes('hd24-followup-sync.js?v=5'),'refresh helper must preload follow-up sync v5');

// Executable state-machine regression: prove snapshot ordering/data identity and one-time behavior.
const listeners={};
const files={src:{name:'india-source.xlsx',size:111,lastModified:1},master:{name:'master.xlsx',size:222,lastModified:2}};
const elements={};
function elem(id,extra={}){return elements[id]=Object.assign({id,style:{display:'none'},dataset:{},disabled:false,textContent:'',scrollTop:0,scrollHeight:0,addEventListener(){},click(){}},extra)}
elem('plantSelect',{value:'india'});elem('srcFile',{files:[files.src]});elem('masterFile',{files:[files.master]});elem('log');
const preview=elem('hd24Preview');const subject=elem('hd24PreviewSubject');elem('hd24MailStatus');elem('resultCard');
let replyClicks=0,mailClicks=0,mailSeen=null,replySeen=null;
const currentSig=['india',files.src.name,files.src.size,files.src.lastModified,files.master.name,files.master.size,files.master.lastModified].join('|');
const snapshotItems=[
 {month:7,masterRow:11,kpi:'KPI A',kpiEn:'KPI A',target:90,actual:80,achieved:false,streak:2,trend:'down'},
 {month:7,masterRow:12,kpi:'KPI B',kpiEn:'KPI B',target:95,actual:96,achieved:true,streak:0,trend:'up'}
];

const sandbox={
 console,selectedMonth:7,allResults:[{month:7,masterRow:99,kpi:'STALE KPI',target:1,actual:1,achieved:true,streak:0,trend:'flat'}],
 document:{readyState:'complete',getElementById:id=>elements[id]||null,addEventListener(){}},
 MutationObserver:class{constructor(cb){this.cb=cb}observe(){}},setTimeout(fn){fn();return 1},clearTimeout(){},setInterval(){return 1},clearInterval(){},window:null
};
sandbox.window=sandbox;sandbox.hd24SafeReflectSuccessSignature=currentSig;
sandbox.addEventListener=(name,cb)=>{(listeners[name]||(listeners[name]=[])).push(cb)};
sandbox.dispatchEvent=e=>{for(const cb of listeners[e.type]||[])cb(e)};
sandbox.CustomEvent=class{constructor(type,init={}){this.type=type;this.detail=init.detail}};sandbox.log=()=>{};

elem('hd24DownloadReply',{click(){replyClicks++;replySeen={month:sandbox.selectedMonth,kpis:sandbox.allResults.map(x=>x.kpi),actuals:sandbox.allResults.map(x=>x.actual)}}});
elem('btnMailWatch',{click(){mailClicks++;mailSeen={month:sandbox.selectedMonth,kpis:sandbox.allResults.map(x=>x.kpi),actuals:sandbox.allResults.map(x=>x.actual)};preview.style.display='block';subject.textContent='[HDPS KPI Action Required] India - 7M (2 KPIs)'}});

vm.createContext(sandbox);vm.runInContext(src,sandbox,{filename:'hd24-followup-sync.js'});
ok(sandbox.hd24FollowupSyncOwnsAutoPackage===true,'v5 must expose ownership flag immediately');
ok(mailClicks===0&&replyClicks===0,'must not package before action-export snapshot');

// Same signature but missing snapshot payload must fail closed.
sandbox.dispatchEvent(new sandbox.CustomEvent('hd24-action-export-complete',{detail:{signature:currentSig}}));
ok(mailClicks===0&&replyClicks===0,'missing action snapshot must not package');

// Wrong-signature snapshot must be ignored.
sandbox.dispatchEvent(new sandbox.CustomEvent('hd24-action-export-complete',{detail:{signature:'wrong-signature',month:7,items:snapshotItems}}));
ok(mailClicks===0&&replyClicks===0,'wrong-signature snapshot must not package');

// Correct snapshot pins both Preview selection and reply workbook generation to identical data.
sandbox.dispatchEvent(new sandbox.CustomEvent('hd24-action-export-complete',{detail:{signature:currentSig,month:7,items:snapshotItems,fileName:'master_분석후속조치본.xlsx'}}));
ok(mailClicks===1,'correct snapshot must trigger exactly one Preview package');
ok(replyClicks===1,'correct snapshot must trigger exactly one reply workbook');
ok(mailSeen.month===7&&replySeen.month===7,'Preview and reply must use snapshot month');
ok(JSON.stringify(mailSeen.kpis)===JSON.stringify(['KPI A','KPI B']),'Preview must use frozen action-export KPI list, not stale allResults');
ok(JSON.stringify(replySeen.kpis)===JSON.stringify(mailSeen.kpis),'reply workbook must use identical KPI snapshot as Preview');
ok(JSON.stringify(replySeen.actuals)===JSON.stringify([80,96]),'reply workbook must preserve snapshot actuals');
ok(preview.dataset.hd24Signature===currentSig,'Preview signature tag missing');
ok(preview.dataset.hd24Month==='7','Preview month tag mismatch');
ok(preview.dataset.hd24Count==='2','Preview KPI count tag mismatch');
ok(sandbox.allResults[0].kpi==='STALE KPI','temporary snapshot pin must restore live analysis globals after package');

// Duplicate completion events remain idempotent.
sandbox.dispatchEvent(new sandbox.CustomEvent('hd24-action-export-complete',{detail:{signature:currentSig,month:7,items:snapshotItems}}));
sandbox.dispatchEvent(new sandbox.CustomEvent('hd24-safe-reflect-complete',{detail:{signature:currentSig}}));
ok(mailClicks===1&&replyClicks===1,'duplicate completion events must not regenerate package');

console.log('PASS follow-up v5 data lock: action-export snapshot -> same month/KPI/target-actual dataset -> Preview + reply Excel exactly once');
