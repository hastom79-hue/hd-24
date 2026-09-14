# HD-24 live browser auto-run v24 fix

Date: 2026-09-14 KST

## User evidence
- User supplied a live HD-24 screenshot after selecting India source and master files.
- Both file names were visible and the reflect button was enabled, but the expected automatic processing did not start.

## Root cause found in code
- `hd24-auto-run.js?v=19` marked `lastAutoSignature` BEFORE invoking the async safe-reflect click path.
- A synchronous `try/catch` cannot catch failures/rejections occurring later inside the async click handler.
- Therefore a click that started but did not complete could permanently suppress every later retry for the same upload signature.
- Retry scheduling also stopped at 10 seconds, leaving a gap for slower workbook parsing/mapping readiness.

## Fix
Commit `b5a434219661db80a234ace88082e2f74519d526`
- Replaced pre-click completion marking with separate `runningSignature` and `completedSignature` states.
- Completion is accepted only when `window.hd24SafeReflectSuccessSignature` equals the current exact upload signature.
- Added a 1-second watchdog and retry horizon through 60 seconds.
- In-flight attempts are protected for 30 seconds to avoid duplicate downloads.
- Upload/plant changes reset only the current auto-run state; fail-closed safe-reflect prerequisites remain unchanged.

Commit `2003ae3df0ddc64cbbfb7af3084da921361c7324`
- Cache-busted `hd24-auto-run.js` from v19 to v24 in the production wrapper.

Commit `01582a8f26dfaf15d8e160ebe2e56701d23fc1c2`
- Updated `refresh-runtime.html` to force reload `hd24-auto-run.js?v=24` while retaining wrapper/safe/runtime and v23 downstream components.

## Safety invariants retained
- Auto-run still requires both files, enabled reflect button, `hd24SafeReflectReady === true`, and `data-safe-reflect-ready === 1`.
- No bypass of KPI mapping, unit checks, future-month contamination, history drift, formula protection, or post-write validation.
- Analysis/mail pipeline remains gated on same-signature safe-reflect success.

## Validation status
- Code write: PASS.
- Production wrapper v24 reference: PASS (`hd24-ui-v3.js` loads `hd24-auto-run.js?v=24`).
- Runtime refresh helper v24 reference: PASS.
- Latest release/log HEAD: `e36bddac5794f14a40128388c27c549efcbdd3aa`.
- GitHub Pages run `34805961817`: `completed / success`.
- Pages build job `103857801477`: all steps success.
- Pages deploy job `103857911048`: deploy step success.
- Pages report-build-status job `103857911033`: success.
- Therefore v24 production deployment is server-side verified PASS.
- User live-browser E2E after latest refresh remains the only unresolved runtime check.

## Failure history retained
- Previous auto-run v19 did not run in the user's live browser despite both files being selected and the button being enabled.
- Custom GitHub Actions reruns continued to terminate pre-step with `steps=null`; not counted as application assertion failures.
