const fs=require('fs'),vm=require('vm'),assert=require('assert');
const code=fs.readFileSync('hd24-action-export-watchdog.js','utf8');
const listeners={};
const timeouts=[];
const handlers={};
const file=(name,size,lastModified)=>({name,size,lastModified});
const els={
  plantSelect:{value:'india',addEventListener:(n,fn)=>handlers['plantSelect:'+n]=fn},
  srcFile:{files:[file('src.xlsx',10,1)],addEventListener:(n,fn)=>handlers['srcFile:'+n]=fn},
  masterFile:{files:[file('master.xlsx',20,2)],addEventListener:(n,fn)=>handlers['masterFile:'+n]=fn},
  resultCard:{dataset:{}},
  log:{textContent:''}
};
const document={readyState:'complete',getElementById:id=>els[id],addEventListener(){}};
const window={
  hd24SafeReflectSuccessSignature:'',
  addEventListener:(n,fn)=>(listeners[n]||(listeners[n]=[])).push(fn),
  log:()=>{}
};
const sandbox={window,document,Date,console,setTimeout:(fn,ms)=>{const t={fn,ms,cancelled:false};timeouts.push(t);return t},clearTimeout:t=>{if(t)t.cancelled=true}};
vm.createContext(sandbox);vm.runInContext(code,sandbox);
const sig='india|src.xlsx|10|1|master.xlsx|20|2';
window.hd24SafeReflectSuccessSignature=sig;
for(const fn of listeners['hd24-safe-reflect-complete'])fn({detail:{signature:sig}});
assert.equal(timeouts.length,5,'must arm five bounded wakeups');
timeouts[0].fn();
assert.ok(els.resultCard.dataset.hd24ActionExportWake.startsWith(sig+'|1|'),'first safe wake missing');
const before=els.resultCard.dataset.hd24ActionExportWake;
for(const fn of listeners['hd24-action-export-complete'])fn({detail:{signature:sig}});
for(const t of timeouts.slice(1))if(!t.cancelled)t.fn();
assert.equal(els.resultCard.dataset.hd24ActionExportWake,before,'wakeups continued after action export completion');

// Mismatched safe signature must never arm a wakeup for the current upload pair.
window.hd24SafeReflectSuccessSignature='other';
for(const fn of listeners['hd24-safe-reflect-complete'])fn({detail:{signature:'other'}});
assert.equal(timeouts.length,5,'mismatched safe signature must not arm');

// A fresh-cycle reset must clear the completed latch and must cancel every pending wakeup.
handlers['srcFile:change']();
window.hd24SafeReflectSuccessSignature=sig;
for(const fn of listeners['hd24-safe-reflect-complete'])fn({detail:{signature:sig}});
assert.equal(timeouts.length,10,'reset must permit five new wakeups for a fresh cycle');
handlers['srcFile:change']();
assert.ok(timeouts.slice(5).every(t=>t.cancelled),'file change must cancel all pending wakeups');

console.log('PASS action-export watchdog extended: bounded + same-signature + completion stop + mismatch block + reset cancel');
