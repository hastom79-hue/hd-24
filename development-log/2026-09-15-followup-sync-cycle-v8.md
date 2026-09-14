# HD-24 Follow-up Sync Upload-Cycle Isolation v8

## Requirement
Continue autonomous verification of the post-analysis package so the same upload pair cannot generate duplicate or stale follow-up artifacts. The required chain remains: safe reflect -> action workbook -> mail Preview -> reply Excel, with one valid package per current upload cycle and no auto-send.

## Risk found
Action export v27 already introduced a monotonic `hd24ActionCycle`, but `hd24-followup-sync.js` v7 still keyed its internal async state primarily by the file signature. Re-selecting the exact same physical source/master pair can reproduce the same signature. An old reply-workbook generation or validation promise could therefore finish after reset and still appear to belong to the new selection unless the follow-up layer also checked the upload cycle.

A second stale item was found in regression coverage: `tests/followup-sync.test.js` still expected action-export v26 even though production had moved to v27.

## Corrective action
`hd24-followup-sync.js` upgraded to v8:
- reads the monotonic `window.hd24ActionCycle`;
- stores signature + cycle on the frozen follow-up snapshot;
- requires the action-export completion event cycle to equal the current cycle;
- tags Preview with `data-hd24-cycle` as well as signature/month/count/watch-row fingerprint;
- binds reply request, reply pin, verified reply, running state and completion state to both signature and cycle;
- re-checks signature + cycle before reply validation, after ExcelJS workbook load and before completion;
- keys bounded reply validation attempts by cycle + signature;
- stale async catch paths do not clear or mutate state belonging to a newer cycle;
- delayed retry timers self-cancel when their originating cycle is no longer current.

## Exact-once intent
For one valid upload cycle, automatic packaging is owned only by follow-up sync. Legacy follow-up auto-package remains suppressed by `hd24FollowupSyncOwnsAutoPackage`. The v8 completion gate requires current-cycle action snapshot, exact watch-set Preview fingerprint and a reopened/validated reply workbook. Same-signature prior-cycle events are ignored.

## Production wiring
- action export: `hd24-action-export.js?v=27`
- action cycle event guard: `hd24-action-cycle-guard.js?v=1`
- legacy follow-up UI/manual controls: `hd24-followup.js?v=24`
- follow-up orchestrator: `hd24-followup-sync.js?v=8`
- refresh helper updated to preload v8.

## Regression updates
- `tests/followup-sync.test.js` now expects action-export v27 and follow-up sync v8.
- executable stale-cycle case added: same file signature with prior event cycle must trigger zero Preview and zero reply workbook clicks.
- Preview cycle tag is asserted.
- `tests/followup-reset-guard.test.js` now checks pre/post workbook-load cycle rejection, cycle-aware reset state and cycle-aware duplicate suppression.
- runtime regression workflow updated from follow-up v7 assertions to v8 cycle-safe assertions.

## Verification status
The immediately preceding HEAD `28d657e96ffba3d5efc5d5c8646d8edb57db73e9` completed GitHub Pages deployment successfully in run `34902174204` before this v8 change.

GitHub custom workflow runners have repeatedly returned null/empty steps, so a custom workflow failure with no executed steps remains classified as an execution-layer failure, not an application assertion failure. Latest v8 deployment and available workflow execution must be polled after the final log commit.

## Preserved safeguards
No relaxation was made to safe-reflect fail-closed validation, future-month blocking, prior-month anchor blocking, unit validation, duplicate KPI/month blocking, formula overwrite blocking, post-write revalidation, XLSM fail-closed behavior, frozen action snapshot, exact watch-set reply verification or no-auto-send policy.
