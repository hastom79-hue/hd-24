# HD-24 browser runtime rollback — 2026-09-09

## Trigger
User confirmed GitHub Pages deployment still did not operate after cache-key restoration.

## Verified facts
- GitHub Pages deployment for prior HEAD completed successfully, so the issue was not a Pages build failure.
- Current Runtime Regression jobs were still failing before steps, so they could not prove current runtime health.
- Last proven browser execution was HD24 Browser E2E run `34182543102` at commit `4760a87bfb36d08c094c076594cacac28088c34b`.
- That E2E completed browser page load, safe-ready gate, file selection, reflect click, XLSX download, and workbook mutation verification successfully.

## Recovery action
- Restored `safe-kpi-mapping.js` to the exact Git blob from proven commit `4760a87bfb36d08c094c076594cacac28088c34b`.
- Proven blob SHA: `5c3e2c347f719a3e79e4cf6742fa99cb5e6d5188`.
- No spreadsheet, mapping JSON, UI layout, or historical development-log file was modified by the runtime rollback.
- Rollback commit: `091421a3629027467309624c7e18a3bf867c4e94`.

## Status
Pages deployment must be rechecked after this commit. Do not call the web runtime final until actual operation is confirmed.
