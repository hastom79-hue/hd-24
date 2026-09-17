# Coding log — obsolete watchdog CI production-wiring assertion

Date: 2026-09-17 KST

## Changed
`.github/workflows/hd24-action-export-watchdog.yml`

- Removed `hd24-ui-v3.js` and `refresh-runtime.html` from path triggers for the retired watchdog component regression.
- Removed stale greps requiring `hd24-action-export-watchdog.js?v=1` in production loader and refresh helper.
- Retained `node --check hd24-action-export-watchdog.js` and `node tests/action-export-watchdog.test.js` so the legacy component remains syntactically and behaviorally testable.

## Why no runtime version bump
The watchdog is intentionally absent from current production wiring. The direct-reply stale-guard architecture replaced the old action-export/watchdog/followup-sync chain. No application code changed, so changing loader/refresh/cache versions would be unnecessary and contrary to the no-speculative-version-bump rule.

## Failure classification
Run 35177288457 is application-independent CI assertion drift, not runner/execution-layer failure: `steps` were present, setup succeeded, watchdog behavior test passed, and only the obsolete production-wiring grep failed.
