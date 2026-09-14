# HD-24 real-file validation — India/Brazil/master

Date: 2026-09-14 KST

## User-provided files
- India source: `## HCEI Module KPI 2026 _HQ recomendation Jul 26.(2).xlsx`
- Brazil source: `HCEB Module KPI 2026_31Aug2026(2).xlsx`
- Current master: `총괄파일_인도7월_브라질6_7월반영_실파일최종보정_v16검증본(1).xlsx`

## Structural import
- India source: artifact_tool import PASS; expected `Final With HQ Suggestion` sheet present.
- Current master: artifact_tool import PASS; expected India/Brazil report sheets present.
- Brazil source: artifact_tool parser raised `Format_InvalidStringWithValue`; standard OOXML ZIP/XML inspection used for read-only validation. This parser incompatibility is not counted as an HD-24 browser failure.

## Source horizon / future contamination
- India source actual-row distribution is overwhelmingly July horizon (97 July, 6 June, 1 January among structural candidate rows).
- Brazil source actual-row distribution is overwhelmingly July horizon (80 July, 1 January among structural candidate rows).
- Current master India report sheet: no numeric values detected in Aug–Dec columns AH:AL.
- Current master Brazil report sheet: no numeric values detected in Aug–Dec columns AH:AL.
- Therefore the previously observed Brazil future-month contamination condition does NOT exist in this uploaded v16 master.

## Production mapping spot/full-history subset checks
Using production mapping rows/scales visible from `mapping_india.json` and `mapping_brazil.json`:
- India: 21 mapped KPIs checked for Jan–Jul, 142 comparable cells, 0 mismatches.
- Brazil: 27 mapped KPIs checked for July, 27/27 exact mapped/scaled matches.
- Brazil Jan–Jul subset: 183 comparable cells; 9 differences are within production display-precision tolerance; 7 are hard historical mismatches.

### Brazil hard historical mismatches found
1. Production Instruction Compliance Rate → master row 13
   - Jan source 21 vs master 79
   - Feb source 21 vs master 63
   - Mar source 43 vs master 49
   - Apr source 35 vs master 62
   - May source 26 vs master 74
   - Jun source 10 vs master 10 (match)
   - Jul source 25 vs master 25 (match)
2. Performance Test Defect Rate (Finished Product) → master row 42
   - Apr source 269 vs master 286
   - May source 259 vs master 217
   - Jan/Feb/Mar/Jun/Jul match.

These are pre-existing source↔master historical differences. Do not auto-correct them without a data-source decision.

## Correction — production history behavior rechecked
The initial working hypothesis that the older Brazil differences could block safe-reflect was incorrect and is superseded by direct inspection of production `safe-kpi-mapping.js`.
- Only `mo === horizon - 1` is added to `historyMismatch` and blocks the run.
- Older differences are added to `historyDrift`.
- `historyDrift` explicitly logs a warning, preserves the existing master value, and continues current-month reflection.
- Brazil June (`horizon - 1`) values for the identified KPI differences match the source.
- Therefore the seven Jan–May historical differences are NOT the live auto-run blocker.

## Auto-run control-path verification
A local Node DOM harness was used to execute the v25 auto-run state machine with fake source/master files and a simulated safe-reflect success transition.
Result: PASS.
Observed sequence:
- upload change recognized
- readiness true
- native `btn.click()` invoked
- safe success signature written
- auto-run completion signature recognized

A Chromium/headless browser harness was also attempted. It did not produce a usable end-to-end result in the current execution environment and timed out; this failed attempt is retained here and is not counted as application PASS.

## v26 readiness hardening
Commit `9c8e6904c63dedf25adac08472d8890b3f54d271` — `fix: harden live auto-run readiness v26`
- `hd24-auto-run.js` now independently checks the actual runtime objects: `srcWorkbook`, `masterWorkbook`, `masterZip`, and non-empty `mappingData`.
- Safe prerequisites remain mandatory: `window.hd24SafeReflectReady === true` and `btnReflect.dataset.safeReflectReady === '1'`.
- If all safe/core prerequisites are independently true but the button remains stale-disabled, v26 repairs only that stale UI state and calls `checkReady()` again.
- No mapping, unit, future-month, previous-month, formula, duplicate-target, or post-write validation is bypassed.
- Wait-state diagnostics now expose `disabled / safe / dataset / src / master / zip / mapping` so a future stall identifies the exact missing prerequisite.
- Success logging is emitted only on the first transition for a signature, eliminating repeated success log noise.

Commit `0936e49f8d3bf2580add6ae707b5c795ab25f0ac` — `fix: load auto-run v26`
- Production wrapper changed from `hd24-auto-run.js?v=25` to `v=26`.

Commit `472cc12404414764d7ff9cd4548b33f4aa6b937f` — `fix: refresh live auto-run v26`
- `refresh-runtime.html` now force-preloads `hd24-auto-run.js?v=26`.

## Deployment / Actions verification
- Pages run `34808728499` for v26 wrapper: build SUCCESS, deploy SUCCESS; `report-build-status` was still in progress at the latest poll.
- Runtime Regression run `34808729057`: failed before executing any job steps (`steps=null`).
- Apply UI run `34808729017`: failed before executing any job steps (`steps=null`).
- These `steps=null` runs are retained as GitHub Actions runner/execution-layer failures and are not application assertion failures.

## Current conclusion
- Current uploaded India/Brazil/master data do not expose a safe-reflect data blocker for July.
- Older Brazil history differences are warnings, not blockers.
- Production deployment path is functioning through Pages build/deploy.
- Remaining live risk is runtime readiness/event synchronization; v26 directly hardens and diagnoses that path without weakening fail-closed safety.
- Do not declare full live-browser E2E PASS until the full production chain completes: file selection → safe reflect → verified workbook → analysis → action workbook → reply workbook → mail Preview.
