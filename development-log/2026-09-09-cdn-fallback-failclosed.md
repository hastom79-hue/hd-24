# HD-24 CDN fallback / fail-closed hardening — 2026-09-09

## Operational risk found
- `index.html` loads SheetJS/XLSX, JSZip, and ExcelJS only from cdnjs.
- In a corporate/security/mobile network where cdnjs is blocked, the page can render while Excel processing is unavailable.
- Previous `hd24-ui-v3.js` only guarded safe runtime loading and did not verify these required global libraries before enabling the safe reflect path.

## Application fix
Commit: `084513cc277429fc35bb13cd1b69dcc7cd1d9d25`

`hd24-ui-v3.js` now starts fail-closed:
1. `window.hd24SafeReflectReady=false`
2. `#btnReflect` disabled
3. Verify `XLSX`, `JSZip`, `ExcelJS`
4. If a primary cdnjs dependency is missing, try jsDelivr fallback:
   - `xlsx@0.18.5/dist/xlsx.full.min.js`
   - `jszip@3.10.1/dist/jszip.min.js`
   - `exceljs@4.4.0/dist/exceljs.min.js`
5. Load `safe-kpi-mapping.js?v=18` only after all required dependencies are available.
6. If primary and fallback both fail, keep reflect disabled and report a runtime dependency error.

Pages deployment for the application fix:
- run `34346451595`
- conclusion: SUCCESS

## E2E / regression execution status for application fix
The workflows were triggered, but GitHub Actions still failed before any steps started:
- India Browser E2E run `34346458372`, job `102449088897`: `steps=null`
- Brazil Browser E2E run `34346458362`, job `102449088959`: `steps=null`
- Runtime Regression run `34346458157`, job `102449088146`: `steps=null`

These are runner/execution-layer pre-step failures, not application test failures.

## Runtime diagnostics hardening
Commit: `34b55a94f4e224e0d0e0a50532e0e040f8ab6ac9`

`runtime-health.html` was changed to report final runtime state instead of only primary cdnjs state:
- records whether the primary dependency loaded,
- loads current HD24 UI with a timestamp cache bypass,
- waits for dependency fallback and safe-runtime readiness,
- reports each dependency as `cdnjs` or `fallback`,
- reports terminal FAIL only when required globals remain unavailable after fallback.

Pages deployment for fallback-aware diagnostics:
- run `34346543331`
- conclusion: SUCCESS

## Cache-safe diagnostics entry
Commit: `056efbe32e8ad70ec8327245a00d6c3eb1a2b3f7`

The diagnostics page `최신 HD-24 열기` action now routes through `refresh-runtime.html` rather than entering `index.html` directly, so the current CSS/JS/safe runtime cache chain is explicitly reloaded before application entry.

## Remaining risks
- `index.html` still references outer CSS `?v=3` and UI JS `?v=15`; UI JS internally loads safe runtime `?v=18`.
- `refresh-runtime.html` mitigates stale cache for the currently active URLs.
- The existing Apply workflow is intended to align the outer cache revision when GitHub Actions execution recovers, but custom Actions still fail before steps start.
- Full browser E2E PASS for the new fallback behavior remains pending until the runner execution layer can actually start jobs.
