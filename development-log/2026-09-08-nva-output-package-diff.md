# NVA workbook package semantic diff verification — 2026-09-08

Input working file:
`총괄파일_인도7월_브라질6_7월반영_행밀림전수검증수정본.xlsx`

Output:
`총괄파일_인도7월_브라질6_7월반영_행밀림전수검증_NVA보정본.xlsx`

Artifact-tool edit:
- Brazil reporting sheet `AF122` (Jun) = 0
- Brazil reporting sheet `AG122` (Jul) = 1

Post-export validation:
- output re-imported successfully;
- Brazil row122 reads May=0, Jun=0, Jul=1, Aug=blank;
- formula/error scan on India reporting sheet = 0;
- formula/error scan on Brazil reporting sheet = 0;
- future-month Aug-Dec numeric Actuals: India 0, Brazil 0.

Package diff note:
Artifact export reserialized multiple XLSX XML/relationship/drawing parts. To detect semantic collateral changes, every worksheet cell was compared by reference, value, formula, type and style attribute between input and output.

Semantic cell differences across all 9 sheets: exactly 2.
- `브라질법인 KPI(26년 보고용)!AF122`: blank -> numeric 0, style 260 preserved
- `브라질법인 KPI(26년 보고용)!AG122`: blank -> numeric 1, style 260 preserved

All other cell values/formulas/styles: unchanged.

Conclusion: NVA output patch is semantically limited to the intended two cells.