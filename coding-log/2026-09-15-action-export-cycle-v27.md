# Coding Log — Action Export Upload Cycle v27

Date: 2026-09-15 KST

## Files changed
- `hd24-action-export.js`
- `hd24-action-cycle-guard.js` (new)
- `hd24-ui-v3.js`
- `refresh-runtime.html`
- `tests/kpi-action-export.test.js`
- `.github/workflows/hd24-action-cycle-regression.yml` (new)
- `.github/workflows/hd24-runtime-regression.yml`

## Code decisions
1. Signature alone is insufficient to distinguish two consecutive selections of the exact same files.
2. Added a monotonic in-page action cycle rather than changing the existing file signature contract.
3. All long-running async boundaries now verify both signature and cycle before committing state or downloading output.
4. Completion events carry the originating cycle.
5. A separate capture-phase event guard blocks stale completion events before watchdog/follow-up consumers can process them.
6. Loader order is now regression-locked: action producer → cycle guard → watchdog/follow-up consumers.
7. Existing manual buttons and safe-reflect fail-closed gates remain unchanged.

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
`tests/kpi-action-export.test.js` targets v27 and asserts cycle invariants, production cache wiring, and consumer listener load order. Dedicated workflow `HD24 Action Cycle Regression` performs syntax checks and the regression test.

The main runtime gate was found still asserting action-export v26 after v27 was wired. This stale CI expectation was corrected in commit `5b8725e68299ad726d8ddcdaa1a06e1d46eac091`. The correction is logged as a real post-change validation finding rather than hidden.

## Deployment verification
HEAD `5b8725e68299ad726d8ddcdaa1a06e1d46eac091` deployed successfully through Pages run `34901991585`.

## Runner execution results
- Cycle regression `34901992790`, job `104169849990`: completed/failure with `steps=null`.
- Main runtime regression `34901992833`, job `104169850239`: completed/failure with `steps=null`.
- Earlier cycle regression `34901906305`, job `104169576322`: same `steps=null` pattern.
These are execution-layer runner failures; there is no evidence that Node syntax checks or assertions started.

## Latest test-only hardening
Commit `b2831bbdc68c52207655710723eade61ccfb91a1` added exact loader-order assertions:
- action export v27 before cycle guard v1;
- cycle guard v1 before watchdog;
- cycle guard v1 before follow-up sync v7.

## Verification discipline
Pages deployment success is tracked separately from runtime test execution. Full browser E2E is not declared from static deployment alone.
