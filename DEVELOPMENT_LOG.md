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
