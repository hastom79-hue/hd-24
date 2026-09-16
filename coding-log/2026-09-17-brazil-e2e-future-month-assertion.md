# Coding log — Brazil E2E stale future-month assertion

- File: `.github/workflows/hd24-browser-e2e-brazil.yml`
- Previous assertion: required literal `미래월 Actual`.
- Observed production log: `총괄 미래월 기존값 1셀 감지` followed by `총괄파일 생성 중단`.
- Change: assert both current fail-closed markers instead of stale wording.
- Preserved: no-download assertion for blocked case; clean reflect PASS; 77-cell mapping verification; other-plant 0; future-month 0; prior-value overwrite 0; formula overwrite 0; downloaded workbook July value and Aug-Dec untouched verification.
- Runtime loader/refresh: unchanged because production behavior was already correct.
- Regression: push of workflow file triggers `HD24 Brazil Browser E2E`; evaluate actual job steps/logs, not run conclusion alone.
