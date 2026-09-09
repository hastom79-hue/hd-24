# HD-24 v17 forced runtime cache recovery — 2026-09-09

## Trigger
User reported that the deployed web application still did not run after restoring the previously browser-E2E-proven runtime files.

## Findings
- GitHub Pages deployment for commit `e285f2a0a54a91e3c6eda36deb74d049e1de1c83` completed successfully.
- `safe-kpi-mapping.js` was restored to the exact blob used by the known browser-E2E-successful runtime baseline.
- `index.html` was also restored to the E2E-proven entrypoint blob.
- Current `index.html` still references `hd24-ui-v3.js?v=15`.
- Current `hd24-ui-v3.js` had been referencing `safe-kpi-mapping.js?v=15`.
- Therefore a user browser could continue reusing a previously cached broken v15 runtime even after the server-side file contents were rolled back.

## Action
- Preserved the browser-E2E-proven `hd24-ui-v3.js` logic.
- Changed only the internal safe runtime loader query from `safe-kpi-mapping.js?v=15` to `safe-kpi-mapping.js?v=17`.
- Commit: `872feda3725ad734ab654d9d6b219ac0a9cce91e`.
- Re-fetched main and confirmed the loader now requests `./safe-kpi-mapping.js?v=17`.

## CI / Actions state
- India Browser E2E run for the v17 commit failed before executing workflow steps.
- Brazil Browser E2E and Runtime Regression also failed in the same GitHub Actions execution-layer condition.
- A direct job inspection still returns `steps=[]`, so these are not application-test failures.
- Pages deployment remains a separate deployment path and continues to operate.

## Remaining risk
- The outer HTML entrypoint still references `hd24-ui-v3.js?v=15`; a browser with that exact script cached may continue to reuse it until revalidation or hard refresh.
- The automatic `Apply approved HD-24 UI` workflow would normally align the outer version, but GitHub Actions execution is currently unavailable before steps.
- Do not claim the runtime chain final until the outer asset cache path has been refreshed and browser execution is verified again.
