# 2026-09-16 — Approved UI self-reference gate fix

## Finding
`Apply approved HD-24 UI` run 35035320707 executed normally through checkout and UI alignment, then failed in `Verify no stale v3 reinjection logic`.

The gate searched the workflow source for the retired literal `safe-kpi-mapping`, but the assertion itself contained that exact literal. Therefore the assertion was self-defeating and always failed once the runner actually executed the step.

## Fix
- Build the retired token as `'safe-kpi-'+'mapping'` so the verification source does not contain the forbidden literal.
- Removed the obsolete loader name from the explanatory comment as well.
- Removed an unused read of `hd24-ui-v3.js` from the alignment step.
- No production runtime/cache version bump: this is CI verification logic only.

## Validation intent
The next push-triggered workflow must execute the stale reinjection gate and reach the commit/no-op step. A `steps=null` runner result must still be treated separately as execution-layer failure, not an application assertion failure.
