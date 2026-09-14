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

## Regression coverage
`tests/kpi-action-export.test.js` updated to assert:
- current-cycle analysis readiness;
- stale safe blob rejection;
- stale workbook-load rejection;
- stale workbook-write rejection;
- cycle carried by completion event;
- stale event propagation guard;
- loader/refresh version wiring.

A dedicated workflow `.github/workflows/hd24-action-cycle-regression.yml` runs:
- `node --check hd24-action-export.js`
- `node --check hd24-action-cycle-guard.js`
- `node tests/kpi-action-export.test.js`

## Preserved safeguards
No relaxation was made to safe-reflect signature gating, future-month blocking, prior-month anchor blocking, unit validation, duplicate KPI/month blocking, formula overwrite blocking, post-write revalidation, XLSM fail-closed behavior, frozen action snapshot, exact watch-set Preview/reply verification, or no-auto-send policy.

## Deployment/execution status
Previous HEAD `3678108342a6e2b207f0ca57e2fbf17e40cd2303` Pages run `34888163888` completed SUCCESS before this change. Latest v27 cycle-hardening HEAD must be polled separately; do not declare full E2E complete until its deployment and available execution checks are confirmed.
