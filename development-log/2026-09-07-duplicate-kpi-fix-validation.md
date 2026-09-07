# HD-24 v9 Duplicate KPI Fix & Revalidation — 2026-09-07

## Fix applied
Preview branch only. `safe-kpi-mapping.js` strict matcher now counts normalized exact matches. If more than one exact match exists, `ambiguous=true` and the mapping is rejected. This applies to both source KPI lookup and master KPI lookup because both use the same strict matcher.

Commit: `bb933fac19133e011a9fc0b7e3e189bd2a96f56d`
Blob: `44b026c9690b86130e7e3c39d35d58074697af42`

## Synthetic re-attack results
- exact single match -> ACCEPT PASS
- row moved exact match -> ACCEPT PASS
- duplicate exact KPI labels -> BLOCK PASS
- two competing similar labels -> BLOCK PASS
- exact + similar -> exact ACCEPT PASS
- unrelated labels -> BLOCK PASS
- exact FAIL scan -> 0

## Real-file relevance
Previous full audits found 0 duplicate KPI names in the current India and Brazil source files and 0 duplicate KPI names in the corresponding master KPI columns. Therefore this fix adds fail-closed protection for malformed future uploads without changing the current valid July mapping result.

## Deployment state
- preview-v9-integrated: patched and under revalidation
- main: unchanged
- deployment: not performed

Next: rerun real-file structural/mapping gates after this matcher change, then branch diff gate.