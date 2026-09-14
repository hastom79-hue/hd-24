# HD-24 real-file validation — India/Brazil/master

Date: 2026-09-14 KST

## User-provided files
- India source: `## HCEI Module KPI 2026 _HQ recomendation Jul 26.(2).xlsx`
- Brazil source: `HCEB Module KPI 2026_31Aug2026(2).xlsx`
- Current master: `총괄파일_인도7월_브라질6_7월반영_실파일최종보정_v16검증본(1).xlsx`

## Structural import
- India source: artifact_tool import PASS; expected `Final With HQ Suggestion` sheet present.
- Current master: artifact_tool import PASS; expected India/Brazil report sheets present.
- Brazil source: artifact_tool parser raised `Format_InvalidStringWithValue`; standard OOXML ZIP/XML inspection used for read-only validation. This parser incompatibility is not counted as an HD-24 browser failure.

## Source horizon / future contamination
- India source actual-row distribution is overwhelmingly July horizon (97 July, 6 June, 1 January among structural candidate rows).
- Brazil source actual-row distribution is overwhelmingly July horizon (80 July, 1 January among structural candidate rows).
- Current master India report sheet: no numeric values detected in Aug–Dec columns AH:AL.
- Current master Brazil report sheet: no numeric values detected in Aug–Dec columns AH:AL.
- Therefore the previously observed Brazil future-month contamination condition does NOT exist in this uploaded v16 master.

## Production mapping spot/full-history subset checks
Using production mapping rows/scales visible from `mapping_india.json` and `mapping_brazil.json`:
- India: 21 mapped KPIs checked for Jan–Jul, 142 comparable cells, 0 mismatches.
- Brazil: 27 mapped KPIs checked for July, 27/27 exact mapped/scaled matches.
- Brazil Jan–Jul subset: 183 comparable cells; 9 differences are within production display-precision tolerance; 7 are hard historical mismatches.

### Brazil hard historical mismatches found
1. Production Instruction Compliance Rate → master row 13
   - Jan source 21 vs master 79
   - Feb source 21 vs master 63
   - Mar source 43 vs master 49
   - Apr source 35 vs master 62
   - May source 26 vs master 74
   - Jun source 10 vs master 10 (match)
   - Jul source 25 vs master 25 (match)
2. Performance Test Defect Rate (Finished Product) → master row 42
   - Apr source 269 vs master 286
   - May source 259 vs master 217
   - Jan/Feb/Mar/Jun/Jul match.

These are pre-existing source↔master historical differences in the uploaded files; do not auto-correct or bypass without explicit data-source decision. They are candidates for the production history-drift fail-closed guard and therefore may explain why a safe-reflect attempt does not complete even though current July values match.

## Next verification
- Continue against exact production fail-closed behavior to determine whether these historical differences are the blocking condition.
- Do not ask the user to manually validate; use the three uploaded files as the evidence set.
