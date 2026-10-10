const assert=require('node:assert/strict');
const fs=require('node:fs');
const html=fs.readFileSync('refresh-runtime.html','utf8');
const script=html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
assert.ok(script,'refresh script exists');
const assets=[...html.matchAll(/'\.\/([^']+)'/g)].map(m=>m[1]);
assert.equal(assets.length,20,'20 assets in refresh manifest');
assert.equal(new Set(assets).size,20,'no duplicate assets');
assert.ok(!script.includes('caches.delete('),'do not delete unrelated caches');
async function run(failedUrl){
 const status={textContent:''},calls=[],location={replace:url=>calls.push(['redirect',url])};
 const document={getElementById:()=>status};
 const fetch=async url=>{calls.push(['fetch',url]);return {ok:!failedUrl||!url.includes(failedUrl),status:404}};
 const setTimeout=fn=>fn();
 await new Function('document','fetch','location','setTimeout','Date',script+';return new Promise(resolve=>setTimeout(resolve,0))')(document,fetch,location,setTimeout,Date);
 return {status:status.textContent,calls};
}
(async()=>{
 const good=await run(null);
 assert.equal(good.calls.filter(x=>x[0]==='fetch').length,20);
 assert.equal(good.calls.filter(x=>x[0]==='redirect').length,1);
 const bad=await run('mapping_brazil.json');
 assert.equal(bad.calls.filter(x=>x[0]==='redirect').length,0);
 assert.match(bad.status,/새로고침 실패/);
 console.log('HD24 refresh runtime regression: PASS');
})().catch(e=>{console.error(e);process.exitCode=1});
