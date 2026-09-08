# 2026-09-08 v16 drift and workbook revalidation

## Scope
Continued execution verification after safe-reflect cache bust and post-deployment validation.

## Workbook revalidation
Artifact: `총괄파일_인도7월_브라질6_7월반영_실파일최종보정_v16검증본.xlsx`

Target reporting sheets:
- `인도법인 KPI(26년 보고용)`
- `브라질법인 KPI(26년 보고용)`

Results:
- target reporting-sheet formula/error token scan: 0 for both sheets
- future-month range AH:AL (Aug-Dec): numeric cells 0 for India, 0 for Brazil
- only month header text remains in AH4:AL4

## Runtime/main drift verification
- `hd24-ui-v3.js` blob SHA: `a9b426eef70d78c6df8f6c017398de83b0a5a429`
- loader still points to `safe-kpi-mapping.js?v=16`
- `safe-kpi-mapping.js` blob SHA: `1236ba6715c0764236e1c3357886c94cae5b8934`
- fail-closed mapping validation, strict Actual-row structure, unit compatibility, source horizon, master future-month contamination, and historical mismatch protections remain present.

## Brazil RCCP semantic confirmation
The final/current Brazil RCCP mapping is intentionally:
- `M+1 Production Volume Variation Rate`
- `scale: 1`
- `valueFormat: 퍼센트텍스트`

This supersedes an earlier intermediate log that temporarily proposed `scale:100`. Direct source stored-value inspection established that Brazil source values are strings such as `+8%`; browser normalization already converts them to numeric 8. Therefore `scale:100` would be wrong.

## Deployment / Actions status
Latest pre-log HEAD checked: `c8e04824a355ad23587679a952664274b8800e5d`
- Pages run `34192000178`: SUCCESS
- Runtime Regression Gate run `34192001461`: FAILURE before test execution; job has no executable steps (`steps` absent/empty)
- Apply approved UI run `34192001603`: same Actions execution-layer failure pattern

Conclusion: Pages deployment path remains healthy. GitHub Actions runner/execution layer remains separately unavailable; current failures are not evidence of application-code regression.

## Remaining risk
`index.html` still references outer UI assets with `?v=15` while the loaded UI script itself now requests `safe-kpi-mapping.js?v=16`. A full-file 54KB Contents-API replacement solely to change two cache-query values was not forced while Actions recovery is unavailable, because that creates a larger file-corruption risk than the remaining cache risk. The inner safe-runtime cache bust is already active and deployed.
