# HD-24 Development Log — Reply Cycle Reset Guard v1

Date: 2026-09-15

## Requirement
Prevent a reply Excel workbook that started building under an old upload cycle from being downloaded or accepted after the user selects a new source/master pair. The new cycle must be able to continue independently while the old asynchronous ExcelJS `writeBuffer()` is still unresolved.

## Root cause found
`hd24-followup-sync.js` v8 already rejects stale **validation/completion** by signature + monotonic `hd24ActionCycle`. However the legacy manual reply builder in `hd24-followup.js` v24 performs asynchronous `wb.xlsx.writeBuffer()` and can finish after the upload cycle changes. Because the final File/object URL is produced only after that await, a stale old-cycle workbook could still reach the download path while a new cycle is active. This is a generation/download race, distinct from the previously fixed validation race.

## Design decision
Do not rewrite the long legacy follow-up module in this correction. Add a narrow capture-phase fail-closed guard for sync-owned Preview downloads.

New module: `hd24-reply-cycle-guard.js` v1.

It freezes before asynchronous workbook creation:
- upload signature;
- `window.hd24ActionCycle`;
- plant and plant display name;
- analysis month;
- exact watch KPI snapshot;
- exact master-row fingerprint.

Immediately after `ExcelJS.writeBuffer()` resolves, the module rechecks signature, cycle, Preview identity and row fingerprint. If any changed, the old workbook is discarded before `URL.createObjectURL()` or anchor download can occur.

## Code changes
- Added `hd24-reply-cycle-guard.js` v1.
- Added same-cycle in-flight dedupe keyed by `cycle::signature`.
- Updated production loader `hd24-ui-v3.js` to load the guard after follow-up sync v8.
- Updated `refresh-runtime.html` to preload the guard.
- Added `tests/reply-cycle-guard.test.js`.
- Updated `HD24 Followup Exact Once` workflow to syntax-check and execute the new regression.

## Regression scenario
The new test deliberately holds cycle 7 workbook `writeBuffer()` open, switches to cycle 8 and starts a second workbook, then resolves cycle 8 first and cycle 7 last.

Expected invariant:
- cycle 8 response workbook downloads exactly once;
- cycle 7 stale response workbook never downloads after reset;
- stale-cycle rejection is logged.

## Execution / deployment evidence
- Prior Pages HEAD `eaf5887f...` was confirmed deployed successfully in run `34907062012`.
- New exact-once run `34907647493` ended `failure`, but job inspection returned `steps=null`. Therefore the GitHub runner never executed checkout, syntax checks or Node assertions. This remains an execution-layer runner failure and is not classified as an application/test assertion failure.
- New Pages run `34907647329` reached `in_progress`; final success must be checked on the final documentation HEAD before completion is claimed.

## Preserved safeguards
- No auto-send behavior added.
- Existing safe-reflect and action-export fail-closed gates remain unchanged.
- Follow-up sync v8 remains the owner of automatic Preview/reply package orchestration.
- Manual legacy behavior is not intercepted unless the Preview is tagged as the current sync-owned signature + cycle + exact row set.

## Remaining verification boundary
A live browser end-to-end PASS is not claimed in this log. GitHub custom runner execution remains unavailable when jobs return `steps=null`. Final Pages deployment status and the permanent regression source are retained as traceable evidence.
