# Coding Log — Follow-up Exact-Once Regression (2026-09-15)

## Files added
- `tests/followup-exact-once.test.js`
- `.github/workflows/hd24-followup-exact-once.yml`

## Test mechanics
The test loads the production `hd24-followup-sync.js` source through Node `vm` with mocked DOM, ExcelJS, URL/blob download, timers, and events.

A valid India 7M snapshot contains one watch KPI and one healthy KPI. The generated reply workbook contains the exact watch KPI and valid Target/Actual/Status data.

The first action-export event must produce exactly one Preview, one reply-workbook generation, and one package-completion log.

Then the same cycle receives duplicate action-export, safe-reflect-complete, and repeated watchdog wake-ups. Counters must remain unchanged at 1/1/1.

## Failure condition
Any duplicate Preview, duplicate reply workbook, or duplicate completion for the same signature + upload cycle causes a non-zero test exit.

## Production impact
None. This commit adds verification only; it does not relax or alter fail-closed runtime behavior.
