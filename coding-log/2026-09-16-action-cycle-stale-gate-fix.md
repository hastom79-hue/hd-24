# Coding log — action cycle stale gate fix

- Root cause: `.github/workflows/hd24-action-cycle-regression.yml` still executed `tests/kpi-action-export.test.js`, which asserted obsolete classifier/workbook/action-export/followup-sync loader versions after the production pipeline had moved to direct follow-up/reply generation.
- The failed run had normal runner steps and failed at `Validate cycle-safe action export`; it was not classified as an execution-layer `steps=null` failure.
- Updated the workflow to syntax-check the current production follow-up modules and execute `direct-reply-guard`, `reply-import-dedupe`, `followup-exact-once`, and `followup-inflight-dedupe` regression tests.
- No production loader/refresh change and no version bump: current production references were already correct.
- Development log: `development-log/2026-09-16-action-cycle-stale-gate-fix.md`.
