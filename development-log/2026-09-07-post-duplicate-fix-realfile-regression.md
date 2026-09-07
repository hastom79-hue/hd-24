# HD-24 v9 Post-Duplicate-Fix Real-File Regression — 2026-09-07

## Scope
Re-ran the real India/Brazil source workbook structural regression after patching exact-duplicate KPI detection in `findStrictInColumn`.

Files checked:
- India monthly source: `## HCEI Module KPI 2026 _HQ recomendation Jul 26.(1).xlsx`
- Brazil monthly source: `HCEB Module KPI 2026_31Aug2026(1).xlsx`
- Canonical master: `총괄파일_인도7월반영_최종검증본 (4)(2).xlsx`

## Execution note
The first QA script counted the `KPI Indicators` header row as a structural KPI candidate, producing false counts 104/81. This was a test-script classification error, not an application defect. The script was corrected to exclude the known header label and immediately re-run.

## Corrected results
- India structural KPI candidates: 103/103 PASS
- Brazil structural KPI candidates: 80/80 PASS
- Combined: 183/183 PASS
- India exact normalized source KPI duplicates: 0 PASS
- Brazil exact normalized source KPI duplicates: 0 PASS
- India master KPI-name duplicates: 0 PASS
- Brazil master KPI-name duplicates: 0 PASS
- India Actual row immediately follows KPI row: 103/103 PASS
- Brazil Actual row immediately follows KPI row: 80/80 PASS
- India numeric Actual values in Aug-Dec: 0 PASS
- Brazil numeric Actual values in Aug-Dec: 0 PASS
- India horizon distribution: 97 KPIs through Jul, 6 KPIs through Jun PASS
- Brazil horizon distribution: 80 KPIs through Jul PASS
- Exact FAIL scan after correction: 0

## Conclusion
The duplicate-exact matcher hardening does not break the current real India/Brazil data structure. The current real files contain no duplicate normalized KPI names, while malformed future files with duplicate exact names are now blocked by the patched matcher.

Main remains unchanged; validation continues on `preview-v9-integrated`.