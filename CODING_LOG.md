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
