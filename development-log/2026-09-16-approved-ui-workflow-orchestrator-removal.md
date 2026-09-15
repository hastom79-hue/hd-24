# 2026-09-16 Apply-approved-UI workflow repair after orchestrator removal

## Trigger
Main `5976600c0b1ec3ab6f4f72c3d3f2fc6cf1aff073` intentionally stopped loading the stalled v8 action-export/follow-up-sync orchestrator and its safe-kpi-mapping-dependent chain, restoring the verified `hd24-followup.js` auto-package path.

## Newly verified defect
`Apply approved HD-24 UI` still derived the outer cache version from `safe-kpi-mapping.js?v=*` inside `hd24-ui-v3.js`. That loader no longer exists in production, so run `35029273773` reached the runner and failed in `Inject and align approved UI assets` with `Cannot determine current HD24 runtime cache version from hd24-ui-v3.js`.

This was not a `steps=null` execution-layer failure: checkout succeeded and step 3 actually failed.

## Fix
- Derive the outer UI cache version from the deployed `index.html` `hd24-ui-v3.js?v=*` reference instead of a removed inner loader.
- Align only the outer `hd24-ui-v3.css` and `hd24-ui-v3.js` references in `index.html` / `refresh-runtime.html`.
- Remove the obsolete requirement that `safe-kpi-mapping.js` be present in the production chain.
- Keep the stale-v3 reinjection guard.

## Production impact
No application runtime module version was increased. This repair changes only the recovery/alignment workflow because the defect was in CI assumptions, not the restored production pipeline.

## Verification status
Repair commit: `da98a777b33f057babe7f71ebc8e5e78f3a0e382`.
New Apply-approved-UI and Pages runs were queued after the commit; final conclusions are tracked by subsequent continuous verification.
