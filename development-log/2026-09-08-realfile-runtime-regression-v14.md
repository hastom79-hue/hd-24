# HD-24 real-file runtime regression / v14 hardening — 2026-09-08

## Scope
- Locked master baseline: `총괄파일_인도7월반영_최종검증본 (4)(3).xlsx`
- India raw: `HCEI_Module_KPI_2026_HQ_recomendation_Jul26.xlsx`
- Brazil raw: `HCEB_Module_KPI_2026_31Aug2026.xlsx`
- Runtime branch: `main`

## Important population correction
Previous notes used `183/183` as if it were the runtime mapping count. That wording was incorrect.

- India raw KPI label rows: 104
- India KPI rows with at least one populated Actual month: 103
- Brazil raw KPI/Actual structures: 80
- Active raw structures with Actual data: 103 + 80 = 183
- India runtime master-reflection mappings: 77 (76 JSON + one guarded runtime addition)
- Brazil runtime master-reflection mappings after this regression: 77 (76 JSON + one guarded runtime addition)
- Current runtime master-reflection target population: 154

Raw source population and master-reflection mapping population are different concepts. Local/supporting/discontinued raw KPIs must not be described as master reflection mappings unless a unique active master KPI is verified.

## Defects found and fixed
### 1. Unit fail-closed implementation was normalizing away unit punctuation
`unitFamily()` previously called `normText()`. `normText()` removes `%`, `/`, and `:`, so valid units such as `%`, `MH/대`, `HH:MM`, and `인/건` could become unclassifiable and incorrectly block valid files.

v14 fix:
- introduced dedicated `unitToken()` that preserves unit-significant punctuation;
- recognizes `%`, DPTU, PPM, MH/unit forms, HH:MM/hr/time, day, count, person, ratio/index, turnover, score, and currency families;
- source blank/unclassified units are accepted only when the master unit independently matches the mapping unit;
- source generic time vs mapping MH is allowed only for contextual MH/downtime KPI names;
- unknown or incompatible units remain fail-closed.

Validation workflow sample matrix: PASS.
Runtime commit: `fc50315d5eea3c6bdda32f4c56863571ff31d1a5`.

### 2. Structurally valid but fully blank Actual row blocked the whole plant
India `Inventory Accuracy Rate` has a valid KPI row and immediate next Actual row, but all month Actuals are currently blank. v13 treated this as structural failure.

v14 fix:
- `strictActualRow()` now validates row position and blank KPI-name cell only;
- a fully blank Actual row remains a valid structure and is treated as no-data by horizon/value logic;
- it no longer blocks every other valid KPI.

### 3. Brazil NVA reflection mapping was missing
Raw row 150: `NVA reduction cases reflecting from SWC`, Actual row 151, unit `Nos.`.
The active master target exists at row 122: `투입 개선 MH - 비가치 작업 개선 건수로 관리(자체관리)`, target 11, unit `건/년`.

Fix:
- added Brazil mapping row150/151 -> master row122;
- direction upward, scale 1, unit `건/년`;
- Brazil static mapping count becomes 76;
- with runtime IQ200 addition, Brazil runtime mappings become 77;
- duplicate masterRow = 0; duplicate KPI = 0.

Other raw Brazil omissions were reviewed:
- `Welding Process Defect Rate (NDT)`: corresponding aggregate master process-defect KPI is discontinued (`지표삭제`) and is not treated as a unique active mapping;
- `No. of Trainings (External/Internal)` and workshop/opinion-survey KPI: no unique active final master target;
- therefore they remain source/supporting KPIs rather than master reflection mappings.

## Real-file correction generated
Derived from the previously row-shift/future-month-corrected working file:
`총괄파일_인도7월_브라질6_7월반영_행밀림전수검증_NVA보정본.xlsx`

Brazil master row122 values verified after export/re-import:
- May = 0
- Jun = 0
- Jul = 1
- Aug = blank

Target report sheet checks:
- India reporting sheet formula/error scan: 0
- Brazil reporting sheet formula/error scan: 0
- India Aug-Dec numeric Actual cells: 0
- Brazil Aug-Dec numeric Actual cells: 0

Note: unrelated legacy/reference sheets in the workbook contain pre-existing `#REF!/#DIV/0!` values and external/missing-sheet references. They were not introduced by this NVA patch. The two HD-24 reporting sheets above are clean.

## Historical mismatch behavior
The locked baseline has historical NVA values that differ from the latest Brazil source (for example February master = 2 vs source = 1). With the newly restored NVA mapping, attempting to reflect the latest source into that unchanged locked baseline will correctly stop at the historical mismatch gate. This is intended fail-closed behavior and prevents silent rewriting of approved history.

## Runtime safety status after v14
PASS:
- legacy unsafe reflect path removed;
- safe-ready button gate;
- cache-busted v14 loader;
- strict KPI-column matching and ambiguity blocking;
- immediate-next Actual row structural validation;
- blank Actual rows allowed as missing data;
- unit fail-closed with actual unit syntax preserved;
- historical mismatch block;
- future-month outlier block;
- formula-target block;
- duplicate KPI×month target block;
- post-write XML value verification;
- current Brazil NVA master-reflection gap recovered.

## Remaining limitation
Browser GUI click E2E is not claimed in this log unless a real browser automation execution is available. Static/runtime-path and real-file data regressions are recorded separately from GUI E2E.

## Cleanup
Temporary v14 hardening workflow/helper and temporary Brazil NVA mapping workflow were removed after successful validation/commit. Development logs remain append-only.