# HD-24 v9 KPI Matching Attack Test — 2026-09-07

## Executed cases
Synthetic attack tests were run against the current v9 `findStrictInColumn` matching semantics.

PASS cases:
- exact KPI name match
- KPI row moved to another row
- two similar non-exact KPI candidates -> ambiguous BLOCK
- unrelated KPI -> BLOCK
- low similarity -> BLOCK
- exact + similar candidate -> exact accepted

## Newly discovered edge risk
A synthetic source containing two identical exact KPI labels (e.g. `QIR`, `QIR`) is not marked ambiguous by `findStrictInColumn` because exact score is `0.995` and the ambiguity condition only applies when top score is below `EXACT_SCORE`.

Current real India/Brazil source files were previously audited and contain 0 duplicate KPI names, so this does not invalidate the current July data result. However, future monthly uploads could contain accidental duplicate exact KPI labels, and v9 should fail closed rather than silently choose the first row.

## Decision
- Current real-file gate: PASS (duplicate KPI names = 0)
- Robustness gate for future malformed input: FIX REQUIRED
- Do not deploy v9 to main until duplicate exact source/master KPI labels are explicitly rejected.

## Required fix
Strengthen strict matching so multiple exact normalized matches are treated as ambiguous/rejected. Re-run synthetic duplicate tests and real-file full mapping gate after patch.

Main remains unchanged.