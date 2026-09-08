# 2026-09-08 Historical Mismatch Classification and v15 Prior-Month Anchor

## Scope
Continued real-file regression using the locked/current HD-24 workbook chain and current main mappings. No historical master values were overwritten during this QA cycle.

Files used for read-only real-file inspection:
- `총괄파일_인도7월_브라질6_7월반영_행밀림전수검증_NVA보정본.xlsx`
- `HCEI_Module_KPI_2026_HQ_recomendation_Jul26.xlsx`
- `HCEB_Module_KPI_2026_31Aug2026.xlsx`

`artifact_tool` could not start in this session because the artifact daemon socket timed out. The same import failure was not looped. Read-only validation switched to direct XLSX ZIP/XML parsing. No spreadsheet mutation was done through that fallback.

## Historical mismatch classifier
Temporary real-file snapshot + GitHub Actions classifier was executed against the actual current `mapping_india.json` and `mapping_brazil.json` including runtime additions.

Initial classifier run:
- workflow run `34180721684`: SUCCESS
- total mapped KPI: 154 (India 77 + Brazil 77)
- Jan-Jun numeric cells compared: 899 (India 448 + Brazil 451)

Refined classifier run:
- workflow run `34180924635`: SUCCESS
- India mismatch: 6 cells, all one KPI, all stale master zero values
  - `Manufacturing Lead Time (Fab Tacking to FDI out)` Jan-Jun
- Brazil mismatch: 75 cells
  - display-rounding equivalent: 35
  - annotated numeric same (e.g. `42 (누적)`): 8
  - dash-zero equivalent: 3
  - genuine value difference: 24
  - stale master zero: 1
  - status-text conflict (`미집계` etc.): 3
  - other text conflict: 1
- Brazil serious subset after semantic/display filtering: 29 cells / 10 KPI

Serious Brazil KPI set:
1. Production Instruction Compliance Rate
2. Performance Test Defect Rate (Finished Product)
3. Production Order Change Ratio
4. Imported Material Delivery Compliance Rate
5. Monthly Shipment Plan Compliance Rate
6. Production Incoming Plan Compliance Rate
7. Long-Term Inventory Value (6 month basis)
8. Sequence Compliance Rate by Line
9. NVA reduction cases reflecting from SWC
10. IQ 200 Issues with Production responsibility (Assembly)

## Structural attack on the 10 Brazil KPIs
Direct XLSX cell inspection verified for all 10:
- source KPI label is on the mapped KPI row;
- Actual row is immediately below and KPI-name column is blank there;
- source unit matches the mapped/master unit family;
- master KPI label is the intended KPI;
- adjacent source KPI labels confirm no row shift.

Most important evidence: all 10 serious KPIs have matching source/master values for both June and July in the current NVA-corrected workbook. Therefore the Jan-May differences are historical revisions/stale master values, not evidence of current row-shift or wrong KPI mapping.

## RCCP correction to prior development-log statement
A prior log/patch incorrectly concluded that Brazil `M+1 Production Volume Variation Rate` should use `scale:100` based on an assumed numeric Excel percentage representation.

Direct XLSX stored-value inspection proved that the actual source cell is stored as a string such as `+8%`. Browser `normalizeValue()` already converts that to numeric `8`, so `scale:100` would incorrectly generate `800`.

Correct mapping restored:
- `scale: 1`
- `valueFormat: 퍼센트텍스트`

Rollback workflow run `34180791937`: SUCCESS.
Current `mapping_brazil.json` was re-read after rollback and verified.
This section supersedes the earlier scale-100 conclusion; older logs remain untouched for append-only traceability.

## v15 history policy hardening
Problem found in v14:
- every historical source/master difference, even an old January revision or harmless display rounding, blocked the entire current-month output forever.
- this was over-strict after strict KPI-name, unit, Actual-row, duplicate-target and future-month guards had already passed.

v15 policy:
- previous reporting month (`horizon - 1`) is the integrity anchor;
- a real previous-month mismatch still BLOCKS the entire output;
- display precision equivalents are accepted (examples: 3.19 vs 3.2, 44.5 vs 45, 0.045 vs 0.05, 15.09 vs 15.1);
- annotated numeric equivalents are accepted (example: `42` vs `42 (누적)`);
- `0` vs `-` is accepted as semantic zero;
- differences older than the previous month are NEVER overwritten; they are preserved and logged as historical revision/drift warnings;
- current-month writing, formula blocking, duplicate-target blocking, future-month blocking and XML post-write verification remain unchanged.

Temporary hardening workflow run `34181062804`: SUCCESS.
- patch step: PASS
- static policy assertions: PASS
- semantic history matrix: PASS
- commit step: PASS

Runtime commit:
- `a7766c9bba795f826972d5e31284bd994260cf23`
- message: `fix: anchor history integrity on prior month and preserve older revisions [skip ci]`

Current runtime verification:
- `safe-kpi-mapping.js` contains v15 prior-month anchor logic;
- `hd24-ui-v3.js` loads `safe-kpi-mapping.js?v=15`;
- `index.html` loads `hd24-ui-v3.js?v=15`.

## Cleanup
Removed temporary QA/hardening assets after successful execution:
- `.github/workflows/history-anchor-v15-hardening.yml`
- `.github/workflows/revert-brazil-rccp-scale.yml`
- `.github/workflows/past-mismatch-classify.yml`
- `qa/tmp_validation_snapshot.b64`
- `qa/tmp_refined_classifier_trigger.txt`

Kept `qa/past_mismatch_report.json` as the audit result.

## Current validation conclusion
For the current July horizon real files:
- current mapping structure: PASS for the attacked serious KPI set;
- June prior-month integrity anchor on the serious set: PASS;
- July source/master values on the serious set: PASS;
- old Jan-May revisions: preserved, warned, not overwritten;
- RCCP string-percent semantics: corrected and verified;
- v15 history policy: automated static/synthetic validation PASS.

Browser GUI click E2E is still not claimed as tested because no browser automation tool was available in this execution environment.
