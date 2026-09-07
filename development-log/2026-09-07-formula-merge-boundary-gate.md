# HD-24 v9 Formula / Merge Boundary Gate — 2026-09-07

## Purpose
Attack-test the XML patch boundary before main deployment. Canonical master was inspected read-only; no operational workbook was modified.

## Canonical master findings
India report sheet (`sheet5.xml`):
- total formula cells: 154
- formula cells located somewhere in AA:AL: 14
- merge ranges intersecting AA:AL: 2 (`Y2:AA2`, `Y3:AL3`), both header-area merges
- sheet protection: none

Brazil report sheet (`sheet6.xml`):
- total formula cells: 153
- formula cells located somewhere in AA:AL: 11
- merge ranges intersecting AA:AL: 2 (`Y2:AA2`, `Y3:AL3`), both header-area merges
- sheet protection: none

The formula rows observed are not automatically equivalent to v9 KPI target rows. Mapping spot checks confirmed examples such as Brazil masterRow 81 and other mapped rows are distinct from the observed Brazil formula rows 96/97/125; further target-level intersection checking remains required.

## Newly identified robustness gap
Current `patchCell()` replaces an existing cell body with numeric `<v>` content while preserving attributes. If a future canonical template places a formula `<f>` in an actual patch target cell, that formula would be replaced rather than rejected.

Current July canonical safety is not yet declared failed by this finding because target-level formula intersection has not been established. However, future-template robustness should fail closed on formula-bearing target cells.

## Required next gate
1. Resolve all runtime mappings to exact master target rows.
2. Intersect planned patch cells with formula cells and merged ranges.
3. Require 0 intersections for the current canonical workbook.
4. Add an explicit formula-target rejection guard before main deployment, then rerun regression.

## Deployment status
- Preview only.
- Main unchanged.
- No deployment approval requested yet.