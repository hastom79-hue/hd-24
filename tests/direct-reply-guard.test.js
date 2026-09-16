const fs=require('fs');
const src=fs.readFileSync('hd24-direct-reply-guard.js','utf8');
const ui=fs.readFileSync('hd24-ui-v3.js','utf8');
const refresh=fs.readFileSync('refresh-runtime.html','utf8');
function ok(x,m){if(!x)throw new Error(m)}
ok(src.includes("const $=id=>document.getElementById(id),inflight=new Set();let lastMode='watch'"),'inflight/mode guard missing');
ok(src.includes("if(!b)return ''")&&src.includes("if(p==='ulsan')return [p,'master-only',b.name,b.size,b.lastModified].join('|')")&&src.includes("if(!a)return ''"),'plant-aware file signature missing');
ok(src.includes("return [p,a.name,a.size,a.lastModified,b.name,b.size,b.lastModified].join('|')"),'India/Brazil file-pair signature missing');
ok(src.includes("if(signature()!==c.sig||plant()!==c.p||month()!==c.m)return false"),'post-write file/plant/month stale gate missing');
ok(src.includes("return token(items,c.p,c.m)===c.tok"),'post-write KPI/history token gate missing');
ok(src.includes("if(inflight.has(key))"),'duplicate generation gate missing');
ok(src.includes("mh.preparedAt||''" )&&src.includes("last.replyReceivedAt||''"),'mail/reply derived state missing from token');
ok(src.includes("['btnMailMonth','month'],['btnMailWatch','watch'],['btnMailAll','all']"),'preview mode tracking missing');
ok(ui.includes('hd24-direct-reply-guard.js?v=2'),'production loader missing direct reply guard v2');
ok(refresh.includes('hd24-direct-reply-guard.js?v=2'),'refresh preload missing direct reply guard v2');
console.log('HD24 DIRECT REPLY GUARD PASS');