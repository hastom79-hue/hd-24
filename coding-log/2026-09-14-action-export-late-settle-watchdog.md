# Coding Log — HD-24 action-export late-settle watchdog

Date: 2026-09-14 KST

## Code review scope
Reviewed the same-signature production chain around:
- `hd24-pipeline-gate.js`
- `hd24-action-export.js` v26
- `hd24-followup-sync.js` v7
- production loader / forced runtime refresh
- runtime regression workflow

## Finding
Action-export v26 already protects against stale prior-upload analysis by requiring a post-current-trigger result-card mutation, and already requires the safe-reflect success signature, current-month analysis, captured reflected workbook bytes, valid sheet, and action-workbook processing.

Residual issue: the internal retry schedule ends after approximately 8 seconds. A late async safe-blob capture or analysis settle can therefore leave the module with valid prerequisites but no remaining scheduling event.

## Implementation
### New `hd24-action-export-watchdog.js`
Commit: `c20d0880dff74fb21f78d34518d7bc667b25fa9e`

Key implementation decisions:
- `WAKE_DELAYS=[0,2500,7000,15000,30000]`.
- `canWake(sig)` requires current signature + exact `hd24SafeReflectSuccessSignature` + not already completed.
- `nudge()` changes only `resultCard.dataset.hd24ActionExportWake`.
- No internal/private action-export state is written by the watchdog.
- The existing action-export MutationObserver remains the only path that re-enters `markAnalysisReady()` and `makeFinalActionWorkbook()`.
- `hd24-action-export-complete` with exact current signature sets watchdog completion and cancels timers.
- upload/plant changes clear timers and reset completion state.

### Regression test
`tests/action-export-watchdog.test.js`
Commit: `868796c037b35d164bc616f835a25c3eb480a058`

Assertions:
- five bounded timers only,
- exact current safe signature before wake,
- result-card mutation on wake,
- completion cancels all future wake behavior.

Local execution result:
`PASS action-export watchdog: late-settle wakeups are bounded, same-signature, and stop on completion`

### Runtime wiring
`hd24-ui-v3.js`
Commit: `8003d27fbbc0a4edf804bb5730562a985b0e4c59`

Load order now preserves:
`action-export v26 -> action-export-watchdog v1 -> legacy follow-up v24 -> follow-up sync v7`.

`refresh-runtime.html`
Commit: `25a09ff18f0c6956fa146308084d33638a6618b0`

Added watchdog v1 to forced preload list.

### Dedicated workflow
`.github/workflows/hd24-action-export-watchdog.yml`
Commit: `dc16c92bfc290b035df22bdcdb464675faf2f5e4`

Intended checks:
- `node --check hd24-action-export-watchdog.js`
- `node tests/action-export-watchdog.test.js`
- production-loader watchdog version grep
- refresh-helper watchdog version grep

## Execution results / failures retained
- Local syntax check: PASS.
- Local behavior regression: PASS.
- Dedicated Actions run `34835717611`: conclusion failure, job `103948947075`, `steps=null`, `logs_url=null`. Code/test did not execute.
- Main Runtime Regression run `34835717573`: conclusion failure, job `103948946734`, `steps=null`, `logs_url=null`. Assertions did not execute.
- Earlier Pages run `34835697247`: cancelled during successive pushes.
- Superseding Pages run `34835716802`: completed SUCCESS for static production content HEAD `25a09ff18f0c6956fa146308084d33638a6618b0`.

## Safety invariants preserved
No modification was made to `safe-kpi-mapping.js`, its mapping/unit/future-month/prior-month/formula/duplicate/post-write guards, or the v27 auto-run authoritative readiness rules. The watchdog cannot manufacture a safe-reflect success signature and cannot mark action-export completion.

## Remaining risk
The final unresolved verification is environmental rather than a known code assertion defect: an uninterrupted real production-browser run with the actual source/master files has not yet been observed through every generated workbook and Preview stage. Keep the project status below 100% until that is directly evidenced.
