const fs=require('fs');
const vm=require('vm');
function ok(v,msg){if(!v)throw new Error(msg)}

const source=fs.readFileSync('hd24-auto-run.js','utf8');
ok(source.includes('function coreReady()'),'v26 core readiness guard missing');
ok(source.includes("btn.dataset.safeReflectReady==='1'"),'safe-reflect dataset gate missing');
ok(source.includes('window.hd24SafeReflectReady===true'),'safe-reflect global gate missing');
ok(source.includes('hasSrc&&hasMaster&&hasZip&&hasMapping'),'all parsed prerequisites must be required');
ok(source.includes('if(sig&&btn&&btn.disabled&&safe&&core.ok)'),'stale-disabled repair must require all safe/core prerequisites');
ok(source.includes('btn.disabled=false'),'stale-disabled UI repair missing');
ok(source.includes("writeLog('자동 실행 대기: '+state)"),'diagnostic wait-state log missing');

const listeners={};
function mkEl(id){return {id,disabled:false,dataset:{},files:[],value:'',_ls:{},addEventListener(ev,fn){(this._ls[ev]??=[]).push(fn)},dispatch(ev){for(const f of this._ls[ev.type]||[])f(ev)},click(){for(const f of this._ls.click||[])f({type:'click'})}}}
const els={srcFile:mkEl('srcFile'),masterFile:mkEl('masterFile'),plantSelect:mkEl('plantSelect'),btnReflect:mkEl('btnReflect'),log:mkEl('log')};
els.plantSelect.value='india';
const sandbox={console,setTimeout,setInterval,clearInterval,Date,Array,CustomEvent:class{constructor(type,opts){this.type=type;this.detail=opts?.detail}},MutationObserver:class{constructor(fn){this.fn=fn}observe(){}},document:{readyState:'complete',getElementById:id=>els[id],addEventListener(ev,fn){(listeners[ev]??=[]).push(fn)}},srcWorkbook:{Sheets:{}},masterWorkbook:{Sheets:{}},masterZip:{},mappingData:[{kpi:'x'}]};
sandbox.window=sandbox;
sandbox.addEventListener=(ev,fn)=>{(listeners[ev]??=[]).push(fn)};
sandbox.dispatchEvent=ev=>{for(const f of listeners[ev.type]||[])f(ev)};
sandbox.log=m=>{els.log.textContent=(els.log.textContent||'')+m+'\n'};
sandbox.hd24SafeReflectReady=true;
sandbox.checkReady=()=>{};
els.btnReflect.dataset.safeReflectReady='1';
els.btnReflect.disabled=true;
function sig(){const sf=els.srcFile.files[0],mf=els.masterFile.files[0];return [els.plantSelect.value,sf.name,sf.size,sf.lastModified,mf.name,mf.size,mf.lastModified].join('|')}
els.btnReflect.addEventListener('click',()=>{sandbox.log('SAFE_CLICK');sandbox.hd24SafeReflectSuccessSignature=sig();sandbox.dispatchEvent(new sandbox.CustomEvent('hd24-safe-reflect-complete',{detail:{signature:sig()}}));});
vm.runInNewContext(source,sandbox,{filename:'hd24-auto-run.js'});
setTimeout(()=>{
  els.srcFile.files=[{name:'india.xlsx',size:1,lastModified:11}];els.srcFile.dispatch({type:'change'});
  els.masterFile.files=[{name:'master.xlsx',size:2,lastModified:22}];els.masterFile.dispatch({type:'change'});
},10);
setTimeout(()=>{
  const log=els.log.textContent||'';
  ok(els.btnReflect.disabled===false,'stale disabled button was not repaired after all safe/core prerequisites became true');
  ok(log.includes('SAFE_CLICK'),'native safe-reflect click path did not execute');
  ok((log.match(/자동 실행 완료 확인/g)||[]).length===1,'success signature should be logged exactly once');
  console.log('PASS auto-run v26 readiness + stale-disabled repair');
  process.exit(0);
},700);
