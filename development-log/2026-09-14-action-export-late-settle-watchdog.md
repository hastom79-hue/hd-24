# HD-24 action-export late-settle watchdog

Date: 2026-09-14 KST

## Objective
Continue hardening the automatic production chain:
`safe reflect -> KPI analysis -> _분석후속조치본.xlsx -> exact watch-set Preview -> reply workbook verification`.

This change addresses a residual long-tail timing risk after the existing action-export v26 guards were already in place.

## Residual timing risk found
`hd24-action-export.js` schedules its own guarded retries only through approximately 8 seconds after a trigger. Safe-reflected workbook blob capture is asynchronous and current-analysis acceptance also requires a post-trigger `resultCard` mutation.

If blob capture or analysis state settles after the existing retry window and no later result-card mutation occurs, every fail-closed prerequisite can eventually become valid while `_분석후속조치본.xlsx` is never retried. This is a timing/deadlock resilience risk; it is not evidence that an already generated workbook is wrong.

## Production correction
New module: `hd24-action-export-watchdog.js` v1.

Commit `c20d0880dff74fb21f78d34518d7bc667b25fa9e` — `fix: add bounded action-export late-settle watchdog`.

Design:
- bounded external wake schedule: 0 / 2.5 / 7 / 15 / 30 seconds,
- operates only when the current upload-pair signature exactly equals `window.hd24SafeReflectSuccessSignature`,
- only mutates a diagnostic `resultCard.dataset.hd24ActionExportWake` attribute,
- relies on the existing action-export MutationObserver to re-run the original v26 fail-closed schedule,
- does not set `analysisReadySignature`, `capturedSafe`, `processedSignature`, or any safe-reflect success state,
- does not bypass mapping, unit, future-month, prior-month, formula-cell, duplicate-target, post-write, current-analysis, or same-signature validation,
- all remaining wake timers are cancelled immediately when `hd24-action-export-complete` is observed for the exact current signature,
- file/master/plant changes reset watchdog state.

The combination of the 30-second bounded wake and the original v26 internal retry schedule extends late-settle recovery without introducing indefinite polling.

## Production wiring
- `8003d27fbbc0a4edf804bb5730562a985b0e4c59` — `hd24-ui-v3.js` loads `hd24-action-export-watchdog.js?v=1` immediately after action-export v26 and before follow-up modules.
- `25a09ff18f0c6956fa146308084d33638a6618b0` — `refresh-runtime.html` preloads watchdog v1 so forced runtime refresh cannot retain the old chain.

## Executable regression
New test: `tests/action-export-watchdog.test.js`.

Commit `868796c037b35d164bc616f835a25c3eb480a058` — `test: cover action-export late-settle watchdog`.

Independent local Node execution:
- JavaScript syntax check: PASS.
- behavior regression: PASS.
- expected banner observed: `PASS action-export watchdog: late-settle wakeups are bounded, same-signature, and stop on completion`.

The regression proves:
1. exactly five bounded wake timers are armed,
2. a same-signature safe-reflect state is required,
3. the first wake mutates the observed result card,
4. exact-signature action-export completion cancels subsequent wakeups.

## Dedicated GitHub regression workflow
Commit `dc16c92bfc290b035df22bdcdb464675faf2f5e4` — added `.github/workflows/hd24-action-export-watchdog.yml`.

Workflow run `34835717611` completed with conclusion `failure`, but job `103948947075` returned `steps=null` and no logs. Therefore no checkout, Node syntax check, behavior test, or wiring grep actually executed. This remains an Actions execution-layer/runner failure, not an application assertion failure.

The main Runtime Regression run `34835717573` behaved identically: job `103948946734`, `steps=null`, no executed assertions. This is retained as the same execution-layer failure condition.

## Pages deployment verification
Pages run `34835716802`, HEAD `25a09ff18f0c6956fa146308084d33638a6618b0`, completed `success` at 2026-09-14T10:58:02Z. Therefore the watchdog production wiring and forced-refresh preload are deployed.

A prior Pages run `34835697247` for the same content HEAD was cancelled during rapid successive pushes and was superseded by successful run `34835716802`; the cancellation is retained here rather than hidden.

## Current conclusion
- Long-tail action-export timing recovery has been added without weakening the existing fail-closed path.
- Local executable regression PASS is confirmed.
- Production Pages deployment is confirmed SUCCESS.
- GitHub custom regression runners still fail before steps execute (`steps=null`), so they provide no positive or negative application assertion evidence.
- Full real production-browser E2E with the actual India/Brazil/current-master files is still not directly observed end to end.
- Do not declare 100% completion until the complete real-file browser chain is observed through safe reflect, reflected workbook, fresh analysis, `_분석후속조치본.xlsx`, exact watch-set Preview, actual reply workbook byte verification, and visible mail Preview.
