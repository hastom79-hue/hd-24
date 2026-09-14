# HD-24 coding log — action-export watchdog regression hardening

Date: 2026-09-14

## Changed files
### `tests/action-export-watchdog.test.js`
Commit: `ec0d5849f4aaf13104254123e2809fa9bf05f4b6`

Added executable assertions for:
- safe-reflect signature mismatch → no watchdog arm;
- reset → completed latch cleared for the new cycle;
- source-file change → every pending watchdog timer cancelled.

Retained existing assertions for:
- five bounded timers;
- same-signature wake;
- action-export completion stops remaining timers.

## New permanent CI file
### `.github/workflows/hd24-action-export-watchdog-regression.yml`
Commit: `bd055e0daf50b1aab4d6473145c6d95465bbea80`

Checks:
- `node --check hd24-action-export-watchdog.js`
- production loader uses `hd24-action-export-watchdog.js?v=1`
- refresh helper preloads the same v1 runtime
- `WAKE_DELAYS=[0,2500,7000,15000,30000]`
- `window.hd24SafeReflectSuccessSignature===sig`
- `hd24-action-export-complete` stop hook
- `node tests/action-export-watchdog.test.js`

## Execution log
Local Node VM extended regression, attempt 1:
- FAILED due to an invalid test assumption: the harness attempted to re-arm an already completed identical signature without reset.
- This confirmed the production `completedSignature` latch was working as designed.

Local Node VM extended regression, corrected attempt:
- PASS
- output: `PASS action-export watchdog extended: bounded + same-signature + completion stop + mismatch block + reset cancel`

Dedicated GitHub workflow run:
- run: `34836476722`
- job: `watchdog-regression`
- status: completed/failure
- steps: null
- logs: unavailable
- classification: runner/execution layer failed before workflow steps; not an assertion/application failure.

## Runtime behavior change
None. Production watchdog code was not weakened or broadened. This change increases verification coverage only.

## Remaining unverified boundary
Real browser with the actual uploaded files must still prove the complete chain through Mail Preview. Do not mark the HD-24 task 100% complete before that observation.
