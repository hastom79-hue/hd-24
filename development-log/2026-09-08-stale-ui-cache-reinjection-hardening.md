# 2026-09-08 Stale UI Cache Reinjection Hardening

## Finding
The permanent `.github/workflows/apply-approved-ui.yml` recovery workflow still hard-coded `?v=3` when restoring missing UI asset references. Current runtime is v15. The stale fallback would not affect the current page while references exist, but could reintroduce an obsolete UI/runtime cache reference during a future recovery.

## Fix
Updated the recovery workflow so it no longer contains hard-coded `hd24-ui-v3.js?v=3` or `hd24-ui-v3.css?v=3` references.

The workflow now:
1. reads `hd24-ui-v3.js`;
2. extracts the active runtime version from `safe-kpi-mapping.js?v=<number>`;
3. uses that same version when restoring missing CSS/JS asset references;
4. fails closed if the current runtime version cannot be determined;
5. includes a static assertion that stale v3 reinjection strings are absent.

Patch commit:
- `3915a79fc1395dd03c5341053073b4a03bc3331c`
- message: `fix: prevent stale UI cache version reinjection`

This removes the known recovery-path cache downgrade risk. Current runtime remains v15.
