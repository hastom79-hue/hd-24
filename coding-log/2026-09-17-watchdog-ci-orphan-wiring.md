# Coding log — obsolete watchdog CI production-wiring assertion

Date: 2026-09-17 KST

## Changed
- `.github/workflows/hd24-action-export-watchdog.yml`
- `.github/workflows/hd24-action-export-watchdog-regression.yml`

For both retired-watchdog gates:
- removed current production loader/refresh/action-export files from path triggers;
- removed stale assertions requiring `hd24-action-export-watchdog.js?v=1` in production loader/refresh;
- retained watchdog syntax, bounded wake, same-signature gate, completion-stop hook, and executable behavior regression checks.

## Why no runtime version bump
The watchdog is intentionally absent from current production wiring. The direct-reply stale-guard architecture replaced the old action-export/watchdog/followup-sync chain. No application code changed, so changing loader/refresh/cache versions would be unnecessary and contrary to the no-speculative-version-bump rule.

## Failure classification and executable result
Runs 35177288457 / 35177287787 are CI assertion drift, not runner/execution-layer failures: steps were present and the failures came from obsolete production-wiring expectations. After the first gate correction, run 35178614491 completed SUCCESS; Runtime Regression Gate 35178614448 and Action Cycle Regression 35178614465 also completed SUCCESS. The second duplicate gate was corrected in `33da2f76564c3d982268b3cad33c0d0f39cd8c48`.
