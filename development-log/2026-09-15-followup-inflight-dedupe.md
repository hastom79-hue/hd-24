# HD-24 Follow-up In-Flight Dedupe Regression — 2026-09-15

## Requirement
Continue verification after the completed-cycle exact-once test. The remaining narrow risk is duplicate wake-up signals arriving while reply-workbook validation is still asynchronous/in flight.

## Risk examined
A valid cycle can be woken by action-export completion, safe-reflect completion, MutationObserver/watchdog, and scheduled retries. The runtime already uses `runningSignature/runningCycle` and `replyRequestedSignature/replyRequestedCycle`, but this needed a permanent executable regression.

## Added test
`tests/followup-inflight-dedupe.test.js`

The test runs the real production `hd24-followup-sync.js` in a Node VM sandbox. ExcelJS `load()` is deliberately held on a deferred promise so reply validation remains in flight. During that window the test repeatedly sends:
- duplicate `hd24-action-export-complete`
- duplicate `hd24-safe-reflect-complete`
- repeated watchdog callbacks

Before the deferred validation is released, expected counters remain Preview=1, Reply=1, Complete=0. After validation is released, expected final counters are Preview=1, Reply=1, Complete=1.

## CI integration
Updated `.github/workflows/hd24-followup-exact-once.yml` so both the completed-cycle duplicate-signal test and the new in-flight duplicate-signal test are syntax-checked and executed.

## Production code impact
None. No runtime safety logic was changed because code inspection did not reveal a production defect. This step strengthens permanent verification only.

## Known infrastructure issue
The repository's custom GitHub Actions jobs have repeatedly ended with `steps=null`. If this workflow shows the same pattern, it is classified as runner/execution-layer failure because the Node assertions never start. Pages deployment is checked independently.
