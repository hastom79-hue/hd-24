# HD-24 follow-up synchronization fix

Date: 2026-09-14 KST

## v1 defect found
Production `hd24-followup.js` had a real race after safe-reflect success:
- `tryAutoPackage()` assigned `lastAutoPackageSignature` before KPI analysis finished.
- It clicked `btnJudge`, waited only 80 ms, then immediately evaluated `selectItems('watch')`.
- If analysis took longer than 80 ms, the empty result state was interpreted as `관리대상 KPI 없음`.
- Because the signature had already been recorded, later scheduled retries were suppressed for that file pair.

This could make the web appear to stop after safe-reflect even though the data and safe-reflect layer were valid.

## v1 corrective action
Created `hd24-followup-sync.js?v=1` as a narrow synchronization bridge. It did not bypass or weaken safe-reflect.

The v1 bridge required, for the same upload signature:
1. `window.hd24SafeReflectSuccessSignature === signature`.
2. Valid `selectedMonth` (1–12).
3. Non-empty `allResults` for the selected month.
4. Existing follow-up UI and enabled `btnMailWatch`.

Synchronization triggers were safe-reflect complete, action-export complete, analysis resultCard mutation, and a 1-second watchdog. No automatic email send was introduced. Preview-before-send remained unchanged.

v1 production wiring:
- `e9d1de15027c303dec749b5ee0710344b8608b44` — create `hd24-followup-sync.js`
- `4723fcb992087790a819bc650090de77b23c9284` — load `hd24-followup-sync.js?v=1`
- `8fb74415d87e03789d1a3712d4a7a74141955fd5` — preload v1 from `refresh-runtime.html`

## v2 retained risk discovered during chain review
Further review of the production bridge showed that the follow-up package could still be produced too early or duplicated:
- safe-reflect success plus non-empty current-month `allResults` did not prove that the `_분석후속조치본.xlsx` for the current signature had actually finished.
- an already visible but untagged Preview could be accepted as if it belonged to the current upload pair.
- repeated `hd24-safe-reflect-complete` events could reset per-signature completed/download state, allowing duplicate package or reply-Excel generation.
- reply workbook download had no explicit once-per-upload-signature guard in the synchronization bridge.

Therefore v2 was not treated as final chain completion.

## v3 corrective action — strict current-signature chain
`hd24-followup-sync.js` was hardened to v3. Commit:
- `080d9692f28b6121ebe212c3fb9dc127d6aabc4b` — `fix: gate follow-up package on action export and dedupe v3`

v3 requires all of the following before Preview/reply generation:
1. current upload signature exists.
2. `window.hd24SafeReflectSuccessSignature === current signature`.
3. `hd24-action-export-complete` was received with `detail.signature === current signature`.
4. selected month is valid and current-month analysis results are non-empty.

Additional v3 safeguards:
- `actionExportSignature` prevents follow-up from running before the analyzed action workbook finishes.
- Preview is valid only when `data-hd24-signature` exactly matches the current upload signature.
- an untagged legacy Preview is explicitly hidden rather than trusted.
- `replyDownloadedSignature` allows the reply workbook download only once for the current upload signature.
- repeated safe-reflect-complete events for the same signature do not reset completion/download state.
- a new upload/plant signature performs a hard reset and starts a new chain.

Target sequence is now explicitly enforced in code:
`source/master upload → safe-reflect success → current KPI analysis → _분석후속조치본.xlsx completion event → current-signature mail Preview → reply Excel 1x`

Production cache wiring:
- `6a5c88fc4543de25ded885240b40a10bfd473186` — production wrapper loads `hd24-followup-sync.js?v=3`
- `a2666f95d933eb09c62cce6b37649b5b016058a1` — refresh helper preloads `hd24-followup-sync.js?v=3`

## Regression protection added
- `060f18152cb06b9a465d972ec52ae9bbd6b581cc` — create `tests/followup-sync.test.js`

The new regression asserts:
- safe-reflect + action-export + current analysis are all mandatory.
- action-export event signature must match the current upload signature.
- reply Excel has a per-signature dedupe guard.
- duplicate same-signature safe-complete cannot reset completed/download state.
- Preview must carry the current signature.
- untagged legacy Preview is not trusted.
- production loader and refresh helper are both pinned to follow-up sync v3.

Runtime gate was also aligned:
- `c07bc03f534ada0929265f6e4546cc3dfe740573` — add v27 auto-run / v3 follow-up invariants and execute `node tests/followup-sync.test.js`.
- `39b86f2ae983cb1b0575605bc2fe4d8c92e1cde0` — correct the regression workflow to inspect the actual dependency/safe loader `hd24-ui-v3-core.js` instead of the thin wrapper `hd24-ui-v3.js` for dependency and safe-runtime assertions.

The latter was a test-infrastructure defect found during review; it was corrected rather than hidden.

## Execution/deployment evidence
- Pages run `34813275926` for `c07bc03f...` completed SUCCESS. This confirms the v3 production runtime/cache wiring was deployed.
- Latest HEAD Pages run `34813339866` for `39b86f2...` was still queued at the latest check; do not claim latest-HEAD Pages completion until it finishes.
- Latest Runtime Regression run `34813340598`, job `103878853753`, ended with `steps=null`. The workflow code never executed, so this remains classified as GitHub runner/execution-layer failure rather than an application assertion failure.

## Previous real-file validation retained
- v27 auto-run readiness behavior was independently exercised previously.
- India July source/master mapped history: no mismatch in the validated set.
- Brazil July mapped subset: 27/27 match.
- current v16 master has no Aug–Dec future contamination for India/Brazil.
- Brazil historical drift rows are warning/preserve behavior; June prior-month anchors match and those older differences are not the blocker.

## Remaining verification / explicit limitation
The current environment still cannot claim a live production-browser real-file E2E of the entire chain because direct live Pages browser execution with the real uploaded workbook bytes is blocked by the environment/network path, while the repo's custom Actions runner is failing before steps start.

Accordingly, v3 is considered code-hardened and Pages-deployed at the production-runtime level, but full E2E completion is not declared yet. Actual authenticated email send is also not claimed: static Pages requires a configured `HD24_MAIL_ENDPOINT`; otherwise the product remains Preview + mail-client fallback.
