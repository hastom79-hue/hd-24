# HD-24 Development Log

## 2026-09-28 — Outlook default sender and 100% paged KPI capture
- Mail fallback no longer specifies a sender/account/server; the `mailto:` draft is delegated to the Windows/Outlook default mail client/account.
- Preserved To, CC, subject, body, reply Excel download, and KPI screenshot download behavior.
- KPI screenshots now use `scale=1` and split long result columns into 900px vertical pages instead of shrinking the whole result into one unreadable image.
- Page files use `_P01`, `_P02`, ... suffixes when multiple pages exist; month/type remain in each filename to prevent collisions.
- Empty/transparent PNG guards remain active.
- Production loader and refresh runtime aligned at `hd24-followup.js?v=57`.
- Regression coverage added in `tests/followup-mailto.test.js` and wired into HD24 Action Cycle Regression.
- GitHub status/workflow results for the latest HEAD were not yet exposed by the connector at validation time; deployment PASS was therefore not assumed.

## 2026-09-28 — Outlook automatic attachment draft package
- Replaced the manual-download + mailto fallback with one RFC 822 `.eml` package for Outlook when no mail API endpoint is configured.
- The package contains To, CC, UTF-8 subject/body, reply Excel, and every paginated KPI PNG attachment.
- Added `X-Unsent: 1` so Outlook can treat the opened message as an unsent draft where supported.
- No sender/account/server is embedded; Outlook continues to choose the local default sending account.
- Production follow-up runtime advanced to v58. Action Cycle Regression and Runtime Regression Gate passed on HEAD `55396e9e...`; Pages deployment was still in progress at the time of this log entry.


## 2026-09-28 — Outlook fallback hardening, refresh-state protection, and browser E2E alignment
- Hardened the mail button async boundary so package-generation failures surface in the UI and duplicate clicks are blocked.
- Added staged validation/status for reply Excel, KPI PNG captures, Outlook EML construction, and browser download request.
- Hardened EML download by validating non-empty files and using a DOM-attached hidden download anchor with cleanup.
- Production follow-up runtime advanced through v60/v61; loader and refresh runtime were kept aligned.
- Refresh tab handling restores the last valid HD-24 tab from session storage instead of unconditionally forcing upload.
- India and Brazil browser E2E now explicitly return to the upload tab before manual safe-reflect clicks.
- India Browser E2E and Brazil Browser E2E passed after alignment; Runtime Regression, Action Cycle Regression, approved UI application, and latest Pages deployment also passed.
- Corrected stale mail guidance/history wording: API-free fallback is recorded as Outlook .eml package download; legacy mail-client-open history remains distinguishable.
- Strict local Classic Outlook auto-open/send-button E2E remains outside the browser-only GitHub Pages boundary and is not marked complete.


## 2026-09-28 — Follow-up / Reply cycle release-lock candidate
- Followup runtime v70 production gates: Runtime, Action Cycle, approved UI, GitHub Pages PASS.
- Multi-month reply workbook: all worksheets imported; future/invalid month blocked.
- Import is atomic via pending staging; no partial save on later-sheet failure.
- Persistent + in-file duplicate replies are blocked without blocking changed legitimate second replies.
- KPI×target-month workbook rows are deduplicated; Unit/Target/Actual preserved.
- Stale reply workbook generation fails closed when plant/analysis month/KPI values/reply history changes during async generation.
- Reply sequence, recurrence/Repeated Issue, previous cause/countermeasure and per-row mail anchor are regression-locked.
- Browser-only GitHub Pages still does not prove strict local Classic Outlook auto-open/Send-button E2E; that remains a separate local integration frontier.


## 2026-10-04 — DIO / reply-feedback / runtime stabilization
- Standardized DIO across Ulsan, India and Brazil as a derived monthly KPI: `365 / Parts Inventory Turnover`; the target is derived from the same month's turnover target and evaluated as Lower-is-better.
- Zero, blank or invalid turnover values are not estimated. Brazil's derived DIO uses synthetic id `-24001` to avoid collision with physical master rows.
- Confirmed DIO propagation through result rendering, `allResults`, analytical/action selection and mail scope.
- Removed unsolicited reply-feedback workbook browser downloads while retaining the workbook in memory for mail attachment.
- Restricted reply-feedback mail JSON to serializable attachment metadata/base64; the browser `File` object is no longer posted.
- Hardened guarded manual reply download against duplicate click propagation.
- Removed duplicate workbook parsing and eager master-ZIP loading; reflect ZIP loading is now lazy.
- Synchronized forced-refresh runtime with production: UI v43, followup v87 and reply-feedback v13, alongside the other active runtime versions.
- Added reply-feedback to runtime cache synchronization regression coverage.
- Pages deployments through `86eac67e` verified SUCCESS.
- Current non-Pages Actions failures occur before any runner step executes (`steps: []`, runner id 0); application assertions are therefore not being executed and these failures are tracked separately as CI infrastructure/runner failures.

## 2026-10-04 Final stabilization pass
- D+7 reminders are manual-send only; due detection remains automatic. Added click inflight lock, 30s API timeout, network/HTTP/logical failure diagnostics, and success/failure history UI. Runtime deployed as seven-day-reminder v7.
- Removed unsolicited reply-feedback downloads and locked zero-unsolicited-download regression contract. Refresh/automatic analysis/import do not initiate file downloads; reply Excel and no-endpoint EML remain explicit user actions.
- Reduced follow-up automatic-analysis retry schedule from 8 attempts to 4 and removed redundant 3-second history polling to reduce refresh/runtime load. Followup deployed as v88.
- DIO contract verified in source: DIO=365/Parts Inventory Turnover; invalid/zero turnover produces no DIO; direction is lower-is-better; Ulsan uses physical row 102, India row 93, Brazil isolated synthetic row -24001; derived results flow through allResults into analysis/mail/reply workbook.
- Pages deployments have been succeeding; separate regression workflows remain an infrastructure issue when jobs terminate with no runner steps.

### 2026-10-04 closure verification
- Production history-view v29 deployed and Pages deployment succeeded; redundant 3-second history polling is no longer served by the current loader.
- Followup v88 reduces automatic analysis retry windows to 4 attempts and keeps D+7 wording consistent with manual-send-only policy.
- Reply feedback v15 keeps generated feedback Excel in memory for attachment use, never auto-downloads it, and persists API send failures as send-failed history.
- Current UI guidance now states that automatic processing performs validation/reflection/judgment only; browser file downloads require an explicit user action.
- Added DIO edge regression contract: valid formula, invalid/zero rejection, lower-is-better boundary behavior, and Ulsan/India/Brazil routing are locked.
- Closed-loop source verification: KPI/DIO result -> management mail -> reply workbook -> reply import event -> recurrence analysis -> feedback workbook -> explicit feedback mail send. No automatic file download exists in this loop.

## 2026-10-05 — Mail Preview handoff + DIO alias regression lock
- Wired legacy mail fallback to the managed follow-up Preview via `window.hd24PrepareFollowupPreview`; prepared history, mail-tab switch, and Preview focus are now explicit.
- Added golden regression coverage for DIO aliases: `DIO`, `DIO (Days Inventory Outstanding)`, `Days Inventory Outstanding`, and Korean `재고회전일수` must all resolve to LOWER-is-better.
- Added Korean DIO alias to the rule-matrix direction master so Ulsan/Korean labels follow the same DIO judgment logic as India/Brazil.
- Commits: a8e5eee, f5f9773, 49a2c3d.


## 2026-10-05 — D+7, mail transport, refresh, reply-history and feedback hardening
- Scoped D+7 reminder identity to the normalized KPI/month batch so distinct batches do not collapse into one reminder identity.
- Hardened reply-feedback and D+7 mail transport to avoid unnecessary browser preflight while retaining explicit API success/failure handling and timeout control.
- Rebuilt feedback attachment state after reload and invalidated stale attachments before regeneration.
- Added Ulsan reply import support and bilingual KPI matching across import, history, feedback analysis, and feedback export.
- Improved repeated root-cause/action detection using normalized phrase similarity rather than exact-string-only comparison.
- Corrected multi-reply comparison to use the actual prior reply sequence instead of an array-position assumption.
- Commits: a6b1a61, d3fa5a4, f838578, 79d79d6, 5f249bb, 9e9e359, 817e84c, 2ef39fc, 34f9db1, b6b1c28, fb015b9, f048179.
