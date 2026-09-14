# 2026-09-15 Coding Log — Reset Guard CI Integration

## Code / CI change
`.github/workflows/hd24-runtime-regression.yml` now runs `node tests/followup-reset-guard.test.js` after the existing follow-up v7 executable regression.

## Commit
- Runtime gate integration: `9679ed68f20e212b8bbbc1a3b8a915d7a23bcb61`
- Development log: `61d5d9a4b2e239cd4c0f571b74c46d0a2063f2dc`

## Guard coverage
The permanent runtime gate now includes the static reset/stale-cycle assertions in addition to:
- auto-run readiness regression;
- follow-up v7 exact-watch-set executable regression;
- production runtime invariant checks.

## Known infrastructure condition
GitHub custom workflow jobs have repeatedly ended before execution with `steps=null`. Such runs remain infrastructure/execution-layer failures unless steps actually start and an assertion fails.

## Remaining verification
Actual production-browser E2E using the real India/Brazil source workbooks and the current master remains outstanding because browser navigation is blocked in the current execution environment.
