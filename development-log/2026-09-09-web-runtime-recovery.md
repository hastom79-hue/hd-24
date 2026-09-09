# HD-24 web runtime recovery — 2026-09-09

## Symptom
User reported that the GitHub Pages web application was not operating.

## Diagnosis
- main HEAD before recovery: `9c9c56ed82a146786dc5abefb5b434eee27c2ffc`
- Compared against last known-working runtime baseline `f9fc590d76144895eb1900bfd76c230e1d8c360e`.
- The only executable runtime code difference after that baseline was one line in `hd24-ui-v3.js`:
  - `safe-kpi-mapping.js?v=15` -> `safe-kpi-mapping.js?v=16`
- All other changes were development-log additions.
- `index.html` itself still references `hd24-ui-v3.js?v=15`.
- GitHub Actions execution layer continues to fail before steps, so Actions failures are not treated as application-code test failures.

## Recovery action
Restored the safe loader query key in `hd24-ui-v3.js` to the known-working value `safe-kpi-mapping.js?v=15` only. No mapping logic, KPI logic, workbook logic, or UI layout code was changed.

Recovery commit:
`6499bb10105f173201e38314d49842a6505e9983`

## Reasoning
This is a minimal rollback of the only executable code delta since the last known-working runtime, prioritizing immediate web operability while preserving all validated workbook and fail-closed logic.

## Browser note
Because `index.html` references `hd24-ui-v3.js?v=15`, a browser may retain an older cached asset. A hard reload may be required after Pages deployment.
