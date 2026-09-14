const fs=require('fs'),assert=require('assert');
const code=fs.readFileSync('hd24-followup-sync.js','utf8');

assert.ok(code.includes("if(signature()!==sig)throw new Error('검증 중 업로드 파일쌍 변경')"),'stale async reply validation must fail closed when upload signature changes');
assert.ok(code.includes("activeSignature=signature();completedSignature='';runningSignature='';actionExportSignature='';replyRequestedSignature='';replyDownloadedSignature='';replyAttempts={};lastState='';replyFiles.clear();"),'hardReset must clear all followup completion/request signatures');
assert.ok(code.includes('clearPreview();[0,100,300,700,1500,3000,6000,10000,15000]'),'hardReset must clear stale Preview before rescheduling');
assert.ok(code.includes("if(!sig||eventSig!==sig)return;"),'action-export completion from another upload signature must be ignored');
assert.ok(code.includes("if(window.hd24SafeReflectSuccessSignature!==sig||actionExportSignature!==sig||!snap||!a.ready)"),'followup package must require same-signature safe reflect, action export, snapshot and ready analysis');
assert.ok(code.includes("if(Number(a.month)!==Number(snap.month))"),'live month must match frozen action-export snapshot month');
assert.ok(code.includes("if(!sig||sig===completedSignature||sig===runningSignature)return;"),'duplicate same-signature package execution must remain suppressed');

console.log('PASS followup reset guard: stale async result, cross-signature event, stale preview and duplicate execution remain fail-closed');
