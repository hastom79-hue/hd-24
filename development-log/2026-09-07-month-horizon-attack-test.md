# HD-24 v9 Month/Horizon Attack Test — 2026-09-07

## Scope
Real-file attack validation of month-header recognition and latest-actual-month detection using the canonical master and current India/Brazil monthly source files. No source/master file was modified.

## Month-header validation
India source (`Final With HQ Suggestion`, row 11):
- Jan-Mar are text (`Jan-26`, `Feb-26`, `Mar-26`).
- Apr-Dec are Excel date serials which SheetJS `cellDates:true` reads as Date values.
- v9 `parseMonth()` recognizes all 12 months correctly.

Brazil source (`HCEB KPIs`, row 11):
- Jan-Nov are English abbreviations.
- December is `Dez-26`.
- v9 explicitly supports `dez`, so all 12 months are recognized.

Canonical master reporting sheets:
- `AA:AL` = `1월` through `12월`.
- All 12 month headers recognized for both India and Brazil.

## Actual-row horizon attack test
Structural KPI/Actual candidates:
- India: 103 KPI structures
- Brazil: 80 KPI structures

Latest numeric month distribution on Actual rows:
- India: 97 KPIs through July, 6 KPIs through June
- Brazil: all 80 KPIs through July

Therefore plant-level `sourceHorizon()` resolves July for both plants.

## August false-positive attack
- India Actual rows with numeric values in Aug-Dec: 0
- Brazil Actual rows with numeric values in Aug-Dec: 0
- Brazil KPI/target rows with numeric August targets: 77
- These 77 target-row values do not affect `sourceHorizon()` because v9 evaluates only the validated Actual row (`labelRow + 1`).
- False August horizon detections: 0

## Result
- India source month headers: 12/12 PASS
- Brazil source month headers: 12/12 PASS
- India master month headers: 12/12 PASS
- Brazil master month headers: 12/12 PASS
- India Actual structures: 103/103 PASS
- Brazil Actual structures: 80/80 PASS
- Future-month Actual misread: 0 PASS
- Brazil target-row August contamination: 0 PASS

Validation artifact created in working environment: `HD24_v9_월헤더_기준월_공격테스트.xlsx`.

Main branch remains unchanged. Continue preview validation before any deployment.