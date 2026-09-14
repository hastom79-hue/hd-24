# Coding Log — Follow-up In-Flight Dedupe (2026-09-15)

## Code added
- `tests/followup-inflight-dedupe.test.js`

## Workflow updated
- `.github/workflows/hd24-followup-exact-once.yml`

## Harness details
The VM harness uses the production `hd24-followup-sync.js`. It mocks DOM elements, Blob URL download capture, ExcelJS, events, and timers. ExcelJS workbook loading waits on a controlled deferred promise.

Execution sequence:
1. Dispatch one valid action-export event for signature + cycle 7.
2. Confirm Preview=1 and Reply=1 while completion remains 0 because workbook validation is held.
3. While validation is still pending, dispatch four duplicate action-export events, four safe-reflect completion events, and multiple watchdog callbacks.
4. Confirm Preview and Reply counts remain exactly 1.
5. Release workbook validation.
6. Confirm final Preview=1, Reply=1, Complete=1.

## Safety impact
Verification only. No production runtime file was changed in this step.
