# 2026-09-10 Browser Runtime Diagnostics

## Context
- Continued execution verification on HD-24 production main.
- main had advanced to `707319d2e5ef4e216606f5ec2e08423b19a5330a` before this check, including CDN fallback regression guard work.

## Verified runtime state
- `index.html` remains the restored E2E-proven entrypoint blob `68d46d95ea86e76962a2b0f2a6aabc801262844e`.
- `hd24-ui-v3.js` now contains CDN dependency fallback loading via jsDelivr for XLSX, JSZip and ExcelJS when the primary cdnjs globals are unavailable.
- safe runtime is still loaded from `safe-kpi-mapping.js?v=18`.

## New diagnostic surface
- Added `diagnostics.html` to production main.
- Commit: `d1a80f7f9855943faba3cca93e93ef95332e9057`.
- The page checks from the actual end-user browser:
  - CSS/UI JS/safe runtime HTTP availability
  - India/Brazil mapping availability
  - Brazil LTIR override token
  - India PPM Nos.→PPM exception
  - India 5S %→score exception
  - future-month contamination guard + header-row exclusion
  - main app load
  - XLSX / JSZip / ExcelJS globals
  - reflect button presence
  - `hd24SafeReflectReady`

## Actions execution status
- Runtime Regression run: `34417909000`.
- Job: `102686783712`.
- Job completed failure before any test step.
- `steps=[]`, `runner_id=0`, `runner_name=''`.
- This is still an Actions runner/execution-layer outage, not an application regression assertion failure.
- Apply approved UI on the same head also completed failure before useful execution.

## Pages
- Pages run for diagnostics commit: `34417908432`.
- It was still in progress at the last check in this verification slice; previous Pages deployments remained successful.

## Remaining known issues
1. Outer index cache references are still stale (`hd24-ui-v3.css?v=3`, `hd24-ui-v3.js?v=15`) because Apply approved UI cannot execute while Actions runner is unavailable.
2. The internal safe loader is v18 and the dependency fallback is present in current UI JS.
3. Browser diagnostics now provides a direct end-user evidence path to distinguish GitHub Pages serving, CDN blocking, fallback failure, mapping load failure, and safe readiness failure.
4. Do not declare browser E2E/regression PASS until Actions actually starts steps and completes them successfully.
