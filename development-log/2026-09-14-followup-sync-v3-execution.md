# HD-24 follow-up sync v3 — executable verification

Date: 2026-09-14 KST

## Scope
Verify that the follow-up package cannot run before the current upload pair has completed safe-reflect + analysis action export, and that mail Preview / reply Excel are generated only once for the same signature.

## Production code under verification
- `hd24-followup-sync.js?v=3`
- production wrapper commit: `6a5c88fc4543de25ded885240b40a10bfd473186`
- refresh helper commit: `a2666f95d933eb09c62cce6b37649b5b016058a1`
- executable regression upgrade: `ca86b6779a7db2294b31accf1209fb404695afdf`

## Executable Node state-machine test
`tests/followup-sync.test.js` was upgraded from static string assertions to a `node:vm` fake-DOM execution of the actual `hd24-followup-sync.js` state machine.

Test sequence:
1. same-signature safe-reflect success + current-month `allResults` are present, but action export is not complete.
   - expected: no mail Preview package
   - expected: no reply workbook download
2. dispatch `hd24-action-export-complete` with a wrong signature.
   - expected: ignored
3. dispatch `hd24-action-export-complete` with the exact current upload signature.
   - expected: Preview package exactly once
   - expected: reply workbook exactly once
   - expected: Preview tagged with the exact current upload signature
4. dispatch duplicate current-signature action-export-complete and duplicate safe-reflect-complete events.
   - expected: Preview package count remains 1
   - expected: reply workbook count remains 1

Independent execution in the working container:
- `node --check hd24-followup-sync.js` — PASS
- `node tests/followup-sync.test.js` — PASS
- output: `PASS follow-up v3 executable chain: action-export gate -> current Preview -> reply Excel exactly once`

This is stronger than the prior static-only regression because the v3 event/signature/dedupe state machine is actually executed.

## Pages deployment evidence
- Pages run `34813339866` for workflow-correction HEAD `39b86f2ae983cb1b0575605bc2fe4d8c92e1cde0` completed `success`.
- Earlier Pages run `34813275926` had already completed `success` with the v3 production runtime/cache wiring.

Therefore the production v3 runtime wiring is deployed, and the corrected runtime-workflow definition is also on a successful Pages build.

## GitHub custom runner evidence
Latest Runtime Regression after executable test commit:
- run `34813790481`
- job `103880166166`
- status: completed/failure
- `steps=null`

No workflow step executed, so this is retained as a GitHub execution-layer/runner failure and is not classified as a failed application assertion. The same regression was executed independently in the working container and passed as recorded above.

## Current verified chain boundary
Code-level + executable state-machine verification now supports:
`safe-reflect success → current analysis action export complete → current-signature Preview → reply Excel exactly once`

Not yet claimed as full production-browser real-file E2E:
`real India/Brazil source upload + real master upload → browser safe-reflect → verified reflected workbook → analysis workbook → Preview/reply chain`.

The environment still cannot directly exercise that complete real-file flow against the live Pages browser, so the project remains explicitly short of a full live-browser E2E PASS.

Actual authenticated email sending is also outside this PASS unless `HD24_MAIL_ENDPOINT` is configured; mail Preview / mail-client fallback remains the current static-Pages behavior.
