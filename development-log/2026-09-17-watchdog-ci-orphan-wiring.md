# Development log — obsolete watchdog CI production-wiring assertion

Date: 2026-09-17 KST

## Finding
Latest main `3c574c92a36e996ed81b59360ee7643573a34d59` triggered `HD24 Action Export Watchdog Regression` run 35177288457. The job had real steps (not `steps=null`): checkout and Node setup succeeded, the watchdog behavior regression itself printed PASS, then the job failed because the workflow still grepped production loader/refresh for `hd24-action-export-watchdog.js?v=1`.

The current production architecture intentionally removed the legacy `hd24-action-export.js` / watchdog / followup-sync loader chain when the direct reply stale guard was introduced. Current `hd24-ui-v3.js` and `refresh-runtime.html` therefore correctly do not load the watchdog. The failing greps were stale CI assertions, not an application failure.

## Correction
Updated `.github/workflows/hd24-action-export-watchdog.yml` so the legacy watchdog unit regression remains executable when its own code/test/workflow changes, but it no longer asserts that the retired watchdog is production-wired. Also removed production loader/refresh paths from this obsolete component workflow trigger set.

## Production impact
No production runtime, loader, refresh helper, cache version, KPI mapping, formula/unit/month handling, or reply-download code changed. This is deliberately CI-only because re-injecting the retired watchdog would recreate an obsolete competing execution path and could itself increase duplicate/race risk.

## Validation basis
- failing run 35177288457: real job steps; behavior test PASS; stale grep caused exit 1.
- current production loader contains core/auto-run/pipeline-gate/followup/direct-reply-guard/import-dedupe/history only.
- direct-reply stale-guard coding log explicitly records removal of legacy action-export/followup-sync production loaders.
