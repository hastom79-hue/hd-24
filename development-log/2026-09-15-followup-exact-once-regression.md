# HD-24 Follow-up Exact-Once Regression — 2026-09-15

## Requirement
Continue narrowing the final follow-up race condition. The automatic chain must not create duplicate artifacts when the same upload cycle receives duplicate wake-up signals.

## Scope
- `hd24-followup-sync.js` v8 production logic remains unchanged.
- Added an executable regression dedicated to exact-once behavior.
- Added a dedicated CI workflow for the exact-once regression.

## New executable regression
File: `tests/followup-exact-once.test.js`

The test executes the real `hd24-followup-sync.js` in a VM sandbox with a valid same-cycle action-export snapshot and a generated reply workbook. It first verifies one valid cycle creates exactly:
- Preview: 1
- Reply workbook: 1
- Completion: 1

After successful completion, the test deliberately re-fires all normal orchestrator wake-up paths for the same cycle:
- duplicate `hd24-action-export-complete`
- duplicate `hd24-safe-reflect-complete`
- repeated watchdog callbacks

Expected result remains exactly Preview=1, Reply=1, Complete=1. Any duplicate causes test failure.

## CI
Added `.github/workflows/hd24-followup-exact-once.yml`.
It performs Node syntax checks and executes `node tests/followup-exact-once.test.js`.

## Preserved safeguards
No production safety gate was relaxed. Existing signature + upload-cycle binding, exact watch-set fingerprint, reply workbook byte reopen, Target/Actual/Status verification, bounded retry, and stale-cycle rejection remain intact.

## Validation status
GitHub Pages deployment and exact-once workflow status are checked after these commits. If the custom runner again returns `steps=null`, that is recorded as an execution-layer failure, not an application assertion failure.
