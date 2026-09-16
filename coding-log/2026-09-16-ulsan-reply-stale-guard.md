# Coding log — Ulsan reply stale guard v2

- Root cause: direct reply guard v1 required both `srcFile` and `masterFile`; Ulsan is master-only, so its signature was always empty and the guard returned without intercepting download.
- `signature()` now branches by plant:
  - Ulsan: `plant|master-only|master.name|master.size|master.lastModified`
  - India/Brazil: unchanged source+master file-pair signature.
- Existing post-`writeBuffer()` state comparison remains unchanged and now applies to Ulsan as intended.
- Existing `inflight` exact-key dedupe now also applies to Ulsan.
- Updated production loader and refresh preload from `hd24-direct-reply-guard.js?v=1` to `v=2`.
- Updated `tests/direct-reply-guard.test.js` to assert both master-only Ulsan and source+master India/Brazil signatures plus loader/refresh v2 alignment.
- Updated Runtime Regression Gate asset invariant to v2.
- Regression evidence: run `35044625166`, `Validate production runtime invariants` completed successfully.
- No unrelated KPI logic or cache versions changed.
