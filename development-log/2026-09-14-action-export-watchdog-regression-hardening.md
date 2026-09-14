# HD-24 development log — action-export watchdog regression hardening

Date: 2026-09-14

## Scope
Continue the final safe-reflect → analysis → action workbook → follow-up package verification without weakening any fail-closed runtime guard.

## Review performed
- Re-read production `hd24-pipeline-gate.js`, `hd24-action-export.js`, `hd24-action-export-watchdog.js`, `hd24-followup.js`, `hd24-followup-sync.js`, production loader, and current follow-up regression tests.
- Confirmed production loader order is core → auto-run → pipeline gate → action modules → action-export → watchdog → follow-up UI → follow-up sync.
- Confirmed action-export completion carries the frozen current-month analysis snapshot and follow-up v7 validates the exact watch KPI set against Preview and actual reply-workbook bytes.

## Additional watchdog regression hardening
Updated `tests/action-export-watchdog.test.js` so the watchdog is now executable against these additional negative conditions:
1. a mismatched safe-reflect signature must not arm any wakeups;
2. a fresh-cycle reset clears the completed latch;
3. changing the source file cancels all pending wake timers.

Existing positive checks remain:
- exactly five bounded wakeups: 0 / 2.5 / 7 / 15 / 30 seconds;
- same-signature gating;
- first nudge reaches `resultCard`;
- action-export completion cancels later wakeups.

## Independent execution verification
A local Node VM harness was executed against the production watchdog logic.

Initial extended test attempt failed because the test tried to re-arm the same already-completed signature without a reset. That behavior is intentionally blocked by `completedSignature` and was not a production defect. The test scenario was corrected to model a real fresh upload cycle by invoking the reset first.

Corrected result:
`PASS action-export watchdog extended: bounded + same-signature + completion stop + mismatch block + reset cancel`

The failed test attempt is intentionally retained in this log as part of the verification history.

## GitHub changes
- `ec0d5849f4aaf13104254123e2809fa9bf05f4b6` — hardened `tests/action-export-watchdog.test.js`.
- `bd055e0daf50b1aab4d6473145c6d95465bbea80` — added permanent workflow `.github/workflows/hd24-action-export-watchdog-regression.yml`.

The workflow performs:
- watchdog syntax check;
- production loader/refresh wiring checks;
- bounded delay invariant checks;
- same-signature gate check;
- action-export completion-stop hook check;
- execution of `tests/action-export-watchdog.test.js`.

## GitHub Actions result
The first dedicated workflow run was `34836476722`.
Result: `completed/failure`, but its only job `watchdog-regression` returned `steps=null` and no logs. Therefore the workflow code did not begin execution; this matches the repository-wide runner execution-layer problem already observed in other custom workflows and is not classified as an application/test assertion failure.

## Current conclusion
The action-export late-settle watchdog remains fail-closed and now has stronger permanent regression coverage. Local executable verification passes. GitHub-hosted custom workflow execution remains unproven because the runner fails before steps start.

This does **not** close the overall live-browser E2E requirement. The remaining final proof is still the real production browser path with the uploaded India/Brazil source files and current master:
file selection → safe reflect → verified reflected workbook → analysis → `_분석후속조치본.xlsx` → exact-set Preview → actual reply workbook bytes → Mail Preview.
