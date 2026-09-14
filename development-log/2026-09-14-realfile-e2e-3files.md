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
- `hd24-auto-run.js` independently checks the actual runtime objects: `srcWorkbook`, `masterWorkbook`, `masterZip`, and non-empty `mappingData`.
- v26 still required both `window.hd24SafeReflectReady === true` and `btnReflect.dataset.safeReflectReady === '1'`.
- If all safe/core prerequisites were independently true but the button remained stale-disabled, v26 repaired only that stale UI state and called `checkReady()` again.
- No mapping, unit, future-month, previous-month, formula, duplicate-target, or post-write validation was bypassed.
- Wait-state diagnostics expose `disabled / safe / dataset / src / master / zip / mapping`.

Commit `0936e49f8d3bf2580add6ae707b5c795ab25f0ac` — `fix: load auto-run v26`
Commit `472cc12404414764d7ff9cd4548b33f4aa6b937f` — `fix: refresh live auto-run v26`

## v27 readiness deadlock removal
Commits:
- `766879a6e02c4f0f17e3d5dfcd2717379d738642` — auto-run v27
- `e6df4895a3fdb2e64eb175216c2fd20e7b927bd3` — production loader v27
- `f748a71dfc40f5a6bed9a31bb84e8f24487fbcc7` — refresh helper v27

Change:
- `data-safe-reflect-ready` is no longer a blocking prerequisite for auto-run.
- Authoritative readiness remains `window.hd24SafeReflectReady === true` plus parsed source/master/masterZip/non-empty mapping and an executable reflect button.
- Dataset readiness remains visible in diagnostics only.
- Fail-closed validation inside `safeReflect` is unchanged.

Deployment verification:
- Pages run `34810912938` for HEAD `f748a71dfc40f5a6bed9a31bb84e8f24487fbcc7`: build SUCCESS, report-build-status SUCCESS, deploy SUCCESS.

## Regression-test correction after v27
A stale test defect was found after v27:
- `tests/auto-run-readiness.test.js` still asserted that `btn.dataset.safeReflectReady === '1'` must exist as a gate.
- This contradicted the new v27 production contract and would have caused a genuine regression failure once GitHub hosted runners began executing steps again.

Commit `c5f18857c3c6fa8f0056bb53fc2dd0141f802bf9` — `test: align auto-run readiness regression with v27`
- Removed the obsolete dataset-gate assertion.
- Added an explicit missing-dataset test case.
- Added duplicate-suppression assertion (`clickCount === 1`) after success signature.
- Kept assertions for authoritative global readiness, parsed prerequisites, stale-disabled repair, native click path, and one-time success logging.

Independent local Node execution of the v27 code path with the dataset marker intentionally absent:
- stale-disabled button repaired: PASS
- native safe-reflect click invoked: PASS
- success signature recognized: PASS
- duplicate auto-run after success prevented: PASS
- Result: `PASS auto-run v27 local harness`

## Follow-up analysis synchronization bridge — v1/v2 history
Initial sync bridge commits:
- `e9d1de15027c303dec749b5ee0710344b8608b44` — added `hd24-followup-sync.js`.
- `4723fcb992087790a819bc650090de77b23c9284` — loaded the bridge in production.
- `8fb74415d87e03789d1a3712d4a7a74141955fd5` — added it to forced runtime refresh.

Reason:
- Existing `hd24-followup.js` marked an upload signature as handled before proving that asynchronous KPI analysis had finished. Its fixed 80 ms wait could therefore observe empty/stale results and suppress later retries.
- The bridge waited for the same upload signature to have safe-reflect success plus a valid selected month plus current-month `allResults` before triggering the existing Preview/reply-file path.

Deployment evidence:
- Pages run `34811523701` for loader HEAD `4723fcb992087790a819bc650090de77b23c9284`: completed SUCCESS.

v2 then corrected a stale-preview race:
- `hd24-followup.js` leaves the previous Preview visible when a new source/master pair is selected.
- The initial bridge could mistake that visible Preview for the new file pair.
- `3acdd7a6e3de2dafb32aeed3214ae1c0dbac2cd2` cleared old Preview state and tagged generated Preview with the current upload signature.
- `8930604427d1f19e6047ef6a6c608a8b112425bb` loaded v2.
- `74086f6e81f7840e0d5262e2fc28e5a76c23c9c5` refreshed v2.

## Action export v25 — stale analysis protection
Direct review found another race: immediately after `btnJudge.click()`, an earlier upload's `allResults` could still be present and be mistaken for the current analysis.

v25 correction:
- `eb2c503e3991db82e543c69809008741015e65c5` — action-export v25 requires a resultCard mutation after the current `btnJudge` trigger before current-month results can be marked analysis-ready.
- `14e3682ed3c1fe703ea37e392a173bd8e7df7a40` — production loader v25.
- `19dfb2cd8d79295031909e48b939aa4979477f63` — refresh helper v25.
- `bc695e8d1befb80646d23c2cdfd0d8888fec0cbb` — regression aligned to v25.
- `hd24-action-export-complete` carries the current upload signature and is emitted only after `_분석후속조치본.xlsx` is generated.

Pages evidence:
- run `34812674886` completed SUCCESS for the v25/log HEAD at that stage.

## Follow-up sync v3 — action-export gate + dedupe
A further chain review showed v2 was still not sufficient for end-to-end integrity:
- it did not prove that `_분석후속조치본.xlsx` for the current signature had completed before follow-up packaging.
- an untagged visible Preview could still be trusted in some legacy timing paths.
- repeated same-signature safe-complete events could reset state and allow duplicate package/reply generation.
- reply Excel had no explicit once-per-signature guard in the sync bridge.

v3 correction:
- `080d9692f28b6121ebe212c3fb9dc127d6aabc4b` — strict action-export signature gate and dedupe.
- `6a5c88fc4543de25ded885240b40a10bfd473186` — production wrapper loads `hd24-followup-sync.js?v=3`.
- `a2666f95d933eb09c62cce6b37649b5b016058a1` — refresh helper preloads v3.
- `060f18152cb06b9a465d972ec52ae9bbd6b581cc` — new `tests/followup-sync.test.js`.

v3 requires the same current signature across:
1. safe-reflect success,
2. `hd24-action-export-complete`,
3. current-month analysis,
4. mail Preview tag,
5. reply workbook once-per-signature state.

Target chain is now encoded as:
`upload → safe-reflect → current analysis → _분석후속조치본.xlsx complete → current-signature Preview → reply Excel 1x`.

Runtime workflow hardening:
- `c07bc03f534ada0929265f6e4546cc3dfe740573` — runtime gate updated for auto-run v27 and follow-up sync v3; runs syntax checks and new follow-up regression.
- `39b86f2ae983cb1b0575605bc2fe4d8c92e1cde0` — corrected workflow to inspect dependency/fail-closed invariants from actual `hd24-ui-v3-core.js` rather than thin wrapper `hd24-ui-v3.js`.
- This workflow correction records a real test-infrastructure defect instead of hiding it.

Deployment/execution evidence:
- Pages run `34813275926` for `c07bc03f...` completed SUCCESS; v3 production runtime/cache wiring is deployed.
- Latest HEAD Pages run `34813339866` for `39b86f2...` was still queued at last observation; final result must be recorded later rather than assumed.
- Runtime Regression run `34813340598`, job `103878853753`, completed failure with `steps=null`; no workflow steps ran, so it remains an execution-layer/runner failure rather than an application assertion failure.

## GitHub Actions state
- Custom Runtime Regression / Apply UI / Browser E2E jobs continue to fail before running steps (`steps=null`) in this period.
- These are retained as runner/execution-layer failures, not application assertion failures.
- Static and code-path regressions are nevertheless kept current so stale assertions cannot become the next blocker once runners recover.

## Current conclusion
- Current uploaded India/Brazil/master data do not expose a safe-reflect data blocker for July.
- Older Brazil history differences are warnings, not blockers.
- v27 removes a real auto-run readiness deadlock while retaining safe-reflect fail-closed validation.
- Action export v25 prevents stale previous-upload analysis from being accepted as current.
- Follow-up sync v3 now waits for the current action-workbook completion event and enforces current-signature Preview/reply generation with duplicate suppression.
- Production v3 wiring is confirmed on Pages via successful run `34813275926`.
- Remaining unproven item is full production browser E2E with the real uploaded files: file selection → safe reflect → verified workbook → analysis → action workbook → reply workbook → mail Preview.
- Do not declare full live-browser E2E PASS until that chain is observed end to end.
- Actual authenticated email sending is not claimed unless a real `HD24_MAIL_ENDPOINT` is configured; static Pages otherwise provides Preview/mail-client fallback only.
