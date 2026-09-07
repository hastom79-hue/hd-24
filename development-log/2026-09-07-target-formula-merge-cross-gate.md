# HD-24 v9 Target × Formula/Merge Cross Gate — 2026-09-07

## Scope
Cross-checked the canonical master workbook formula/merge locations against the current India/Brazil mapping target rows.

## Canonical formula cells in monthly area
India formula rows in AA:AL: 18, 81, 94, 121.
Brazil formula rows in AA:AL: 96, 97, 125.

## Mapping intersection
GitHub mapping search confirms none of the India formula rows are India `masterRow` targets, and none of the Brazil formula rows are Brazil `masterRow` targets. Runtime supplements target India row 42 and Brazil row 34, also non-formula rows.

Result:
- Actual target ↔ formula-cell collision: 0
- Actual target ↔ merged-cell collision: 0
- Current canonical July reflection risk from formulas/merges: PASS

## Hardening note
`patchCell()` does not explicitly reject a formula target cell. Current canonical is safe, but a future template could introduce a formula into a mapped target. Add fail-closed formula-cell protection before production release or as the next hardening patch, then re-run regression gates.

Main remains unchanged.