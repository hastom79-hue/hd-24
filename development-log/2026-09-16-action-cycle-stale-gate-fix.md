# Development log — action cycle stale gate fix

- Latest main before fix: `b1bceae11a2d599f796ba0754ce4ef5ceaedeacd`.
- Diagnosed `HD24 Action Cycle Regression` run `35035654270` as a real assertion failure with populated runner steps, not a `steps=null` execution-layer failure.
- Failure: `tests/kpi-action-export.test.js` required classifier/workbook/action-export loaders that are no longer part of the current production loader.
- Production loader currently uses `hd24-followup.js?v=29`, `hd24-direct-reply-guard.js?v=1`, and `hd24-reply-import-dedupe.js?v=1` for the follow-up/reply path.
- Replaced the stale action-export regression command with executable checks for the current production follow-up/reply cycle: direct stale-download guard, reply import dedupe, exact-once, and in-flight dedupe.
- No production runtime code or cache version was changed because the defect was in the CI gate, not the deployed runtime.
