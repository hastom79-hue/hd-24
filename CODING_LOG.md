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
