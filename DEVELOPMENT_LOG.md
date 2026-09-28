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
