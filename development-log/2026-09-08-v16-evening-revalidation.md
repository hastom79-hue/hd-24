# HD-24 v16 evening revalidation — 2026-09-08

## Scope
- Revalidated uploaded workbook: `총괄파일_인도7월_브라질6_7월반영_실파일최종보정_v16검증본.xlsx`
- Read-only ZIP/XML inspection only. Production workbook was not modified.
- Rechecked latest main HEAD before this log: `ded7ab8290882175199a9eafc689af1ce33f2eeb`.

## Workbook results
### India report sheet
- Sheet: `인도법인 KPI(26년 보고용)`
- Formula/error tokens checked: `#REF!`, `#DIV/0!`, `#VALUE!`, `#NAME?`, `#N/A`
- Result: 0 error cells.
- Future-month numeric contamination scan: AH:AL, row 5 onward.
- Result: 0 numeric cells.
- Manufacturing Lead Time anchor/current values preserved:
  - AF42 (Jun): 7.37
  - AG42 (Jul): 7.28

### Brazil report sheet
- Sheet: `브라질법인 KPI(26년 보고용)`
- Formula/error tokens checked: `#REF!`, `#DIV/0!`, `#VALUE!`, `#NAME?`, `#N/A`
- Result: 0 error cells.
- Future-month numeric contamination scan: AH:AL, row 5 onward.
- Result: 0 numeric cells.
- Key corrected values preserved:
  - AF7 / AG7 (LTIR): 0 / 1
  - AF42 / AG42 (performance test defect rate): 256 / 242
  - AF122 / AG122 (NVA): 0 / 1

## GitHub deployment / Actions state
- Latest Pages deployment for HEAD `ded7ab8290882175199a9eafc689af1ce33f2eeb`, run `34206505426`: SUCCESS.
- Runtime Regression run `34206506579`: FAILURE before steps; job `regression` returned `steps=null`.
- Apply approved UI run `34206506548`: FAILURE before steps; job `apply` returned `steps=null`.
- Therefore the repeated CI failures remain classified as Actions runner/execution-layer failures rather than application test failures.

## Current decision
- Workbook data integrity: PASS.
- Future-month contamination gate input state: PASS (0 cells in corrected workbook).
- Latest Pages deployment: PASS.
- Permanent CI/E2E execution: still externally blocked at runner layer; do not mark application regression from these failures.
