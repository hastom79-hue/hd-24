# HD-24 follow-up exact watch KPI set v7

Date: 2026-09-14 KST

## Objective
Continue the automatic HD-24 production chain after v6 reply-workbook byte validation and remove the remaining same-count / wrong-KPI-set false-positive path.

Target chain:
`safe reflect -> fresh KPI analysis -> _분석후속조치본.xlsx -> frozen same-signature action snapshot -> exact watch KPI selection -> mail Preview -> actual reply workbook bytes -> exact-set + value verification -> completion`

## Residual defect found
v6 correctly reopened the actual generated reply workbook and checked plant, month, row count, KPI membership in the full action-export snapshot, Target, Actual, and Status/Trend.

However, v6 did not prove that the reply workbook contained the **same exact watch subset** used by the automatic `btnMailWatch` Preview. A pathological race or stale/manual substitution could therefore produce a different KPI subset with the same row count, where every substituted KPI still belonged to the full action snapshot. Under that shape, v6's count + full-snapshot-membership checks could pass.

This was a residual false-completion risk, not evidence that an already generated user file was wrong.

## Production correction
### `hd24-followup-sync.js` v7
Commit `4db5c3a82eaedb0371ce1354d63e6fe461e88ab4`

Added a production-side exact reconstruction of the same legacy watch-selection semantics:
- current target miss: `!achieved`
- consecutive miss: `streak >= 2`
- worsening: `trend === 'down'`
- recurrence: same reply-history key `hd24_kpi_reply_history_v2`, same normalized KPI matching, same root-cause similarity threshold `>= 0.6`, recurrence when same cause count is at least 2.

New exact-set guards:
- `expectedWatchItems(sig)` derives the expected automatic follow-up subset from the frozen action-export snapshot.
- `expectedWatchRows(sig)` produces the sorted `masterRow` identity set.
- Preview subject KPI count must equal the exact watch count; merely being nonnegative is no longer sufficient.
- Preview is tagged with `data-hd24-rows`, a fingerprint of the expected sorted master-row set.
- A previously tagged Preview is reusable only when its signature **and exact-set fingerprint** match the current upload pair.
- Actual reopened reply workbook rows must all belong to the expected watch set.
- Reply workbook row count must equal both Preview count and expected watch count.
- Duplicate rows remain blocked.
- Complete expected-set coverage is required; same-count substitution cannot pass.
- Target / Actual / Status/Trend / plant / month / actual workbook-byte validation from v6 is retained.
- Completion additionally requires the verified exact row-set fingerprint.
- If the expected watch set is empty, the automatic package closes cleanly without generating a false empty reply workbook.

No safe-reflect validation was weakened. No automatic email send was introduced.

## Production wiring
- `b8599ef3d75bd42dd517d339a5da842390882a05` — production loader uses `hd24-followup-sync.js?v=7`.
- `71ea81935c02f805310de762c0e4afe41de184fa` — forced runtime refresh preloads v7.

## Executable regression source
Commit `ab782020df2e5c56cf81cde907d92058bdd06f83`

`tests/followup-sync.test.js` now models a two-KPI frozen snapshot:
- KPI A = watch target (miss + consecutive + worsening)
- KPI B = healthy / non-watch

Positive path expects:
- Preview count = 1
- Preview exact-set fingerprint = masterRow 11
- actual reply workbook contains KPI A
- actual generated workbook bytes are reopened and value-checked
- live globals restore after asynchronous generation

Negative path intentionally creates a **same-count wrong-set substitution**:
- Preview count remains 1
- generated reply workbook contains healthy KPI B instead of watch KPI A
- KPI B still belongs to the full action snapshot, so this specifically attacks the v6 residual gap
- v7 must reject it with `회신 Excel KPI가 관리대상 집합에 없음: KPI B`
- retry remains bounded to two attempts
- completion must never be logged.

Expected PASS banner when an executable Node runner actually runs the test:
`PASS follow-up v7: exact watch KPI set -> Preview fingerprint -> actual reply workbook bytes; same-count wrong-set rejected fail-closed`

## Runtime regression gate
Commit `7bbb48d9ad7fe2ba27fa9cbf30416074de0e371c`

The permanent runtime gate is updated from v6 to v7 and now requires:
- same recurrence-history source as legacy follow-up,
- exact watch selector,
- Preview exact-set count and fingerprint,
- actual reply-workbook exact-set membership and coverage,
- retained v6 byte reopen / Target / Actual / Status checks,
- loader v7 wiring,
- executable `tests/followup-sync.test.js`.

## Deployment and execution evidence
Latest repository HEAD observed after this v7 log push: `a4d6ce21897b47871bd680a3e1515e6360cf83e4` (`docs: log exact watch KPI set follow-up v7`).

GitHub Pages:
- run `34832293532`
- HEAD `a4d6ce21897b47871bd680a3e1515e6360cf83e4`
- status `completed`
- conclusion `success`
- therefore the v7 production loader / refresh helper / regression-source commits preceding this HEAD are included in the successfully deployed Pages state.

Custom Runtime Regression:
- run `34832295335`
- HEAD `a4d6ce21897b47871bd680a3e1515e6360cf83e4`
- job `103938164273`
- job conclusion `failure`
- `steps=null`

Classification: this is the same hosted-runner execution-layer failure already observed repeatedly. No workflow step started, so it is **not** evidence of an application assertion failure and it does not prove the v7 Node test passed either.

A preceding Pages run for the executable v7 test commit `ab782020df2e5c56cf81cde907d92058bdd06f83` also completed successfully as run `34832179378`.

## Verification status
Confirmed:
- production loader points to v7,
- refresh helper points to v7,
- legacy follow-up remains v24 with single-orchestrator owner guard,
- action-export remains v26 with frozen current-month snapshot emission,
- safe-reflect path was not modified,
- latest v7 repository state is deployed successfully to GitHub Pages,
- same-count/wrong-set regression case is permanently encoded in the repository test source.

Not yet claimed:
- executable Node v7 PASS from GitHub hosted runner, because the custom runner failed before steps started,
- uninterrupted live production-browser E2E with the actual India/Brazil/current-master files.

## Remaining completion gate
Do not declare 100% complete until one uninterrupted real production-browser E2E is observed with the actual India/Brazil/current-master files, including:
1. file selection,
2. safe reflect,
3. reflected workbook download,
4. fresh KPI analysis,
5. `_분석후속조치본.xlsx`,
6. exact watch-set Preview,
7. actual reply workbook generation and reopened-byte validation,
8. visible mail Preview.

Do not ask the user to perform manual verification unless unavoidable. Continue with deployed Pages / executable tests / code-level verification first.