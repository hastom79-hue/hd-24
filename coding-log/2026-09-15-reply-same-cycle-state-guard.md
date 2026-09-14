# 2026-09-15 Reply Same-Cycle State Guard Coding Log

## Production changes
1. `hd24-reply-cycle-guard.js`
   - v2 behavior: fail closed not only on upload signature/cycle changes but also on same-cycle workbook-output state changes.
   - Added `outputToken(items, plant, month)`.
   - Token includes masterRow/month/KPI names/Target/Actual/achieved/streak/trend/status tags, recurrence count, previous reason/root cause, previous recovery plan, latest mail prepared/sent time, and latest reply received time.
   - `context()` validates Preview month/count/rows and current snapshot consistency.
   - `stillCurrent()` recomputes live context after `writeBuffer()` and requires exact output-token equality.
2. `hd24-ui-v3.js`
   - `hd24-reply-cycle-guard.js?v=2`.
3. `refresh-runtime.html`
   - preloads `hd24-reply-cycle-guard.js?v=2`.

## Regression changes
- Added `tests/reply-cycle-same-cycle-state.test.js`.
- Added the test to `.github/workflows/hd24-followup-exact-once.yml` syntax and execution steps.

## Expected assertions
- Same signature + same cycle + same rows + changed mail/reply-derived state during async workbook write => zero downloads and stale-block log.
- Unchanged state => exactly one download.

## CI interpretation rule
If GitHub Actions reports failure with job `steps=null`, record it as runner/execution-layer failure, not an application assertion failure.