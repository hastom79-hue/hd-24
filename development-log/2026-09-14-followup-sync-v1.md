# HD-24 follow-up synchronization fix

Date: 2026-09-14 KST

## Defect found
Production `hd24-followup.js` had a real race after safe-reflect success:
- `tryAutoPackage()` assigned `lastAutoPackageSignature` before KPI analysis finished.
- It clicked `btnJudge`, waited only 80 ms, then immediately evaluated `selectItems('watch')`.
- If analysis took longer than 80 ms, the empty result state was interpreted as `관리대상 KPI 없음`.
- Because the signature had already been recorded, later scheduled retries were suppressed for that file pair.

This could make the web appear to stop after safe-reflect even though the data and safe-reflect layer were valid.

## Corrective action
Created `hd24-followup-sync.js?v=1` as a narrow synchronization bridge. It does not bypass or weaken safe-reflect.

The bridge requires, for the same upload signature:
1. `window.hd24SafeReflectSuccessSignature === signature`.
2. Valid `selectedMonth` (1–12).
3. Non-empty `allResults` for the selected month.
4. Existing follow-up UI and enabled `btnMailWatch`.

Only after those conditions are true does it trigger the existing Preview path and existing reply-Excel download button. If the legacy follow-up flow already produced a Preview, the bridge detects it and does not create a duplicate package.

Synchronization triggers:
- `hd24-safe-reflect-complete`
- `hd24-action-export-complete`
- analysis `resultCard` mutation
- 1-second watchdog

No automatic email send was introduced. Preview-before-send remains unchanged.

## Production wiring
- `e9d1de15027c303dec749b5ee0710344b8608b44` — create `hd24-followup-sync.js`
- `4723fcb992087790a819bc650090de77b23c9284` — load `hd24-followup-sync.js?v=1` from production wrapper
- `8fb74415d87e03789d1a3712d4a7a74141955fd5` — force-preload follow-up sync from `refresh-runtime.html`

## Previous validation retained
- v27 auto-run readiness deadlock removal: PASS by independent Node harness.
- v27 Pages deployment run `34810912938`: build/report/deploy SUCCESS.
- India July source/master sampled history: no mismatch in validated set.
- Brazil July mapped sample: 27/27 match; no Aug–Dec future contamination in current v16 master.

## Remaining verification
Confirm Pages deployment for the new follow-up-sync HEAD, then continue through action workbook → reply workbook → mail Preview chain. Custom Actions `steps=null` failures remain classified as hosted-runner execution-layer failures rather than application assertion failures.
