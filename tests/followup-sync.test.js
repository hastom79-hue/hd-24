const fs=require('fs');
const vm=require('vm');
function ok(cond,msg){if(!cond)throw new Error(msg)}
const src=fs.readFileSync('hd24-followup-sync.js','utf8');
const loader=fs.readFileSync('hd24-ui-v3.js','utf8');
const refresh=fs.readFileSync('refresh-runtime.html','utf8');

// Static production wiring/invariant checks.
ok(src.includes("window.hd24SafeReflectSuccessSignature!==sig||actionExportSignature!==sig||!a.ready"),'follow-up must wait for safe-reflect, action export, and current analysis');
ok(src.includes("window.addEventListener('hd24-action-export-complete',actionExportComplete)"),'action-export completion listener missing');
ok(src.includes("eventSig!==sig"),'action-export event must match current upload signature');
ok(src.includes("replyDownloadedSignature===sig"),'reply workbook dedupe signature missing');
ok(src.includes("if(activeSignature!==sig)hardReset"),'duplicate safe-complete must not reset same-signature state');
ok(src.includes("p.dataset.hd24Signature===sig"),'Preview must be tagged to current signature');
ok(src.includes("if(stale&&stale.style.display!=='none'&&!stale.dataset.hd24Signature){stale.style.display='none';}"),'untagged legacy Preview must not be trusted');
ok(loader.includes('hd24-followup-sync.js?v=3'),'production loader must use follow-up sync v3');
ok(refresh.includes('hd24-followup-sync.js?v=3'),'refresh helper must preload follow-up sync v3');

// Executable state-machine regression: prove ordering and one-time behavior.
const listeners={};
const files={
  src:{name:'india-source.xlsx',size:111,lastModified:1},
  master:{name:'master.xlsx',size:222,lastModified:2}
};
const elements={};
function elem(id,extra={}){return elements[id]=Object.assign({id,style:{display:'none'},dataset:{},disabled:false,textContent:'',scrollTop:0,scrollHeight:0,addEventListener(){},click(){}},extra)}
const plant=elem('plantSelect',{value:'india'});
const srcFile=elem('srcFile',{files:[files.src]});
const masterFile=elem('masterFile',{files:[files.master]});
elem('log');
const preview=elem('hd24Preview');
const subject=elem('hd24PreviewSubject');
elem('hd24MailStatus');
let replyClicks=0,mailClicks=0;
const reply=elem('hd24DownloadReply',{click(){replyClicks++}});
const mail=elem('btnMailWatch',{click(){mailClicks++;preview.style.display='block';subject.textContent='HD24 KPI follow-up'}});
elem('resultCard');
const currentSig=['india',files.src.name,files.src.size,files.src.lastModified,files.master.name,files.master.size,files.master.lastModified].join('|');

const sandbox={
  console,
  selectedMonth:7,
  allResults:[{month:7,kpi:'KPI A'}],
  document:{readyState:'complete',getElementById:id=>elements[id]||null,addEventListener(){}},
  MutationObserver:class{constructor(cb){this.cb=cb}observe(){}},
  setTimeout(fn){fn();return 1},
  clearTimeout(){},
  setInterval(){return 1},
  clearInterval(){},
  window:null
};
sandbox.window=sandbox;
sandbox.hd24SafeReflectSuccessSignature=currentSig;
sandbox.addEventListener=(name,cb)=>{(listeners[name]||(listeners[name]=[])).push(cb)};
sandbox.dispatchEvent=e=>{for(const cb of listeners[e.type]||[])cb(e)};
sandbox.CustomEvent=class{constructor(type,init={}){this.type=type;this.detail=init.detail}};
sandbox.log=()=>{};
vm.createContext(sandbox);
vm.runInContext(src,sandbox,{filename:'hd24-followup-sync.js'});

// Startup has safe-reflect and analysis data, but no action-export completion: must not package.
ok(mailClicks===0,'must not create Preview before current action export completes');
ok(replyClicks===0,'must not download reply before current action export completes');

// Wrong-signature export event must be ignored.
sandbox.dispatchEvent(new sandbox.CustomEvent('hd24-action-export-complete',{detail:{signature:'wrong-signature'}}));
ok(mailClicks===0,'wrong-signature action export must not trigger Preview');
ok(replyClicks===0,'wrong-signature action export must not trigger reply workbook');

// Correct export event unlocks exactly one package and reply workbook.
sandbox.dispatchEvent(new sandbox.CustomEvent('hd24-action-export-complete',{detail:{signature:currentSig}}));
ok(mailClicks===1,'current-signature action export must trigger exactly one Preview package');
ok(replyClicks===1,'current-signature action export must trigger exactly one reply workbook');
ok(preview.dataset.hd24Signature===currentSig,'generated Preview must be tagged with current signature');

// Duplicate completion events must remain idempotent.
sandbox.dispatchEvent(new sandbox.CustomEvent('hd24-action-export-complete',{detail:{signature:currentSig}}));
sandbox.dispatchEvent(new sandbox.CustomEvent('hd24-safe-reflect-complete',{detail:{signature:currentSig}}));
sandbox.dispatchEvent(new sandbox.CustomEvent('hd24-safe-reflect-complete',{detail:{signature:currentSig}}));
ok(mailClicks===1,'duplicate completion events must not regenerate Preview package');
ok(replyClicks===1,'duplicate completion events must not redownload reply workbook');

console.log('PASS follow-up v3 executable chain: action-export gate -> current Preview -> reply Excel exactly once');
