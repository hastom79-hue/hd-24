# Development log — obsolete watchdog CI production-wiring assertion

Date: 2026-09-17 KST

## Finding
Latest main `3c574c92a36e996ed81b59360ee7643573a34d59` triggered two legacy `HD24 Action Export Watchdog Regression` workflows. Runs 35177288457 and 35177287787 had real steps (not `steps=null`). The watchdog behavior/invariant checks were viable, but both workflows still required `hd24-action-export-watchdog.js?v=1` in the production loader/refresh chain.

The current production architecture intentionally removed the legacy `hd24-action-export.js` / watchdog / followup-sync loader chain when the direct reply stale guard was introduced. Current `hd24-ui-v3.js` and `refresh-runtime.html` therefore correctly do not load the watchdog. These failures were stale CI assertions, not application failures.

## Correction
Updated both duplicate legacy watchdog workflows:
- `.github/workflows/hd24-action-export-watchdog.yml`
- `.github/workflows/hd24-action-export-watchdog-regression.yml`

The watchdog syntax/behavior/invariant regressions remain executable when the legacy component itself changes, but neither workflow now asserts that the retired watchdog is production-wired. Production loader/refresh/action-export paths were removed from their trigger sets so unrelated current-runtime changes no longer create false failures.

## Production impact
No production runtime, loader, refresh helper, cache version, KPI mapping, formula/unit/month handling, or reply-download code changed. This is deliberately CI-only because re-injecting the retired watchdog would recreate an obsolete competing execution path and could itself increase duplicate/race risk.

## Validation
- run 35177288457: real steps; behavior test PASS; stale loader/refresh grep caused exit 1.
- run 35177287787: separate duplicate watchdog workflow with the same retired production-wiring premise.
- correction commit `a26fce653d93f282cd587b70f11f0b27366d562d`: watchdog run 35178614491 completed SUCCESS; Runtime Regression Gate 35178614448 SUCCESS; Action Cycle Regression 35178614465 SUCCESS.
- second duplicate-gate correction commit: `33da2f76564c3d982268b3cad33c0d0f39cd8c48`.
- current production loader contains core/auto-run/pipeline-gate/followup/direct-reply-guard/import-dedupe/history only.
- direct-reply stale-guard coding log explicitly records removal of legacy action-export/followup-sync production loaders.
