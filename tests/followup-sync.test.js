const fs=require('fs');
function ok(cond,msg){if(!cond)throw new Error(msg)}
const src=fs.readFileSync('hd24-followup-sync.js','utf8');
const loader=fs.readFileSync('hd24-ui-v3.js','utf8');
const refresh=fs.readFileSync('refresh-runtime.html','utf8');
ok(src.includes("window.hd24SafeReflectSuccessSignature!==sig||actionExportSignature!==sig||!a.ready"),'follow-up must wait for safe-reflect, action export, and current analysis');
ok(src.includes("window.addEventListener('hd24-action-export-complete',actionExportComplete)"),'action-export completion listener missing');
ok(src.includes("eventSig!==sig"),'action-export event must match current upload signature');
ok(src.includes("replyDownloadedSignature===sig"),'reply workbook dedupe signature missing');
ok(src.includes("if(activeSignature!==sig)hardReset"),'duplicate safe-complete must not reset same-signature state');
ok(src.includes("p.dataset.hd24Signature===sig"),'Preview must be tagged to current signature');
ok(src.includes("if(stale&&stale.style.display!=='none'&&!stale.dataset.hd24Signature){stale.style.display='none';}"),'untagged legacy Preview must not be trusted');
ok(loader.includes('hd24-followup-sync.js?v=3'),'production loader must use follow-up sync v3');
ok(refresh.includes('hd24-followup-sync.js?v=3'),'refresh helper must preload follow-up sync v3');
console.log('PASS follow-up chain: action-export gate + current-signature Preview + single reply workbook');
