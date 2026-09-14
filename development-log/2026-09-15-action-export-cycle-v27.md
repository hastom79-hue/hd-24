# HD-24 Action Export Upload-Cycle Hardening v27

## Requirement
Continue autonomous execution verification and remove the remaining risk where re-selecting the exact same source/master file pair could reuse the same signature while an older asynchronous action-export operation was still finishing.

## Risk found
The existing signature is based on plant + file name + size + lastModified. Re-selecting the same physical files can therefore produce the same signature. `reset()` cleared state, but an older async `fetch(blob)`, ExcelJS workbook load/write, or `hd24-action-export-complete` event could finish after the reset and still carry the same signature.

## Corrective action
`hd24-action-export.js` upgraded to v27 semantics:
- increment a monotonic upload `cycle` on startup and every source/master/plant reset;
- publish current cycle as `window.hd24ActionCycle`;
- bind safe-workbook blob capture to `captureCycle` and reject completion if cycle/signature changed;
- bind analysis trigger/readiness to `triggerCycle` / `analysisReadyCycle`;
- bind final workbook generation to `workCycle`;
- re-check cycle/signature after ExcelJS workbook load and after workbook write;
- include `cycle` in `hd24-action-export-complete` event detail;
- scheduled retries capture their originating cycle and self-cancel after reset.

A separate `hd24-action-cycle-guard.js` was added before watchdog/follow-up consumers. It calls `stopImmediatePropagation()` for action-export completion events whose event cycle does not equal `window.hd24ActionCycle`. This prevents stale same-signature events from reaching watchdog or follow-up synchronization.

## Production wiring
- loader: `hd24-action-export.js?v=27`
- new guard: `hd24-action-cycle-guard.js?v=1`
- refresh helper preloads both versions.
- permanent regression now also locks script order: producer → cycle guard → watchdog/follow-up consumers.

## Regression coverage
`tests/kpi-action-export.test.js` updated to assert:
- current-cycle analysis readiness;
- stale safe blob rejection;
- stale workbook-load rejection;
- stale workbook-write rejection;
- cycle carried by completion event;
- stale event propagation guard;
- guard load order before downstream consumers;
- loader/refresh version wiring.

A dedicated workflow `.github/workflows/hd24-action-cycle-regression.yml` runs:
- `node --check hd24-action-export.js`
- `node --check hd24-action-cycle-guard.js`
- `node tests/kpi-action-export.test.js`

The main `.github/workflows/hd24-runtime-regression.yml` was also corrected after review because it still expected action-export v26. Commit `5b8725e68299ad726d8ddcdaa1a06e1d46eac091` aligned its invariants and syntax/test commands to v27 cycle-safe production.

## Preserved safeguards
No relaxation was made to safe-reflect signature gating, future-month blocking, prior-month anchor blocking, unit validation, duplicate KPI/month blocking, formula overwrite blocking, post-write revalidation, XLSM fail-closed behavior, frozen action snapshot, exact watch-set Preview/reply verification, or no-auto-send policy.

## Deployment/execution verification
- Previous baseline HEAD `3678108342a6e2b207f0ca57e2fbf17e40cd2303`: Pages run `34888163888` SUCCESS.
- v27 runtime-gate HEAD `5b8725e68299ad726d8ddcdaa1a06e1d46eac091`: Pages run `34901991585` completed SUCCESS.
- `HD24 Action Cycle Regression` run `34901992790`: GitHub marked failure, but job `104169849990` returned `steps=null`; no Node command/assertion executed. Classified as runner execution-layer failure, not application/test failure.
- `HD24 Runtime Regression Gate` run `34901992833`: GitHub marked failure, but job `104169850239` returned `steps=null`; no regression step executed. Classified as runner execution-layer failure, not application/test failure.
- An earlier dedicated cycle run `34901906305` showed the same `steps=null` runner failure pattern.

## Latest incremental hardening
Commit `b2831bbdc68c52207655710723eade61ccfb91a1` added permanent loader-order assertions so the capture-phase cycle guard cannot accidentally be moved behind watchdog or follow-up consumers in a future edit.

Full live-browser E2E remains a separate verification gap; Pages publish success is not treated as proof of browser execution.
