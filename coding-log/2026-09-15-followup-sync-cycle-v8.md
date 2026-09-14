# Coding Log — Follow-up Sync Upload Cycle v8

Date: 2026-09-15 KST

## Files changed
- `hd24-followup-sync.js`
- `hd24-ui-v3.js`
- `refresh-runtime.html`
- `tests/followup-sync.test.js`
- `tests/followup-reset-guard.test.js`
- `.github/workflows/hd24-runtime-regression.yml`

## Code decisions
1. File signature alone is not a sufficient identity for two consecutive selections of the same physical files.
2. Reuse the monotonic `window.hd24ActionCycle` created by action-export v27 instead of changing the existing upload signature format.
3. Follow-up snapshot, Preview, reply generation, reply validation, retries and completion are valid only when both signature and cycle match.
4. Preview identity now includes `data-hd24-cycle` in addition to signature, month, KPI count and exact master-row fingerprint.
5. Reply validation checks cycle before validation, after workbook load and immediately before successful completion.
6. Retry counters are keyed by `cycle::signature`, so a failed prior cycle cannot consume retries for a new cycle using the same files.
7. Stale async failures return without clearing current-cycle state.
8. Existing manual Preview/download/send controls remain intact; no automatic email send was introduced.

## Defects corrected
- v7 could theoretically accept an old async reply result after the same source/master pair was re-selected because the signature can be identical.
- `tests/followup-sync.test.js` still asserted action-export v26 although production loader was already v27.
- runtime regression workflow still contained v7 follow-up assertions and would fail once GitHub runner execution resumes.

## Regression behavior
Positive scenario:
- current cycle action-export event -> one Preview -> one reply workbook request -> reopened workbook exact watch-set/Target/Actual/Status verification -> package complete.

Negative scenarios:
- same-count wrong KPI substitution remains fail-closed with bounded retry.
- prior-cycle event with identical file signature produces zero Preview and zero reply workbook clicks.
- async reply validation crossing an upload-cycle change is rejected.

## Deployment discipline
Pages deployment success is tracked separately from custom runtime workflow execution. Custom jobs with null/empty `steps` are recorded as GitHub runner execution-layer failures and are not counted as application test failures.
