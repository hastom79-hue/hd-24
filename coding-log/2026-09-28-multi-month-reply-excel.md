# 2026-09-28 Multi-month reply Excel coding log

- Root cause: direct reply guard v2 intercepted download but rebuilt only selectedMonth.
- v3 snapshots selectedMailMonths and preserves the exact KPI x month set.
- Workbook Target Month uses each row r.month; history lookup uses the same month.
- Filename, post-write stale validation and in-flight dedupe include all selected months.
- Master-only signature supports the current source-optional assessment path.
- Only direct-reply-guard cache version changed v2 to v3.
- Executable assertions added to tests/direct-reply-guard.test.js.