# Coding log — direct reply stale guard

- Added `hd24-direct-reply-guard.js` v1 as a capture-phase owner of `hd24DownloadReply`.
- Tracks Preview source mode: month miss / watch / all.
- Freezes file-pair signature + plant + selected month + exact derived output token before asynchronous Excel generation.
- Revalidates all frozen state after `ExcelJS.writeBuffer()` and before object-URL download.
- Rejects stale output when upload files, plant, month, KPI result state, recurrence history, mail timestamps, or reply timestamps change.
- Adds in-flight key guard to reject duplicate generation for the same signature/month/mode.
- Wired v1 in `hd24-ui-v3.js` and `refresh-runtime.html`.
- Added `tests/direct-reply-guard.test.js`.
- Replaced stale runtime regression assumptions that referenced removed `hd24-action-export.js` / `hd24-followup-sync.js` production loaders; retained safe-reflect data-integrity invariants and mapping uniqueness checks.
