# HD-24 reply workbook byte verification v6

Date: 2026-09-14 KST

## Objective
Continue the production chain after v5 analysis-snapshot locking and remove the last false-completion path in the automatic follow-up package.

Target chain:
`safe reflect -> fresh KPI analysis -> _분석후속조치본.xlsx -> frozen same-signature analysis snapshot -> mail Preview -> actual reply workbook bytes -> reopen/verify -> completion`

## Defect / residual risk found
v5 pinned Preview/reply generation to the correct action-export snapshot, but it still treated the call to the asynchronous `회신용 Excel 다운로드` button as if the reply workbook had already been generated successfully.

The legacy button handler performs `await buildReplyFile(...)` before the actual file/blob is created. Therefore a synchronous `button.click()` return did not prove that:
- workbook serialization completed,
- the generated file had the expected plant/month,
- KPI row count matched the Preview,
- KPI/Target/Actual/Status values matched the frozen action-export snapshot.

This was a potential false-positive completion condition. No claim is made that an already-downloaded user workbook was corrupted; the risk was removed before full E2E completion is declared.

## Production code changes
### `hd24-followup-sync.js` v6
Commit `3909c13270b3284700b80720f6e6a5acc921b9c7`

Key changes:
- v6 remains the single automatic follow-up orchestrator.
- Added `replyRequestedSignature`, `replyDownloadedSignature`, bounded `replyAttempts`, `replyPin`, and generated-reply-file tracking.
- `beginReplyPin()` keeps `allResults` + `selectedMonth` pinned to the action-export snapshot through the asynchronous workbook build, rather than restoring immediately after the button handler begins.
- A 15-second fail-closed timeout restores live globals if the actual reply file is not produced.
- Wrapped `URL.createObjectURL` narrowly for `HDPS_KPI_Response_*_<month>M.xlsx` files so the actual generated `File` object can be inspected.
- Wrapped the existing anchor-click path after the legacy/action-export hooks; this preserves the normal browser download while also reopening the generated reply file for verification.
- `validateReplyFile(file, sig)` reopens the actual generated workbook with ExcelJS and validates:
  1. expected file name / plant / month,
  2. worksheet exists,
  3. reply row count equals Preview KPI count,
  4. every KPI exists in the same frozen action-export snapshot,
  5. no duplicate mapped KPI row,
  6. Target equals snapshot Target,
  7. Actual equals snapshot Actual,
  8. Status/Trend is nonblank,
  9. required base status tags (`Target Miss`, consecutive miss, `Worsening`) match the frozen snapshot.
- `replyDownloadedSignature` is set only after the actual workbook bytes pass all checks.
- Invalid reply workbooks are fail-closed and may retry at most twice.
- No automatic mail sending was added. Preview-before-send semantics remain unchanged.

## Production wiring
- `61a49899ff2da5577561772740e39a47943d455e` — load `hd24-followup-sync.js?v=6`.
- `5f7626b9556da6c145e77e1541e04f29743a12f4` — forced refresh helper preloads v6.

## Executable regression test
Commit `2b1ed2954ac9da9b5ef02248cdfe5f6366d78ff3`

`tests/followup-sync.test.js` now includes a VM simulation that:
- starts with deliberately stale live `allResults`,
- supplies a valid action-export snapshot for India 7M,
- creates a fake actual reply `File` only after the async reply-button path is invoked,
- routes it through the same generated-file capture concept,
- reopens fake workbook rows with a fake ExcelJS workbook,
- verifies the reply-generation state remains pinned to snapshot KPI/month/Actual values until file creation,
- verifies live globals are restored,
- verifies duplicate completion events do not regenerate the package.

Expected PASS banner when runners execute steps:
`PASS follow-up v6: actual reply workbook bytes reopened -> plant/month/count/KPI/Target/Actual/Status verified -> completion exactly once`

## Runtime regression gate
Commit `a1fe97838dc8bf747ece7bc230a514aaddb5ecc4`

The standard gate now checks for:
- action-export v26 snapshot emission,
- follow-up v6 actual workbook byte reopen,
- plant/month/count cross-checks,
- Target / Actual / Status checks,
- bounded retry,
- v6 loader wiring,
- Node syntax checks for auto-run/action-export/followup/followup-sync,
- executable follow-up regression test.

## Independent local execution verification
A standalone Node harness was executed locally against the v6 validation rules.

Syntax check: PASS.
Positive case: PASS — exact plant/month/count/KPI/Target/Actual/Status accepted.
Negative fail-closed cases: PASS for all five:
- Actual mismatch rejected,
- Target mismatch rejected,
- Status mismatch rejected,
- KPI count mismatch rejected,
- target month mismatch rejected.

Final local banner:
`PASS v6 validator harness: positive + 5 negative fail-closed cases`

This verifies the v6 validation algorithm independently. It is not counted as full live-browser E2E with the actual India/Brazil/master uploads.

## Deployment verification
Pages run `34828682805` for HEAD `a1fe97838dc8bf747ece7bc230a514aaddb5ecc4` completed `success`.

Therefore the v6 code, production loader, refresh helper, executable regression test, and runtime-gate source are deployed on Pages.

## Custom GitHub runner state
Runtime Regression run `34828684060` completed `failure`, but job `103926619085` returned `steps=null`.

Classification: hosted-runner / execution-layer failure. No checkout, invariant assertion, syntax check, or Node test step actually ran, so this is not classified as an HD-24 application/test failure.

## Current conclusion
Confirmed:
- safe-reflect fail-closed behavior remains unchanged,
- v27 upload auto-run retained,
- v4 single-orchestrator retained,
- v5 same-analysis snapshot data lock retained,
- v6 removes false completion after an async reply-button click,
- completion now requires the actual reply workbook bytes to be reopened and validated against the same Preview/action snapshot,
- latest Pages deployment is SUCCESS,
- independent positive and negative v6 validation cases PASS.

Still unproven and therefore not declared 100% complete:
- one uninterrupted live production-browser E2E with the real uploaded India/Brazil/current-master files from file selection through safe-reflect, downloaded reflected/action/reply workbooks, and visible mail Preview.
- custom hosted runner recovery; current failures remain `steps=null`.

Do not ask the user to perform manual verification unless it becomes unavoidable. Continue removing/verifying remaining risks with code, deployed Pages, uploaded files, and executable local tests.