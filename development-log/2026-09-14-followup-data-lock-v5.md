# HD-24 follow-up data-lock v5

Date: 2026-09-14 KST

## Objective
Continue the production chain after v4 single-orchestrator hardening and verify that the reply workbook and mail Preview cannot drift from the exact KPI analysis that produced `_분석후속조치본.xlsx`.

Target chain:
`safe reflect -> fresh KPI analysis -> _분석후속조치본.xlsx -> same analysis snapshot -> mail Preview -> reply Excel`

## Defect/risk found
The v4 chain correctly waited for `hd24-action-export-complete`, but the follow-up module still rebuilt its Preview/reply workbook from the mutable global `allResults` / `selectedMonth` state at click time.

This left a residual race:
- action workbook could finish from one current analysis result,
- then `allResults` or `selectedMonth` could change before Preview/reply generation,
- causing the follow-up package to represent a different month or KPI state even though the upload signature was unchanged.

No evidence was found that this had already corrupted a user file; this was removed as a residual consistency risk before declaring E2E completion.

## Code changes
### Action export v26
Commit `9c5bbed676de399caebe76af403da362a9ca322c`
- Added `snapshotItem()`.
- Freezes `a.current` before asynchronous workbook serialization.
- Validates the snapshot month/masterRow values fail-closed.
- `hd24-action-export-complete` now carries:
  - upload signature
  - output file name
  - action column
  - abnormal count
  - analysis month
  - frozen current-month KPI items including KPI, row, target, actual, achieved, streak and trend.

### Follow-up sync v5
Commit `e4dc7c270df1e77d08fe0c1d0c06949dd49e1644`
- Same-signature validated action snapshot is mandatory before packaging.
- Snapshot stored as `window.hd24FollowupSnapshot`.
- `withSnapshot()` temporarily pins `allResults` and `selectedMonth` only while the legacy Preview/reply generation code executes, then restores the live globals.
- Preview generation and reply-file generation both run under the same frozen snapshot.
- Preview identity is validated/tagged with upload signature, month and KPI count.
- Missing/invalid/wrong-signature snapshots fail closed.
- Existing manual Preview/send/import UI remains unchanged.

### Production cache wiring
- `1e719f158f2bc642481391dd5acd3e5fab5526b5` — loader now uses `hd24-action-export.js?v=26` and `hd24-followup-sync.js?v=5`.
- `8ae891fd1479f93f9e87ad8f20fe62d7339b47d1` — refresh helper preloads the same v26/v5 assets.

### Executable regression test
Commit `a8698d53683f8b88fff5aacfe41ebf928a09dff4`
`tests/followup-sync.test.js` now verifies:
1. package cannot run without action-export snapshot payload,
2. wrong-signature snapshot is ignored,
3. stale live `allResults` is not used,
4. Preview sees the frozen KPI/month/actual values,
5. reply generation sees the identical frozen KPI/month/actual values,
6. live globals are restored after temporary pinning,
7. Preview signature/month/count tags are correct,
8. duplicate completion events do not regenerate or redownload the package.

### Runtime regression gate
Commit `a4a288bca3ad701243a3de1d3fa3d6df8343e931`
- Added action-export v26 snapshot invariants.
- Added follow-up v5 snapshot/data-lock invariants.
- Added `node --check hd24-action-export.js` to the standard regression command list.
- Version banner updated to action-export v26 / follow-up v5.

## Independent execution verification
Because the repository custom GitHub runner is still failing before steps start, an independent local Node harness was executed against the v5 snapshot algorithm.

Result:
`PASS v5 snapshot harness: same signature/month/KPI/actual dataset pinned for Preview and reply; live globals restored; wrong signature blocked`

Validated behavior:
- same signature: PASS
- same month: PASS
- same KPI list: PASS
- same Actual values: PASS
- live global state restoration: PASS
- wrong-signature fail-closed: PASS

The harness is verification of the v5 state transition/data-lock algorithm; it is not counted as a full live-browser E2E with the actual uploaded workbooks.

## GitHub Actions state
Runtime Regression run `34828014277` for HEAD `a4a288bca3ad701243a3de1d3fa3d6df8343e931` ended `failure`, but job `103924525230` has `steps=null`.

Classification remains execution-layer/runner failure: workflow assertions and Node tests never started. Do not classify this as an HD-24 application assertion failure.

## Current status
Confirmed in code and independent execution:
- v27 auto-run safety/readiness logic retained.
- v4 single-orchestrator behavior retained.
- v5 closes the mutable-analysis gap between action workbook and follow-up package.
- Preview and reply workbook now use one frozen, same-signature analysis snapshot.

Still not declared complete:
- full live production browser E2E using the real India/Brazil/current-master files from file selection through downloaded action/reply workbooks and visible mail Preview.
- hosted custom runner recovery.

Do not declare 100% completion until the full production browser chain is observed end to end.