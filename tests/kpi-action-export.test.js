const fs=require('fs');
function ok(cond,msg){if(!cond)throw new Error(msg)}
const src=fs.readFileSync('hd24-action-export.js','utf8');
const guard=fs.readFileSync('hd24-action-cycle-guard.js','utf8');
const loader=fs.readFileSync('hd24-ui-v3.js','utf8');
const refresh=fs.readFileSync('refresh-runtime.html','utf8');
ok(src.includes('hd24SafeReflectSuccessSignature'),'must require safe-reflect success signature');
ok(src.includes('검증반영본'),'must capture only verified reflected workbook downloads');
ok(src.includes('applyKpiActionColumn'),'must call approved workbook postprocessor');
ok(src.includes("/\\.xlsm$/i.test(master.name)"),'must fail closed for XLSM macro preservation');
ok(src.includes('hd24-action-export-complete'),'must emit completion event');
ok(src.includes('analysisMutationSeen'),'must track a post-judge result-card mutation');
ok(src.includes('!analysisMutationSeen'),'must block action export until post-judge mutation is observed');
ok(src.includes('analysisReadySignature!==sig||analysisReadyCycle!==workCycle'),'must require fresh-analysis readiness for current upload cycle');
ok(src.includes('results.filter(r=>Number(r.month)===horizon)'),'must require current-month analysis results');
ok(src.includes('triggerCycle===currentCycle()'),'analysis mutation must belong to current upload cycle');
ok(src.includes('captureCycle!==currentCycle()||signature()!==sig'),'safe workbook capture must reject stale async completion');
ok(src.includes("if(workCycle!==currentCycle()||signature()!==sig)throw new Error('stale action-export cycle after workbook load')"),'workbook load must reject stale cycle');
ok(src.includes("if(workCycle!==currentCycle()||signature()!==sig)throw new Error('stale action-export cycle after workbook write')"),'workbook write must reject stale cycle');
ok(src.includes('cycle:workCycle'),'completion event must carry upload cycle');
ok(guard.includes('stopImmediatePropagation'),'cycle guard must stop stale completion propagation');
ok(guard.includes('eventCycle!==currentCycle'),'cycle guard must compare event/current cycles');
// Legacy action-export/watchdog/followup-sync modules are retained as regression fixtures only.
// Production intentionally uses the single current runtime chain; reintroducing the legacy
// consumers would recreate duplicate execution/race risk.
ok(!loader.includes('kpi-action-classifier.js'),'production loader must not reintroduce legacy classifier');
ok(!loader.includes('kpi-action-workbook.js'),'production loader must not reintroduce legacy workbook postprocessor');
ok(!loader.includes('hd24-action-export.js'),'production loader must not reintroduce legacy action export producer');
ok(!loader.includes('hd24-action-cycle-guard.js'),'production loader must not reintroduce legacy cycle guard');
ok(!loader.includes('hd24-action-export-watchdog.js'),'production loader must not reintroduce legacy watchdog');
ok(!loader.includes('hd24-followup-sync.js'),'production loader must not reintroduce legacy follow-up sync');
ok(loader.includes('hd24-auto-run.js?v=27'),'production loader must include current auto-run');
ok(loader.includes('hd24-pipeline-gate.js?v=22'),'production loader must include current pipeline gate');
ok(loader.includes('hd24-followup.js?v=71'),'production loader must include current follow-up');
ok(loader.includes('hd24-direct-reply-guard.js?v=12'),'production loader must include direct reply guard');
ok(loader.includes('hd24-reply-import-dedupe.js?v=1'),'production loader must include reply import dedupe');
ok(!refresh.includes('hd24-action-export.js'),'refresh helper must not preload legacy action export');
ok(!refresh.includes('hd24-action-cycle-guard.js'),'refresh helper must not preload legacy cycle guard');
ok(refresh.includes('hd24-auto-run.js?v=27'),'refresh helper must preload current auto-run');
ok(refresh.includes('hd24-pipeline-gate.js?v=22'),'refresh helper must preload current pipeline gate');
ok(refresh.includes('hd24-followup.js?v=71'),'refresh helper must preload current follow-up');
ok(refresh.includes('hd24-direct-reply-guard.js?v=12'),'refresh helper must preload direct reply guard');
ok(refresh.includes('hd24-reply-import-dedupe.js?v=1'),'refresh helper must preload reply import dedupe');
console.log('PASS kpi-action-export legacy fixture invariants + current production runtime wiring');