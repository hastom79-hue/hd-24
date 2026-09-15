# 2026-09-16 Coding log — approved UI workflow after orchestrator removal

## Scope
`.github/workflows/apply-approved-ui.yml`

## Root cause
The workflow regex was hard-wired to find `safe-kpi-mapping.js?v=(N)` in `hd24-ui-v3.js`. Production commit `5976600c` intentionally removed that loader together with the stalled action-export/follow-up-sync orchestration chain. The workflow therefore failed before its cache-alignment assertions could run.

## Code change
Previous version source:
`safe-kpi-mapping.js?v=(N)` in `hd24-ui-v3.js`.

New version source:
`hd24-ui-v3.js?v=(N)` in `index.html`.

`refresh-runtime.html` now receives only the outer UI CSS/JS version alignment from this workflow; no obsolete safe-kpi-mapping assertion or rewrite remains.

## Why no runtime bump
The live runtime loader is intentionally simpler after `5976600c`; adding a new application version solely to satisfy an obsolete CI parser would recreate unnecessary cache churn. The fix is limited to the workflow that had the stale assumption.
