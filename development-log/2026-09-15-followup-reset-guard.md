# 2026-09-15 Follow-up Reset Guard Verification

## Scope
Continued verification of the production chain after watchdog hardening, focusing on stale asynchronous reply validation and upload-cycle reset behavior.

## Production code reviewed
- `hd24-followup-sync.js` v7
- `hd24-pipeline-gate.js`
- `hd24-action-export.js` v26
- `hd24-action-export-watchdog.js` v1

## Findings
The current follow-up sync already contains fail-closed guards for the common reset race:
- an asynchronously validating reply workbook is rejected if the current upload signature changed before validation completes;
- `hardReset()` clears completion, running, action-export, reply-request and reply-download signatures, clears captured reply-file references, and clears the old Preview;
- action-export completion events from another upload signature are ignored;
- package execution still requires the same-signature safe-reflect success, action-export snapshot, ready analysis, and matching month;
- duplicate same-signature package execution remains suppressed.

## New permanent regression check
Added `tests/followup-reset-guard.test.js` to lock the above invariants. Commit: `9fb7b4f55d696a24b5a7e84d0e0d644a6309568d`.

## Deployment / Actions status
Before this change, latest documented HEAD `c0b8b0309043dbf75dd9811fe15789e580468b4c` had Pages run `34836582451` completed successfully. The Runtime Regression run `34836583383` ended before steps started (`steps=null`), so it is classified as runner/execution-layer failure rather than an application assertion failure.

## Residual risk
A very narrow edge case remains conceptually possible if the user changes away from an upload pair and then re-selects byte-identical files with exactly the same signature while a previous async validation is still resolving. The current normal signature-change guard covers ordinary file changes, and hardReset clears stale state. This edge case is retained as a residual risk until a live browser E2E can explicitly exercise it; it is not treated as a confirmed production defect without reproduction.

## Completion status
No 100% E2E claim. Production browser E2E with the real India/Brazil source files and current master is still the final unresolved verification layer.
