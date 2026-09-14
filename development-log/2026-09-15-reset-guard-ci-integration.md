# 2026-09-15 Follow-up Reset Guard CI Integration

## Scope
Continue the HD-24 follow-up verification by making the newly added reset/stale-state guard part of the permanent Runtime Regression Gate.

## Change
Updated `.github/workflows/hd24-runtime-regression.yml` so the existing runtime invariant job also executes:

`node tests/followup-reset-guard.test.js`

Commit: `9679ed68f20e212b8bbbc1a3b8a915d7a23bcb61`.

## Why
The reset guard test existed in the repository but was not yet part of the primary runtime gate. Integrating it prevents a future change from silently removing:
- stale async reply validation rejection after an upload change;
- hard-reset clearing of completion/request/download state;
- stale Preview clearing;
- cross-signature action-export event rejection;
- same-signature safe-reflect/action-export/snapshot/month requirements;
- duplicate execution suppression.

## Pre-change verification
Latest prior HEAD `928b85a9db342fda7817ca9ec245a6021d1cbb8e` Pages run `34887933426` completed successfully. Its Runtime Regression run `34887933460` completed with job `steps=null`, so the failure is classified as the existing GitHub runner/execution-layer failure rather than an application assertion failure.

## Validation status
A new Runtime Regression run is expected from commit `9679ed68...`. Because the repository's custom GitHub jobs have repeatedly terminated before steps start, a failed run must not be classified as an application regression unless job steps actually execute and an assertion fails.

## Completion status
No full browser E2E claim. Production browser E2E with real India/Brazil source files and the current master remains unresolved in this environment.
