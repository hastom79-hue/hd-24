# HD-24 follow-up single orchestrator v4

Date: 2026-09-14 KST

## Additional defect found after v3
Direct review of production `hd24-followup.js` found that the original legacy auto-package scheduler was still active even after `hd24-followup-sync.js?v=3` had been added.

The legacy path still executed:
`upload/change → tryAutoPackage() → btnJudge.click() → fixed 80 ms wait → selectItems('watch') → renderPreview() → buildReplyFile() → downloadFile()`.

Therefore v3 alone did not fully remove the old race. Even if the sync bridge correctly waited for `hd24-action-export-complete`, the legacy module could independently prepare/download a stale or duplicate follow-up package before the v3 chain completed.

This was treated as a real residual defect, not as completed work.

## Corrective action — single automatic orchestrator
The legacy follow-up module remains responsible for manual Preview/send/reply-import UI, but its automatic package scheduler now yields to the sync bridge whenever the bridge is loaded.

Changes:
- `adbd8a3d7d950602f75861ca55e3006de5f669bd` — `hd24-followup.js` adds an ownership guard at the beginning of legacy `tryAutoPackage()`.
- `82a9f16c39bb93b2a13f752227567635642be7b8` — `hd24-followup-sync.js` v4 immediately sets `window.hd24FollowupSyncOwnsAutoPackage=true`.
- `d6eb33ee5061a9f69191baa937d0befd90c049d0` — production wrapper loads `hd24-followup.js?v=24` and `hd24-followup-sync.js?v=4`.
- `53148d602b162dc6d8299add0db59e8b008a845b` — forced refresh helper preloads v24/v4.

The legacy scheduler now returns immediately when the v4 ownership flag is present. This preserves manual follow-up UI and provides fallback behavior if the sync bridge does not load, while preventing two automatic orchestrators from racing each other in normal production.

## Regression protection
- `5895e4aa53e85b63881ae3403a0ee15deca92384` — executable follow-up regression upgraded for v4.
- `f0e4cd3f8eb4c21a4a9f18b73fe438b0d74f0bc2` — runtime regression gate upgraded to require:
  - v4 ownership flag in sync bridge,
  - owner guard in legacy follow-up,
  - action-export signature gate,
  - reply download dedupe,
  - current-signature Preview tag,
  - loader versions `followup v24 / sync v4`,
  - syntax checks for both follow-up modules,
  - executable `tests/followup-sync.test.js`.

The executable state-machine regression also checks that v4 exposes the ownership flag immediately and retains the ordering/dedupe behavior proven in v3.

## Source verification
The current production blob for `hd24-followup.js` was re-read after the write and confirms the owner guard exists in the actual repository file:
`if(window.hd24FollowupSyncOwnsAutoPackage){ ... return }`.

This confirms the legacy 80 ms automatic path is suppressed when the v4 bridge owns orchestration.

## Deployment evidence
Pages run `34814186871` for HEAD `f0e4cd3f8eb4c21a4a9f18b73fe438b0d74f0bc2` completed `success`.

This run includes the production v24/v4 wiring and the updated runtime regression definition. Therefore the single-orchestrator production chain is deployed to GitHub Pages.

## Custom Actions state
Runtime Regression for the same HEAD:
- run `34814187313`
- job `103881317420`
- completed/failure with `steps=null`

The job did not begin executing workflow steps. It remains classified as GitHub runner/execution-layer failure, not a failed HD-24 assertion.

## Current chain after v4
Automatic follow-up orchestration is now structurally single-owner:
`safe-reflect → current analysis → _분석후속조치본.xlsx complete event → v4 sync → current-signature Preview → reply Excel once`.

The old independent `80 ms` auto-package path no longer competes with this chain in normal production.

## Remaining limitation
Full live production-browser E2E with the real India/Brazil/master workbook bytes is still not claimed because the current execution environment cannot drive the live Pages browser with those files and the custom GitHub runner is failing before steps start.

Actual authenticated email delivery is also not part of this PASS unless `HD24_MAIL_ENDPOINT` is configured. Preview, reply Excel, and mail-client fallback remain distinct from confirmed server-side send.
