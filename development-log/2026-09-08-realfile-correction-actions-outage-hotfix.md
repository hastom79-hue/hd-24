# HD-24 real-file correction / Actions outage / v15 hotfix

Date: 2026-09-08

## Approved baseline and real sources
- Locked baseline: `총괄파일_인도7월반영_최종검증본 (4)(3).xlsx`
- India source: `HCEI_Module_KPI_2026_HQ_recomendation_Jul26.xlsx`
- Brazil source: `HCEB_Module_KPI_2026_31Aug2026.xlsx`

## Derived corrected validation workbook
Generated without overwriting the locked baseline:
- `총괄파일_인도7월_브라질6_7월반영_실파일최종보정_v16검증본.xlsx`

Corrections retained/applied in the derived workbook:
- India Manufacturing Lead Time master row 42: Jun `7.37`, Jul `7.28`.
- Brazil LTIR master unit metadata row 7: `%`.
- Existing NVA correction retained: Jun `0`, Jul `1` at master row 122.
- Existing Brazil June corrections retained from the validated NVA working file, including Performance Test Defect Rate and VSE anchor values.
- Brazil pre-existing Aug/Sep contamination rows 41–49 remains cleared in the derived workbook.

Reporting-sheet verification:
- India Aug–Dec numeric contamination: `0`.
- Brazil Aug–Dec numeric contamination: `0`.
- India reporting-sheet formula error matches: `0`.
- Brazil reporting-sheet formula error matches: `0`.

## Real-file mapping simulation after hotfix semantics
Using actual source workbook storage, Excel style-aware time conversion, current mappings, runtime additions, and v15 prior-month policy:

### India
- Runtime mapping count: `77`.
- Accepted: `77/77`.
- Rejected: `0`.
- Source horizon: Jul.
- Latest-month distribution: Jun `2`, Jul `74` among mapped KPIs with numeric history; near-horizon ratio `100%`.
- Prior-month (Jun) anchor mismatches: `0`.
- Master future contamination after Jul: `0`.
- Earlier-month drift preserved/warned: `5` cells, all Jan–May Manufacturing Lead Time values where the master retained 0 while source history is 7.50/7.41/7.00/6.64/7.31.
- PPM exception validated from actual source: source unit `Nos.` and Jan–Jul values align with master PPM values.
- 5S Audit Score exception validated from actual source: source `%` fractions x100 align with master score values.

### Brazil
- Runtime mapping count: `77`.
- Accepted: `77/77`.
- Rejected: `0`.
- Source horizon: Jul.
- Latest-month distribution: Jul `77`.
- Prior-month (Jun) anchor mismatches: `0`.
- Master future contamination after Jul: `0` in corrected workbook.
- Earlier-month drift preserved/warned: `29` cells under v15 policy.
- LTIR actual source: KPI row 168, unit `%`, Actual row 169 values Jan–Jul `0, 2.2, 0, 2, 1, 0, 1`; runtime mapping unit is overridden to `%`.

## Fail-closed future-month attack
Locked baseline, header row excluded:
- India future numeric values after Jul: `0`.
- Brazil future numeric values after Jul: `18`.
- Exact contaminated cells detected: `AH41:AH49` and `AI41:AI49`.
- Values: `415/519, 1306/1203, 293/412, 1335/1381, 2436/2011, 1170/1239, 58/66, 528/520, 15/13`.

Corrected derived workbook:
- India future numeric values after Jul: `0`.
- Brazil future numeric values after Jul: `0`.

## Runtime hotfix
Core version label intentionally remains v15 to avoid changing loader/UI contracts while Actions is unavailable.

Hotfix commit:
- `d6b039cdc9e5db80ff5c4308f9952d8bdeaaf1b8` — initial real-file hotfix.
- `5283ce21743b2747ff80b9eb47abcf0b845d749a` — corrected future-contamination scan to start after the discovered month-header row.

Current `safe-kpi-mapping.js` blob:
- `1236ba6715c0764236e1c3357886c94cae5b8934`

Hotfix behavior:
1. Brazil LTIR mapping is runtime-overridden to `%` only for the exact LTIR KPI.
2. India PPM permits the exact source `Nos.` -> mapping `PPM` family exception only for normalized KPI name `ppm`.
3. India 5S Audit Score permits exact source `%` -> mapping `score` exception only for normalized KPI name `5s audit score`.
4. `masterFutureContamination()` blocks export if numeric/annotated values exist in master months after the source horizon.
5. Future scan starts at `masterInfo.row + 1`, so month-header Date values are not falsely classified as contamination.

Static re-fetch of the GitHub blob confirms all four guards are present.

## GitHub Actions execution-layer outage
The following workflows failed before any runner steps were created (`steps=[]`, runner id 0 / no application test execution):
- one-shot v16 run `34188020819`
- one-shot retry `34188074574`
- normal Runtime Regression `34188074601`
- trusted Apply approved UI `34188127973`
- after direct hotfix, India Browser E2E `34188477450`, Runtime Regression `34188477389`, Brazil Browser E2E `34188477388`, Apply approved UI `34188477546` also failed in the same execution-layer condition.

These failures are not evidence of application test failures because the jobs never started executing test steps.

Temporary one-shot workflow/helper/trigger were removed. `apply-approved-ui.yml` was restored before the direct hotfix.

## Deployment
GitHub Pages deployment for hotfix commit `d6b039cdc9e5db80ff5c4308f9952d8bdeaaf1b8`:
- run `34188476806`
- conclusion: SUCCESS.

## Current gate
File/data logical validation: PASS on the corrected derived workbook.
Runtime static hotfix verification: PASS.
Locked baseline contamination attack: correctly BLOCKS 18 Brazil future cells.
Corrected workbook future-contamination gate: PASS (0 cells).
Permanent Browser E2E / Runtime Regression rerun: PENDING until GitHub Actions runner execution resumes.

Do not declare the entire HD-24 chain final until the permanent India/Brazil browser E2E and Runtime Regression workflows actually execute again and pass.
