# 2026-09-08 v16 latest-head revalidation

## Scope
Revalidated latest known main head `086f54451f1597493cc64971ed2f53cb5e6e1c2e` and the uploaded workbook `/mnt/data/총괄파일_인도7월_브라질6_7월반영_실파일최종보정_v16검증본.xlsx`.

## GitHub deployment / Actions
- Pages run `34206142109`: SUCCESS on head `086f54451f1597493cc64971ed2f53cb5e6e1c2e`.
- Runtime Regression run `34206143008`: FAILURE before any workflow step executed; job `101995957543` returned `steps=null`.
- Apply approved UI run `34206143005`: FAILURE before any workflow step executed; job `101995957361` returned `steps=null`.
- Therefore these two failures are still classified as GitHub Actions runner/execution-layer failures, not application-test failures.

## Independent workbook ZIP/XML verification
Target reporting sheets:
- `인도법인 KPI(26년 보고용)` -> `xl/worksheets/sheet5.xml`
- `브라질법인 KPI(26년 보고용)` -> `xl/worksheets/sheet6.xml`

Results:
- India report formula/error tokens `#REF!/#DIV/0!/#VALUE!/#NAME?/#N/A`: 0
- Brazil report formula/error tokens: 0
- India numeric values in Aug-Dec columns AH:AL (rows >=5): 0 cells
- Brazil numeric values in Aug-Dec columns AH:AL (rows >=5): 0 cells
- India Manufacturing Lead Time: `AF42=7.37`, `AG42=7.28`
- Brazil NVA: `AF122=0`, `AG122=1`

## Current verdict
- Workbook integrity recheck: PASS
- Future-month contamination recheck: PASS
- Latest Pages deployment: PASS
- Permanent Actions regression/UI jobs: blocked by external runner layer (`steps=null`), not by executed assertions.
