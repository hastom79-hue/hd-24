# HD-24 coding log — follow-up exact watch KPI set v7

Date: 2026-09-14 KST

## Code paths changed
- `hd24-followup-sync.js`
- `hd24-ui-v3.js`
- `refresh-runtime.html`
- `tests/followup-sync.test.js`
- `.github/workflows/hd24-runtime-regression.yml`

## Production logic
`hd24-followup-sync.js` v7 closes the residual case where a reply workbook could contain a different KPI subset with the same row count while every substituted KPI still belonged to the full action snapshot.

Implemented:
- same watch-selection semantics as legacy follow-up: target miss, streak >=2, worsening trend, recurrence from `hd24_kpi_reply_history_v2` with >=0.6 root-cause similarity and same-cause count >=2,
- expected watch rows identified by `masterRow`,
- stable sorted watch-row fingerprint,
- Preview count must equal exact watch count,
- Preview tagged with upload signature, month, count, and exact watch-row fingerprint,
- reused Preview must match the current exact-set fingerprint,
- actual generated reply XLSX reopened through ExcelJS,
- reply row count checked against Preview count and watch count,
- every reply KPI must map to an expected watch `masterRow`,
- duplicate reply KPI rows blocked,
- complete expected-set coverage required,
- retained plant / month / Target / Actual / Status checks,
- completion requires verified exact-set fingerprint,
- empty watch set exits without generating a false empty workbook,
- retry remains bounded.

## Wiring
- production wrapper uses `hd24-followup-sync.js?v=7`,
- forced runtime refresh preloads v7,
- action export remains v26,
- legacy follow-up remains v24 only for UI/building functions and its old auto-package path remains suppressed by the single-orchestrator owner flag,
- safe-reflect code was not changed.

## Regression code
`tests/followup-sync.test.js` includes:
- positive case: KPI A is the only watch target and reply contains KPI A,
- negative case: reply has the same row count but substitutes healthy KPI B, which still exists in the full action snapshot,
- negative case must fail with `회신 Excel KPI가 관리대상 집합에 없음: KPI B`,
- retry capped at two attempts,
- no completion log allowed for wrong-set case.

Permanent runtime gate now asserts the exact-watch selector, Preview fingerprint, workbook exact-set membership/coverage, retained byte validation, and loader v7 wiring.

## Commits
- `4db5c3a82eaedb0371ce1354d63e6fe461e88ab4` — production exact-watch v7 logic
- `b8599ef3d75bd42dd517d339a5da842390882a05` — loader v7
- `71ea81935c02f805310de762c0e4afe41de184fa` — refresh v7
- `ab782020df2e5c56cf81cde907d92058bdd06f83` — executable exact-set regression source
- `7bbb48d9ad7fe2ba27fa9cbf30416074de0e371c` — runtime regression gate v7
- `188374e8c8449ab6795bc3737a437090a038a240` — development-log deployment/runner evidence update

## Execution / deployment evidence
- Pages run `34832293532` for HEAD `a4d6ce21897b47871bd680a3e1515e6360cf83e4`: `completed/success`.
- Pages run `34832179378` for test commit `ab782020df2e5c56cf81cde907d92058bdd06f83`: `completed/success`.
- Runtime Regression run `34832295335`, job `103938164273`: `completed/failure`, `steps=null`.

Interpretation of custom regression failure: the job did not start any workflow step, so this remains a hosted-runner execution-layer failure. It is neither an application-test failure nor an executable v7 PASS.

## Failed / superseded states retained
- v6 full-snapshot membership was insufficient to prove the exact watch subset when row count happened to match; v7 supersedes this check with expected watch-set identity.
- custom hosted regression still does not execute (`steps=null`); this limitation remains open and is not hidden.

## Open verification
One uninterrupted real production-browser E2E with the actual user-provided India/Brazil/current-master files remains required before 100% completion can be declared.