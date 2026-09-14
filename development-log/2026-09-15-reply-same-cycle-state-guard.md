# 2026-09-15 Reply Same-Cycle State Guard

## Risk found
`hd24-reply-cycle-guard.js` v1 rejected stale downloads when upload signature or action cycle changed, but `stillCurrent()` only rechecked signature, cycle and Preview row IDs. While `ExcelJS.writeBuffer()` was in flight, state that changes the actual workbook contents could still mutate without a new upload cycle: `window.hd24FollowupSnapshot`, watch-target selection derived from reply history, previous root-cause/countermeasure history, and latest mail timestamps. In that case a workbook built from the old state could still download because the upload signature/cycle and row list remained unchanged.

## Fix
- Upgraded reply cycle guard to v2.
- `context()` now validates Preview month/count as well as signature/cycle/rows.
- Added `outputToken()` covering snapshot identity/data and workbook-relevant reply/mail-derived state.
- `stillCurrent()` rebuilds the live context immediately after async `writeBuffer()` and requires exact equality of signature, cycle, plant, month, watch rows and output token.
- Any same-cycle mutation now fails closed before `URL.createObjectURL()` / anchor download.
- Production loader and runtime refresh preload updated from `hd24-reply-cycle-guard.js?v=1` to `v=2`.

## Regression
Added `tests/reply-cycle-same-cycle-state.test.js`.
The test holds `writeBuffer()` on a deferred promise, mutates mail-history state without changing signature/cycle/rows, then releases the promise. Expected: stale workbook download count remains zero. Control case with no mutation must download exactly once.

## Scope discipline
No changes were made to safe-reflect, action-export classification logic, KPI mapping rules, or follow-up sync v8 because this risk is isolated to the final reply-workbook download guard.