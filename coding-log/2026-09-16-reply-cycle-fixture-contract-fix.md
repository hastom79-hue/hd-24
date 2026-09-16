# Coding log — reply cycle fixture contract fix

- Inspected failed run `35094607546`; runner/checkout/setup/syntax all succeeded and `Execute exact-once state-machine regressions` failed at `tests/reply-cycle-guard.test.js:36` with `actual: 0, expected: 1`.
- Compared the test fixture with production `context()` in `hd24-reply-cycle-guard.js`.
- Production requires Preview metadata: `hd24Signature`, `hd24Cycle`, `hd24Rows`, `hd24Month`, `hd24Count`.
- Test fixture supplied only signature/cycle/rows, causing `context()` to fail closed before `buildAndDownload()`; this was stale test data, not a reply-cycle application failure.
- Added `preview.dataset.hd24Month=String(item.month)` and `preview.dataset.hd24Count='1'` inside `applySnapshot()`.
- No production JS, loader, refresh-runtime, or version bump: runtime contract was already correct and fail-closed.
- Regression run `35097935102`: completed/success; `Execute exact-once state-machine regressions` passed.
