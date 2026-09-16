# Development log — reply cycle fixture contract fix

- Detected `HD24 Followup Exact Once` run `35094607546` as a real regression-gate failure (`steps` present), not an execution-layer `steps=null` failure.
- Failure: `tests/reply-cycle-guard.test.js` expected the first async reply workbook build to start, but production `hd24-reply-cycle-guard.js` correctly rejected the fixture because the Preview snapshot contract now requires `data-hd24-month` and `data-hd24-count`.
- Root cause: stale test fixture, not a production runtime defect. The test populated signature/cycle/rows but omitted month/count.
- Fix: update only `tests/reply-cycle-guard.test.js` fixture to populate `hd24Month` and `hd24Count` consistently with the snapshot. No production loader, refresh-runtime, or cache version change was made because production was already correct.
- Executable regression: `HD24 Followup Exact Once` run `35097935102` completed successfully; syntax check and the full exact-once state-machine regression step both passed.
- Existing race/stale protections remain unchanged: prior-cycle async workbook is quarantined, current-cycle workbook downloads once, same-cycle in-flight duplication remains blocked.
