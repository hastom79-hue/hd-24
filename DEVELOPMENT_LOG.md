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
