# HD-24 Coding Log

## 2026-09-28
### Mail client fallback
- `hd24-followup.js`: construct `mailtoUrl` without `from`, `sender`, Gmail address, or IMAP server; open with `window.location.assign(mailtoUrl)`.
- Purpose: prevent HD-24 from selecting the stale Gmail/Naver IMAP configuration and let Outlook choose its configured default sender.

### KPI screenshot pagination
- `hd24-followup.js`: `viewportH=900`, `scale=1`, `pageCount=Math.ceil(fullH/viewportH)`.
- Capture each vertical page using its page Y offset and remaining last-page height.
- Filename: `HDPS_KPI_<Plant>_<MM>M_<Missed|Achieved>_Pnn.png` when paginated.
- Retained canvas/alpha/PNG-size validity checks.

### Runtime / QA
- `hd24-ui-v3.js`: follow-up runtime v57.
- `refresh-runtime.html`: follow-up runtime v57.
- `tests/followup-mailto.test.js`: validates default-sender delegation, no forced account/server, 100% pagination, offsets, suffixes, metadata, and empty-PNG guard.
- `.github/workflows/hd24-action-cycle-regression.yml`: runs follow-up regression.


## 2026-09-28 — v60/v61 and refresh/E2E follow-up
### Outlook package diagnostics
- hd24-followup.js: guarded async send-preview invocation, duplicate-click suppression, staged 2/6–5/6 diagnostics, Excel/PNG/EML validity guards, and explicit top-level error reporting.
- downloadFile(): require non-empty file, append a hidden anchor to document.body, click/remove in finally, and revoke the object URL after the download request.
- hd24-followup.js: API-free guidance now describes the actual Outlook .eml package workflow rather than claiming the default mail app opens directly.
- hd24-history-view.js: new package events render as Outlook 패키지 다운로드; legacy 메일앱 열림 remains for historical records.

### Refresh / browser E2E
- index.html: persist/restore valid active tab using sessionStorage key hd24_active_tab; invalid/missing state falls back to upload.
- hd24-browser-e2e.yml: explicitly activate upload before safe-reflect clicks.
- hd24-browser-e2e-brazil.yml: same visible-tab alignment for Brazil negative/positive reflect scenarios.
- Validated sequence: India Browser E2E PASS, Brazil Browser E2E PASS, Runtime Regression PASS, Action Cycle Regression PASS, approved UI PASS, latest Pages deployment PASS.


## 2026-09-28 — Followup v70 integrity hardening
- Added KPI×month dedupe before reply workbook generation.
- Added stale workbook snapshot/recheck fail-closed guard.
- Changed multi-sheet reply import from first-sheet-only to all worksheets.
- Staged imports in pending[] and commit only after every worksheet validates.
- Added prev + pending duplicate detection and sequence calculation.
- Updated followup regression assertions for atomic staging and legitimate changed second replies.
- Production loader/refresh now reference hd24-followup.js?v=70.


## 2026-10-04 — DIO, mail attachment, download and runtime hardening
### DIO derivation
- `index.html`: derive DIO as `365 / Parts Inventory Turnover` for Ulsan, India and Brazil.
- Derive the monthly DIO target from the same month's inventory-turnover target; direction is `하향` (Lower is better).
- Invalid/blank/zero turnover is not estimated; the derived month is omitted.
- Ulsan/India reuse physical DIO rows when present; Brazil uses synthetic row id `-24001` to avoid physical-master collision.
- Verified propagation path: derived DIO -> results -> `renderResults()` -> `allResults` -> analysis/action selection -> mail scope.

### Reply feedback / download safety
- `hd24-reply-feedback.js`: feedback workbook is generated and retained in memory without automatic browser download.
- Mail JSON attachment now sends only serializable filename/MIME/base64/plant/timestamp fields; browser `File` object remains local.
- `hd24-direct-reply-guard.js`: guarded manual reply download fully isolates the click path to prevent duplicate downloads.
- `hd24-followup.js`: mail endpoint has 30-second abort, HTTP/logical/network failure diagnostics and send-button trace logging.

### Refresh / cache / performance
- Removed duplicate workbook parsing and eager master ZIP load; master ZIP is lazy-loaded only when reflect is executed.
- Production and forced-refresh runtime references synchronized: UI loader v43, auto-run v29, pipeline v23, followup v87, direct-reply v12, import-dedupe v1, history v28, reply-feedback v13.
- Runtime regression now includes reply-feedback cache-version synchronization.
- Latest verified Pages deployment through `86eac67e`: SUCCESS.
- Current GitHub Actions regression jobs terminate before runner steps (`steps: []`, `runner_id: 0`); treat this as CI runner/infrastructure failure rather than an application assertion failure.

## 2026-10-04 Final stabilization pass
- D+7 reminders are manual-send only; due detection remains automatic. Added click inflight lock, 30s API timeout, network/HTTP/logical failure diagnostics, and success/failure history UI. Runtime deployed as seven-day-reminder v7.
- Removed unsolicited reply-feedback downloads and locked zero-unsolicited-download regression contract. Refresh/automatic analysis/import do not initiate file downloads; reply Excel and no-endpoint EML remain explicit user actions.
- Reduced follow-up automatic-analysis retry schedule from 8 attempts to 4 and removed redundant 3-second history polling to reduce refresh/runtime load. Followup deployed as v88.
- DIO contract verified in source: DIO=365/Parts Inventory Turnover; invalid/zero turnover produces no DIO; direction is lower-is-better; Ulsan uses physical row 102, India row 93, Brazil isolated synthetic row -24001; derived results flow through allResults into analysis/mail/reply workbook.
- Pages deployments have been succeeding; separate regression workflows remain an infrastructure issue when jobs terminate with no runner steps.

### 2026-10-04 final production closure
- Current production/refresh runtime alignment: core v22, auto-run v29, pipeline gate v23, followup v88, D+7 v7, direct-reply guard v12, reply-import dedupe v1, history v29, reply-feedback v16.
- Latest regression-contract commit 9d27be99 was deployed successfully by GitHub Pages.
- Reply-feedback v16 now rejects HTTP 200 logical failures ({success:false}), persists failedAt/error details, and keeps 30-second timeout/no-auto-download guarantees.
- DIO edge/routing regression and zero-unsolicited-download contracts are committed.
- GitHub regression/UI workflows continue to terminate before execution (runner_id 0, blank runner, steps 0); this is tracked separately from application/Pages deployment status.

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


## 2026-10-05 — Three-plant mail closed-loop + production loader hardening
- Aligned initial KPI mail API transport with the hardened text/plain JSON-body flow used by feedback and D+7 sends.
- Extended D+7 reminder eligibility and bilingual subject labeling to Ulsan alongside India and Brazil; reply detection now matches either KPI language label.
- Preserved Month / Watch / All mode through managed Preview fallback and subsequent preview refresh.
- Locked feedback CC to the managed mail policy, synchronized enforced CC into the visible mail field, and exposed actual To/CC routing in send history.
- Added closed-loop regression locks for three-plant D+7, bilingual reply matching, Preview mode preservation, transport, CC policy, prior-reply sequence, and stale attachment invalidation.
- Bumped production/refresh loaders to follow-up v89, reply-feedback v17, and D+7 reminder v8 to prevent stale browser cache execution.
- Repository main HEAD contains the changes; GitHub Actions/Pages runtime PASS was not assumed because a corresponding run/runtime result was not exposed during validation.
- Commits: d6f5979, 40f049a, 4c795ff, 8431078, c018cfa, db52aef, 961498c, dbbb551, 3cc66c3, 98c9d93, 5c067ee.


## 2026-10-05 — Refresh stability + CI final hardening
- Added idempotent initialization guards across Auto-run, Pipeline Gate, Follow-up, D+7 Reminder, Direct Reply Guard, History View, and Reply Feedback to prevent duplicate listeners/observers/watchdogs during repeated initialization.
- Expanded the action-cycle workflow syntax checks to all three mail runtimes and broadened the closed-loop regression suite; added manual workflow_dispatch entry.
- Refreshed production/cache loader versions: auto-run v30, pipeline-gate v24, follow-up v90, D+7 v9, direct-reply-guard v13, history-view v30, reply-feedback v18; synchronized refresh-runtime.
- Added initialization-idempotency regression locks, fixed missing runtime-source declarations in the test itself, and removed stale D+7/Feedback cache-version assertions and diagnostics.
- Commits: b66b7c5, cec6be3, 2242d52, 4f4e5f8, f68358c, ac69a7a, 4d258bf, 7ee2f5a, 39af55d, 2430e1e, a82c05c, 3c7a774, ecd21fc, 0ac44dd, 9ea766e, 4d07a95.


## 2026-10-05 — Reply feedback late-load recovery + v19 regression lock
- Fixed reply-feedback initialization so dynamically loaded runtime initializes both before and after DOMContentLoaded while retaining the single-wire guard.
- Bumped reply-feedback production and refresh runtime references from v18 to v19 to prevent stale browser cache execution.
- Updated closed-loop regression contracts to v19 and added an explicit late-load initialization assertion.
- Revalidated D+7 eligibility: sent-only source, 7-day threshold, three-plant coverage, full-batch reply exclusion, successful-reminder dedupe, and localStorage send lock.
- Revalidated feedback attachment invalidation and success/failure mail-history semantics; initial mail required-CC enforcement remains active for Ulsan/India/Brazil.
- GitHub Pages deployment for d29614c completed successfully. General GitHub-hosted Actions workflows still terminate before runner steps and are tracked separately from application deployment.
- Commits: 30f45f8, d804640, b12b0e3, d29614c.


## 2026-10-05 — Reply import dedupe v2 + closed-loop guard
- Added __HD24_REPLY_IMPORT_DEDUPE_WIRED__ so duplicate runtime injection cannot register duplicate document listeners.
- Bumped production and refresh runtime references to hd24-reply-import-dedupe.js?v=2.
- Aligned regression contracts to v2 and corrected the new assertion to use the existing assert/code variables.
- Added the dedupe single-wire contract to the integrated followup-mailto closed-loop regression.
- Verified Pages deployment success through aea1f0f; GitHub-hosted non-Pages workflows continue failing before runner steps and remain an execution-layer issue, not a proven application regression.
- Commits: 7265b34, 2e699b5, 600aa95, 93d8bff, fde05a3, aea1f0f, ab22fb5.


## 2026-10-05 — History send semantics + bilingual reply continuity closure
- History v31-v37: confirmed-send-only mail sequence/count, non-send sequence display, latest confirmed send retention, latest-event ordering, packaged/opened filter parity and separation.
- Follow-up v91-v92: recurrence history matches Korean/English KPI aliases and reply import preserves bilingual KPI aliases from matching mail history.
- D+7 contract rechecked: sent-only source, 7-day threshold, all-replied exclusion, prior-reminder exclusion.
- Refresh/single-wire contract rechecked for follow-up initialization.
- Remaining closure: confirm v92 Pages deployment, cross-check mixed-language reply sequence/Repeated Issue, final refresh/download regression. General non-Pages Actions continue failing outside executed test steps and are tracked separately from application regression.
- Commits include: a260fcd, 852a6a4, 7c1f3c0, 07af24c, 1dc2d6b, e314a67, 9a46a03, c59bb88, 46c1fb4, 124ad11, d7effca, 3036746.


## 2026-10-05 — Refresh load + mail/history closure v93–v40
- Production refresh inspection: active loaded modules have no location.reload path; only hd24-auto-run retains a guarded 15s watchdog, and plain refresh exits when browser File objects are absent.
- Follow-up v93/v94: bounded auto-package retry scheduling from 4 attempts (0/250/1000/3000ms) to 2 (0/1000ms), preserving one recovery retry while reducing failure-path repeated work; duplicate prepared Preview history is suppressed only for the same plant/month/KPI/mode within 5 seconds.
- Confirmed legacy hd24-followup-sync.js / hd24-action-export.js are not production-loaded; their auto-click/download paths remain regression fixtures and must not be reintroduced.
- History v38: retain latest confirmed send, legacy-opened, and Outlook packaged timestamps independently so a newer Preview cannot erase prior delivery/package state from summary.
- History v39/v40: merge Korean/English KPI aliases within the same plant and target month for both summary grouping and Timeline send/reply sequencing. Preview/package/open events do not increment confirmed-send sequence.
- Regression contracts added for Preview-history dedupe, opened/package retention, bilingual summary grouping, and bilingual Timeline sequencing.
- GitHub Pages deployment for v93 was confirmed successful. General non-Pages workflows continue to fail/queue independently and are not treated as application regression proof without runner steps.


## 2026-10-05 — Mail/History closure v44-v45
- Normal API send failures are isolated as History failure events and never increment confirmed-send sequence.
- Added dedicated 발송실패 History filter and regression contracts.
- D+7 reminder success/failure history now preserves source targetMonth, kpi, kpiEn and originalSentAt; History links reminders back to original KPI/month while keeping sequence blank.
- Production loaders aligned: hd24-seven-day-reminder.js?v=10 and hd24-history-view.js?v=45 in both hd24-ui-v3.js and refresh-runtime.html.
- Regression locks cover D+7 KPI context, send-failure semantics, and production/refresh loader parity.
- Ulsan/India/Brazil D+7 coverage and DIO routing/365-turnover/lower-is-better contracts rechecked.
- GitHub Pages deployment for head 3963ac6 completed successfully. Non-Pages Runtime/Action jobs remain separately reported because returned job data has no executable step detail (steps=null); not treated as proof of application regression.


## 2026-10-06 — Reply-analysis dashboard integrity and mail capture
- Reworked reply Executive Dashboard quality tiers so 충분/보완 필요/중점 보완 are based on defect severity and multiplicity rather than field-completeness percentage alone.
- Removed next-month recovery target from mandatory reply-quality scoring because the India 6–8M source reply workbook does not contain that field.
- Prior-reply comparison now follows same-KPI chronological year/month history; recurring root-cause and stagnant-action signals are evaluated against earlier periods.
- Fixed retrospective weakness overcount: normal explanatory text containing 회고 is no longer itself treated as a weakness.
- Expanded cross-KPI contradiction checks beyond the initial quality/standard-work and WIP/lead-time examples to equipment reliability, productivity/lead-time, planning/forecast, and inventory relationships; direct conflicts and cross-check candidates are separated by severity.
- Added Executive Dashboard and 실적 × 회신 심층검증 dashboard capture support for India/Brazil feedback mail. Mail body is concise; KPI-level detail remains in the attached analysis workbook.
- Added Browser E2E contract that seeds one 충분, one 보완 필요, and one 중점 보완 reply and requires the dashboard to render 1/1/1, preventing all rows from collapsing into one quality tier.
- Regression status through 4eafbf3c: Runtime Regression SUCCESS, Action Cycle SUCCESS, approved UI SUCCESS; Browser E2E and Pages were still running at the time of this log update.
