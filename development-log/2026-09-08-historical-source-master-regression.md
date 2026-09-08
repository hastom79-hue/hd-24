# 2026-09-08 Historical source/master regression gate

## Scope
Revalidated the current NVA-corrected master workbook against the July India source and Aug-31 Brazil source, using the current main mapping rows/scales and the v14 Fail-Closed historical-mismatch rule.

## Files
- Master: `총괄파일_인도7월_브라질6_7월반영_행밀림전수검증_NVA보정본.xlsx`
- India source: `HCEI_Module_KPI_2026_HQ_recomendation_Jul26.xlsx`
- Brazil source: `HCEB_Module_KPI_2026_31Aug2026.xlsx`

## India
- Static + runtime mapping remains structurally valid.
- Mapped historical values are aligned except `Manufacturing Lead Time (Fab Tacking to FDI out)` -> master row 42, where source Jan-Jul contains 7.50 / 7.41 / 7.00 / 6.64 / 7.31 / 7.37 / 7.28 while the master historical cells are numeric zeroes. Under v14 this correctly triggers Fail-Closed.
- India MTTR/MTBF/MTTD raw XML stores Excel time serials; the browser loads with `cellDates:true`, and `normalizeValue(Date)` converts them to hours. Raw-XML serial-vs-hour differences are therefore not classified as runtime mismatches.

## Brazil
The current master contains multiple historical source/master differences on mapped KPIs. v14 correctly blocks export when any one is present. Confirmed examples include:
- Production Instruction Compliance Rate: source 21/21/43/35/26% vs master 79/63/49/62/74% for Jan-May (definition/transform mismatch, not rounding).
- Performance Test Defect Rate: Apr 269 vs 286; May 259 vs 217.
- IQ200 production responsibility: May 9 vs 7.
- Production Order Change Ratio: Jan-May materially different.
- Imported Material Delivery Compliance Rate: Jan-Mar materially different.
- Monthly Shipment Plan Compliance Rate: May 84 vs 100.
- Production Incoming Plan Compliance Rate: Apr 100 vs 92.
- Sequence Compliance Rate by Line: Jan-May materially different.
- NVA reduction cases reflecting from SWC: Feb source 1 vs master 2.
- Several additional historical differences are rounding/precision differences (e.g. 3.19 vs 3.2, 44.5 vs 45, 15.09 vs 15.1). Because the requested operating policy is Fail-Closed, these are still blockers until explicitly reconciled rather than silently tolerated.

## RCCP defect found and fixed
`M+1 Production Volume Variation Rate` was stored in the source workbook as numeric Excel percentage values (e.g. 0.08 for 8%) but the Brazil mapping used `scale:1`, while the master stores 8.0. This was a mapping defect.
- Fixed `mapping_brazil.json`: `scale` 1 -> 100; `valueFormat` -> `숫자`.
- Patch commit: `cbbeba24d2917b373ee6417df3e5bd2b11df0c70`.
- Temporary patch workflow removed after success.

## Current gate
**BLOCK** for production export with the current master/source combination.
Reason: historical source/master differences are real and v14 intentionally blocks rather than overwriting or continuing.

No historical master values were silently changed during this validation. The NVA-corrected workbook remains unchanged in this gate.
