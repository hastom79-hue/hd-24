const fs=require('fs'),assert=require('assert');
const code=fs.readFileSync('hd24-followup-sync.js','utf8');

assert.ok(code.includes('function currentCycle(){return Number(window.hd24ActionCycle)||0}'),'followup must read monotonic upload cycle');
assert.ok(code.includes("if(currentCycle()!==cycle||signature()!==sig)throw new Error('검증 시작 전 업로드 cycle 변경')"),'stale async reply validation must fail closed before workbook verification');
assert.ok(code.includes("if(currentCycle()!==cycle||signature()!==sig)throw new Error('회신 Excel 검증 중 업로드 cycle 변경')"),'stale async reply validation must fail closed after workbook load');
assert.ok(code.includes("activeSignature=signature();activeCycle=currentCycle();completedSignature='';completedCycle=0;runningSignature='';runningCycle=0;actionExportSignature='';actionExportCycle=0;replyRequestedSignature='';replyRequestedCycle=0;replyDownloadedSignature='';replyDownloadedCycle=0;replyAttempts={};lastState='';replyFiles.clear();"),'hardReset must clear all followup signature/cycle completion state');
assert.ok(code.includes('clearPreview();const cycle=activeCycle;[0,100,300,700,1500,3000,6000,10000,15000]'),'hardReset must clear stale Preview before cycle-bound rescheduling');
assert.ok(code.includes('eventSig!==sig||eventCycle!==cycle'),'action-export completion from another signature or upload cycle must be ignored');
assert.ok(code.includes('actionExportSignature!==sig||actionExportCycle!==cycle'),'followup package must require same-cycle action export');
assert.ok(code.includes('Number(p.dataset.hd24Cycle)===Number(cycle)'),'Preview must belong to current upload cycle');
assert.ok(code.includes("(sig===completedSignature&&cycle===completedCycle)||(sig===runningSignature&&cycle===runningCycle)"),'duplicate execution suppression must be cycle-aware');
assert.ok(code.includes('if(currentCycle()!==cycle)return;'),'stale retry completion must not clear current-cycle state');

console.log('PASS followup reset guard v8: same-signature stale cycle, async reply validation, preview ownership and duplicate execution remain fail-closed');
