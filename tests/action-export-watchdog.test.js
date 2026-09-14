const fs=require('fs'),vm=require('vm'),assert=require('assert');
const code=fs.readFileSync('hd24-action-export-watchdog.js','utf8');
const listeners={};
const timeouts=[];
const file=(name,size,lastModified)=>({name,size,lastModified});
const els={
  plantSelect:{value:'india',addEventListener(){}},
  srcFile:{files:[file('src.xlsx',10,1)],addEventListener(){}},
  masterFile:{files:[file('master.xlsx',20,2)],addEventListener(){}},
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
console.log('PASS action-export watchdog: late-settle wakeups are bounded, same-signature, and stop on completion');
