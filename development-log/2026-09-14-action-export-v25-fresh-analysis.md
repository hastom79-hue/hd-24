# HD-24 Action Export Fresh-Analysis Gate — v24→v25

Date: 2026-09-14 KST

## Development log

### Requirement
After the safe-reflect workbook is produced for the current source/master upload pair, HD-24 must use the analysis result generated for that same pair before creating `_분석후속조치본.xlsx`. Stale `allResults` from a previous upload must never be accepted.

### Defect found in v23
`hd24-action-export.js` triggered `btnJudge` after same-signature safe-reflect success, but `makeFinalActionWorkbook()` only required a non-empty `allResults` and valid `selectedMonth`. Because upload reset did not clear global analysis results, stale results from the previous file pair could satisfy those conditions before the current asynchronous analysis finished.

### v24 attempted fix
Commit `57cd8c2654c70209b9b4f74604aca0978a309141` added `analysisReadySignature`, `judgeClickedAt`, current-month filtering, and an analysis-ready gate. Loader/refresh were updated by `fab21ec61e5c966981b920b058f598e7940f28c0` and `ea32dedbe7515e5c3c84cc517ba68ed9f8166c4d`.

### v24 validation failure found during code execution review
The v24 schedule still called `tryTriggerJudge(); markAnalysisReady(); makeFinalActionWorkbook()` in the same timer callback. Immediately after `btnJudge.click()`, stale previous `allResults` could still be present. Therefore v24 could mark the current signature analysis-ready before a fresh analysis rendering occurred. This attempt is retained as a failed/intermediate correction and is superseded by v25.

### v25 corrective action
Commit `eb2c503e3991db82e543c69809008741015e65c5` — `fix: require post-judge result mutation for action export v25`

v25 adds `analysisMutationSeen` and requires all of the following before action workbook generation:
- current upload signature exists;
- same-signature safe-reflect success exists;
- `btnJudge` was triggered for that signature;
- `resultCard` mutated after that trigger while the same safe signature remained active;
- current `selectedMonth` is valid;
- `allResults` contains results for that current month;
- `analysisReadySignature` equals the current upload signature;
- captured safe-reflect workbook also belongs to the current signature.

Polling alone can no longer create analysis readiness. Only the post-judge result-card MutationObserver sets `analysisMutationSeen=true`. Existing XLSM macro-preservation fail-closed behavior and all safe-reflect checks remain unchanged.

### Production connection
- `14e3682ed3c1fe703ea37e392a173bd8e7df7a40` — loader now uses `hd24-action-export.js?v=25`.
- `19dfb2cd8d79295031909e48b939aa4979477f63` — forced refresh preloads `hd24-action-export.js?v=25`.

### Regression correction
The permanent test still expected action-export v23. That stale assertion would become a genuine failure when hosted runners recover.

Commit `bc695e8d1befb80646d23c2cdfd0d8888fec0cbb` updates `tests/kpi-action-export.test.js` to assert:
- safe-reflect signature gate;
- verified workbook capture;
- XLSM fail-closed behavior;
- post-judge `analysisMutationSeen` gate;
- same-trigger/same-safe-signature mutation ownership;
- current-month result filtering;
- current-signature analysis readiness;
- production loader v25;
- refresh helper v25.

## Coding log

### Files changed
1. `hd24-action-export.js`
   - v24 intermediate fresh-analysis signature gate added.
   - v25 added post-judge DOM mutation proof and reset logic.
2. `hd24-ui-v3.js`
   - action export cache version advanced to v25.
3. `refresh-runtime.html`
   - action export forced preload advanced to v25.
4. `tests/kpi-action-export.test.js`
   - stale v23 expectation removed; v25 invariants added.

### Preserved safeguards
- No edit to `safe-kpi-mapping.js`.
- No future-month, previous-month, unit, formula, duplicate-target, or post-write validation bypass.
- `.xlsm` still fails closed for ExcelJS resave.
- Mail remains Preview/approval based; this change does not auto-send email.

### Deployment / execution state
- Prior sync-v2 Pages run `34811817080`: build SUCCESS, report-build-status SUCCESS, deploy SUCCESS.
- v24 was intentionally superseded after the immediate-poll stale-result defect was found.
- v25 latest deployment must be verified on its newest Pages run before declaring production PASS.
- Custom GitHub workflows have repeatedly failed before steps execute in this work period; those failures remain separate from application assertion results unless a job actually reaches test steps.

### Remaining verification
Full live-browser E2E with the real uploaded files remains the final end-to-end evidence target:
`file selection → safe reflect → verified workbook → fresh KPI analysis → _분석후속조치본.xlsx → reply workbook → mail Preview`.
Do not claim full live-browser E2E PASS until that chain is observed or an executable browser harness successfully reproduces it.
