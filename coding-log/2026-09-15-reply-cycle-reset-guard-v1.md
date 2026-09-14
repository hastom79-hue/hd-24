# HD-24 Coding Log — Reply Cycle Reset Guard v1

Date: 2026-09-15

## Files changed
1. `hd24-reply-cycle-guard.js` — new production guard.
2. `hd24-ui-v3.js` — production loader now loads `hd24-reply-cycle-guard.js?v=1` after `hd24-followup-sync.js?v=8`.
3. `refresh-runtime.html` — cache refresh helper preloads reply guard v1.
4. `tests/reply-cycle-guard.test.js` — old-cycle async workbook build vs new-cycle build regression.
5. `.github/workflows/hd24-followup-exact-once.yml` — includes guard syntax/test execution.

## Coding decisions
- Keep file signature unchanged; use existing monotonic `window.hd24ActionCycle` as the authoritative generation epoch.
- Intercept only the reply-download button when its Preview is explicitly tagged by follow-up sync v8 with the current signature, cycle and exact row fingerprint.
- Freeze business data before the asynchronous ExcelJS boundary. Do not read mutable live month/plant/result state after `writeBuffer()` resolves.
- Revalidate immediately after the async boundary and before object-URL/download creation.
- Drop stale workbook bytes without download when signature/cycle/Preview ownership changed.
- Permit the new cycle to start while a prior-cycle build is still pending; dedupe only within the same `cycle::signature`.
- Preserve legacy/manual behavior for non-sync-owned Preview state.

## Commit history
- `00525e1c345f28d61498e2d896f8c2a40ff58373` — add reply cycle guard v1.
- `017c06d270ccef643b5be9de964df9ac2a221405` — load guard in production runtime.
- `b8e7402d41d796a0e6b0881314b78e41fdfc3891` — preload guard in refresh helper.
- `c5f76146546313625c97813131fa9a6902738c0f` — add async upload-switch regression test.
- `f5ab60784c7c565173372805f1008a5c8b8ea7eb` — add regression to exact-once CI workflow.

## Test state
The dedicated workflow run `34907647493` reported failure, but the only job returned `steps=null`. No test command or assertion executed. This is preserved as a failed execution attempt, not converted into a PASS and not treated as an application failure.

The new permanent test encodes the required state sequence:
- cycle 7 build starts and blocks in async write;
- upload changes to cycle 8;
- cycle 8 build starts independently;
- cycle 8 resolves/downloads;
- cycle 7 resolves afterward and must be discarded;
- final download set contains only `HDPS_KPI_Response_India_8M.xlsx`.

## Deployment state at log creation
Pages run `34907647329` for code/test HEAD had reached `in_progress`. Subsequent documentation commits create a newer final HEAD, so deployment must be checked again after both logs are committed.

## Unresolved environmental constraint
Custom GitHub workflow runners continue to terminate without step execution (`steps=null`). No browser E2E PASS is claimed from those runs.
