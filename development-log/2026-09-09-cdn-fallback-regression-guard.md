# HD-24 CDN fallback regression guard — 2026-09-09

## Change
Commit: `3302b47d85256e6df5080246246891af52aa6aa0`

The permanent Runtime Regression Gate now also guards the CDN dependency recovery path introduced in `hd24-ui-v3.js` and `runtime-health.html`.

New static invariants include:
- SheetJS jsDelivr fallback URL remains present.
- JSZip jsDelivr fallback URL remains present.
- ExcelJS jsDelivr fallback URL remains present.
- `ensureDeps()` must complete before the safe runtime is loaded.
- terminal dependency failure must remain fail-closed.
- reflect button disable path must remain present.
- runtime-health must remain fallback-aware for XLSX / JSZip / ExcelJS.
- runtime-health application entry must continue through `refresh-runtime.html`.

## Execution status
- Runtime Regression run `34346898343`
- job `102450530854`
- conclusion shown as failure, but `steps=null`.
- Therefore the regression code did not start; this remains a GitHub Actions runner/execution-layer pre-step failure, not a regression assertion failure.

## Deployment status at recording
- Pages run `34346897061` for commit `3302b47d...` was in progress at the last check.

## Remaining runtime item
The production outer cache references are still CSS `?v=3`, UI JS `?v=15`, while safe runtime is `?v=18`. `refresh-runtime.html` currently mitigates this active cache chain; the Apply workflow is intended to align all active cache revisions when custom Actions can execute again.
