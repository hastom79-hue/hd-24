# 2026-09-15 Coding Log — Follow-up Reset Guard

## Change
Added `tests/followup-reset-guard.test.js`.

## Assertions locked
- stale async reply validation must reject when current upload signature differs;
- hard reset clears completed/running/action-export/reply-request/reply-download state and reply file captures;
- hard reset clears stale Preview before rescheduling;
- cross-signature `hd24-action-export-complete` events are ignored;
- same-signature safe-reflect + action-export snapshot + ready analysis are mandatory;
- current month must equal frozen snapshot month;
- duplicate completed/running signature execution remains blocked.

## Commit
- test: `9fb7b4f55d696a24b5a7e84d0e0d644a6309568d`
- development log: `77f5c314daf917b355a5e7563977bc2240ff5e93`

## Validation context
The test is intentionally a permanent static invariant guard because GitHub custom Actions currently terminate before steps start (`steps=null`). Existing executable follow-up v7 and watchdog tests remain in the repository. The latest previously observed Pages deployment for HEAD `c0b8b0309043dbf75dd9811fe15789e580468b4c` was successful (`34836582451`).

## Residual
Live production browser E2E with real India/Brazil files remains unobserved in this environment.
