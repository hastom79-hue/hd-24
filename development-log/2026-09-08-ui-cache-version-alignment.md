# 2026-09-08 UI Cache Version Alignment Closure

## Finding
The production safe runtime and JS loader were already v15, but `index.html` still referenced the approved UI CSS as `hd24-ui-v3.css?v=3`. This did not change KPI reflection logic, but could keep a stale visual asset in browser/proxy cache.

## Hardening
Updated permanent workflow `.github/workflows/apply-approved-ui.yml` so it now:
- derives the active runtime version from `safe-kpi-mapping.js?v=N` in `hd24-ui-v3.js`;
- inserts missing CSS/JS references with that active version;
- also normalizes existing `hd24-ui-v3.css?v=*` and `hd24-ui-v3.js?v=*` references to the active version;
- asserts the resulting index contains both CSS and JS at the active version;
- retains stale-v3 reinjection assertions.

Workflow hardening commit:
- `fbb2b7a4d2115f3720168761a68a7b525610014e`

Permanent UI recovery/alignment run:
- run `34182780782`
- job `101925053376`
- Inject and align approved UI assets: SUCCESS
- stale-cache reinjection/alignment gate: SUCCESS
- commit approved UI references: SUCCESS

Resulting automated index commit:
- `5cfbb0d7ecfe6e0c83e34d798583244d650aae40`
- message: `feat: apply approved UI references`

## Final asset references
Verified on current main after the automated alignment commit:
- CSS: `hd24-ui-v3.css?v=15`
- JS: `hd24-ui-v3.js?v=15`
- safe loader remains `safe-kpi-mapping.js?v=15`

## Cross-gates
Runtime regression on the workflow-hardening commit:
- run `34182780758`
- job `101925053280`
- conclusion: SUCCESS

GitHub Pages deployment for the resulting aligned-index commit:
- run `34182788423`
- run number 127
- conclusion: SUCCESS

Note: GitHub Actions commits made with the repository GITHUB_TOKEN do not recursively trigger all push workflows; therefore the resulting bot index commit produced Pages deployment but not another redundant Runtime Regression run. The workflow-hardening commit itself passed the Runtime Regression gate before producing the deterministic CSS/JS-only alignment commit.

## Status
- stale CSS cache version risk: CLOSED
- stale JS cache version risk: CLOSED
- CSS / JS / safe runtime version chain: v15 aligned
