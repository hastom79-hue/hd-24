const fs=require('fs');
const src=fs.readFileSync('hd24-direct-reply-guard.js','utf8');
const ui=fs.readFileSync('hd24-ui-v3.js','utf8');
const refresh=fs.readFileSync('refresh-runtime.html','utf8');
function ok(x,m){if(!x)throw new Error(m)}
ok(src.includes("inflight=new Set();let lastMode='watch'"),'inflight/mode guard missing');
ok(src.includes("if(!a)return [p,'master-only',b.name,b.size,b.lastModified].join('|')"),'master-only signature missing for source-optional plants');
ok(src.includes("selectedMailMonths")&&src.includes("new Set(xs.map(Number)"),'multi-month selection snapshot missing');
ok(src.includes("results(ms=months())")&&src.includes("set.has(Number(r.month))"),'multi-month result selection missing');
ok(src.includes("JSON.stringify(months())!==JSON.stringify(c.ms)"),'post-write selected-month stale gate missing');
ok(src.includes("lastMail(r,c.p,Number(r.month))"),'per-row month mail-history anchor missing');
ok(src.includes("Number(r.month),r.kpi||''"),'reply workbook row must preserve each KPI month');
ok(src.includes("const monthLabel=c.ms.join('-')"),'multi-month filename label missing');
ok(src.includes("STATUS_FILL='FFE2E8F0'")&&src.includes("row.getCell(7).fill"),'Status / Trend fixed shading missing');
ok(src.includes("c.ms.join(',')+'|'+c.mode"),'multi-month inflight dedupe key missing');
ok(src.includes("return token(items,c.p,0)===c.tok"),'post-write KPI/history token gate missing');
ok(src.includes("if(inflight.has(key))"),'duplicate generation gate missing');
const vm=ui.match(/hd24-direct-reply-guard\.js\?v=(\d+)/);ok(vm,'production loader missing direct reply guard');ok(refresh.includes('hd24-direct-reply-guard.js?v='+vm[1]),'refresh/direct reply guard cache version mismatch');
console.log('HD24 DIRECT REPLY GUARD MULTI-MONTH PASS');

ok(src.includes("m>month()"),'future selected month fail-closed gate missing');
ok(src.includes("회신 Excel 미래/비정상 선택월 차단"),'future selected month diagnostic missing');
ok(src.includes("lastMail(r,c.p,Number(r.month))"),'each KPI row must anchor mail history to its own target month');
ok(src.includes("filter(x=>x.plant===p&&Number(x.targetMonth)===m"),'mail-history lookup must scope plant + target month');
