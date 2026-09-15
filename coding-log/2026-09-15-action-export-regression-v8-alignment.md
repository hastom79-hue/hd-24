# Coding Log — Action Export regression v8 alignment

Date: 2026-09-15 KST

## Failure reproduced from CI
`HD24 KPI Action Regression` run 34971364846 reached the Node test step and failed with:

`Error: cycle guard must load before follow-up consumer`

Classifier and workbook tests passed immediately before this assertion.

## Root cause
`hd24-ui-v3.js` loads `hd24-followup-sync.js?v=8`, while `tests/kpi-action-export.test.js` searched for `hd24-followup-sync.js?v=7`. `indexOf()` therefore returned -1 and produced a false regression failure.

## Change
Only the test expectation was changed to `v=8`. Production loader and refresh runtime were intentionally left unchanged because they already reference the current v8 implementation.

## Risk control
No runtime behavior, KPI selection logic, future-month filtering, unit/formula handling, duplicate KPI×month handling, anchor logic, action-export cycle guard, or reply-cycle guard was altered by this fix.