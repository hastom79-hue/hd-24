# HD-24 v9 Formula Superset vs Actual Mapping Gate — 2026-09-07

## Scope
Read-only audit of canonical workbook KPI rows across AA:AL (12 monthly columns), followed by separation of formula-bearing KPI rows from actual v9 mapping targets.

## Superset findings
- India KPI rows inspected: 114 × 12 = 1368 cells
- Brazil KPI rows inspected: 118 × 12 = 1416 cells
- Formula cells found on KPI-row superset: India 9, Brazil 6 (15 total)
- Merged cells intersecting KPI monthly rows: 0
- Existing target-style missing cases: 0

Formula-bearing master rows:
- India: 18, 81, 94
- Brazil: 96, 97

## Actual mapping intersection
These formula-bearing rows are not actual v9 target masterRows for the corresponding plant. Therefore current canonical July reflection has 0 formula-target collisions and 0 merge-target collisions.

## Decision
- Current canonical blocker: 0 / PASS
- Future robustness: HARDEN required
- `patchCell()` should fail closed if a future mapped target cell contains an `<f>` formula before writing.
- main remains unchanged; no deployment.
