# Coding Log — Action Export Upload Cycle v27

Date: 2026-09-15 KST

## Files changed
- `hd24-action-export.js`
- `hd24-action-cycle-guard.js` (new)
- `hd24-ui-v3.js`
- `refresh-runtime.html`
- `tests/kpi-action-export.test.js`
- `.github/workflows/hd24-action-cycle-regression.yml` (new)

## Code decisions
1. Signature alone is insufficient to distinguish two consecutive selections of the exact same files.
2. Added a monotonic in-page action cycle rather than changing the existing file signature contract.
3. All long-running async boundaries now verify both signature and cycle before committing state or downloading output.
4. Completion events carry the originating cycle.
5. A separate capture-phase event guard blocks stale completion events before watchdog/follow-up consumers can process them.
6. Existing manual buttons and safe-reflect fail-closed gates remain unchanged.

## Async checkpoints added
- safe blob `fetch()` completion
- analysis mutation/readiness
- action workbook pre-load state
- ExcelJS load completion
- ExcelJS write completion
- completion event propagation
- scheduled retry callbacks

## Failure/edge case covered
Sequence: select A/A → action export starts → re-select exact same A/A before old async work finishes → same file signature is produced. Old cycle work must not set captured safe bytes, mark analysis ready, generate/download the action workbook, or reach follow-up consumers.

## Test changes
`tests/kpi-action-export.test.js` now targets v27 and asserts the cycle invariants and production cache wiring. Dedicated workflow `HD24 Action Cycle Regression` performs syntax checks and the regression test.

## Verification discipline
Pages deployment success is tracked separately from runtime test execution. GitHub custom runners have historically returned jobs with null/empty steps; such failures are classified as execution-layer failures unless assertions actually run and fail.
