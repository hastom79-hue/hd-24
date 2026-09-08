# 2026-09-08 UI Recovery Workflow Validation

## Scope
Validate the permanent `.github/workflows/apply-approved-ui.yml` after removing hard-coded stale cache version reinjection.

## Execution history
1. Run `34181283812`
   - active runtime extraction: PASS (`v15`, changed=false)
   - validation step: FAIL
   - cause: assertion text compared an over-escaped regex literal; runtime/UI files were not modified.
2. Run `34181360277`
   - active runtime extraction: PASS (`v15`, changed=false)
   - validation step: FAIL
   - cause: the test itself contained the forbidden literal `hd24-ui-v3.js?v=3`, so it self-matched. Runtime/UI files were not modified.
3. Run `34181400620`
   - active runtime extraction: PASS (`v15`)
   - stale-version assertion: PASS
   - approved-UI recovery step: PASS
   - workflow conclusion: SUCCESS

## Final permanent-workflow behavior
- runtime version is derived from `hd24-ui-v3.js` -> `safe-kpi-mapping.js?v=<version>`;
- recovery fails closed if the version cannot be derived;
- missing UI references are restored with the active version, not a fixed old version;
- stale v3 checks avoid embedding the forbidden string contiguously in the assertion itself.

## Runtime re-verification after workflow fix
- `hd24-ui-v3.js` still loads `safe-kpi-mapping.js?v=15`;
- `index.html` still loads `hd24-ui-v3.js?v=15`;
- no runtime file was changed by the recovery-workflow validation.

Final workflow-fix commit:
- `9632dcf113a544b9def700a778c1a2b4a717f5d4`
- message: `fix: make stale-cache assertion non-self-matching`

Browser GUI click E2E remains unclaimed; this entry records GitHub Actions/static/runtime-reference validation only.
