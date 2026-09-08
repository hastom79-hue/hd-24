# HD24 Real-file Runtime Attack Validation — 2026-09-08

## Scope
- Runtime snapshot from current production v15
- Locked master source of truth: `총괄파일_인도7월반영_최종검증본 (4)(3).xlsx`
- India source: `HCEI_Module_KPI_2026_HQ_recomendation_Jul26.xlsx`
- Brazil source: `HCEB_Module_KPI_2026_31Aug2026.xlsx`
- Corporate XLSX files were kept local and were not uploaded to GitHub.

## Browser execution constraint
- GitHub Actions synthetic Chromium E2E already passes for India and Brazil.
- Local session Playwright package exists, but the Chromium executable was absent.
- Browser download attempt failed because external DNS to Playwright CDN is blocked in the current local execution environment.
- Therefore real-file validation continued by applying the same v15 mapping / unit / horizon / anchor logic directly to XLSX ZIP/XML locally.

## Real-file findings

### India
1. Runtime mapping count target: 77.
2. Actual source-unit metadata mismatches caught by v15:
   - `PPM`: source unit `Nos.` vs mapping/master `PPM`.
     - Jan-Jul source values: 388, 384, 385, 369, 368, 375, 376.
     - Jan-Jul master values are exactly identical.
     - Interpretation: source unit label is legacy/inaccurate; data semantics are PPM.
   - `5S Audit Score`: source unit `%` vs mapping/master `점`.
     - Source Jan-Jul: 0.71, 0.72, 0.76, 0.74, 0.77, 0.75, 0.75.
     - Master Jan-Jul: 71, 72, 76, 74, 77, 75, 75.
     - Mapping scale=100, so values are semantically consistent.
3. After accounting for Excel time-cell semantics, MTTR/MTBF/MTTD source time values match master display values (e.g. MTTR Jun 0.0159722222 day -> 0.383333 hour; master 0.383333).
4. Remaining hard anchor blocker:
   - `Manufacturing Lead Time (Fab Tacking to FDI out)` / master `제조 리드타임(Fab.to Machine Stock)`.
   - Source Jan-Jul: 7.50, 7.41, 7.00, 6.64, 7.31, 7.37, 7.28 days.
   - Locked master row is 0 for Jan-Jul.
   - v15 previous-month integrity gate would therefore block June (0 vs 7.37) once the unit exceptions above are corrected.
5. India master has no Aug-Dec numeric contamination in the reporting sheet.

### Brazil
1. Runtime mapping count target: 77.
2. Unit metadata blocker:
   - `LTIR (Lost Time Incident Rate)`: source unit `%`, mapping/master unit `건`.
   - Source Jan-Jul: 0, 2.2, 0, 2, 1, 0, 1.
   - Master Jan-May: 0, 2.2, 0, 2, 1; Jun-Jul blank in locked master.
   - KPI name is a rate and values include 2.2, so the master/mapping `건` unit requires correction rather than a broad compatibility bypass.
3. Previous-month anchor blockers even after LTIR metadata correction:
   - `완제품 시운전 불량율`: Jun master 242 vs source 256.
   - `가치시간 비율(가치 흐름 효율, VSE) → Fab To Machine Stock`: Jun master 40 vs source 41.
4. Locked Brazil master contains pre-existing future-month contamination: 18 numeric cells in Aug/Sep, rows 41-49:
   - r41 415 / 519
   - r42 1306 / 1203
   - r43 293 / 412
   - r44 1335 / 1381
   - r45 2436 / 2011
   - r46 1170 / 1239
   - r47 58 / 66
   - r48 528 / 520
   - r49 15 / 13
5. Current v15 mutation boundary only guarantees that it does not *write* future-month cells. It does not clear or reject future values already present in the input master. Therefore a successful reflect on a contaminated master would preserve those 18 values unless a new pre-existing-future contamination gate is added.

## Production-readiness conclusion
- Synthetic Browser E2E: PASS for India and Brazil.
- Locked real-file combination: NOT production-pass yet.
- Required before calling real-file final:
  1. Narrow India unit compatibility for PPM legacy `Nos.` and 5S `%` -> score with scale 100.
  2. Correct Brazil LTIR unit semantics (rate, not count) in mapping/master metadata.
  3. Resolve India Manufacturing Lead Time historical zeros vs source actuals.
  4. Resolve Brazil June anchor differences (242 vs 256; 40 vs 41) by approved source-of-truth decision.
  5. Add fail-closed detection for pre-existing master values after source horizon, so contaminated masters are rejected rather than silently preserved.

## Status
**REAL-FILE ATTACK VALIDATION: FAIL-CLOSED / NOT FINAL**

No production workbook was modified during this validation step.