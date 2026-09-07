# HD-24 v9 Package Integrity Gate — 2026-09-07

## Scope
Canonical master only: `총괄파일_인도7월반영_최종검증본 (4)(2).xlsx`.

## Direct XLSX package inspection
The canonical XLSX was inspected as an OOXML ZIP package without regenerating or rewriting the workbook.

### ZIP integrity
- ZIP integrity test (`testzip`): PASS / no corrupt member found.

### workbook.xml sheetId result
- Total sheets: 9
- Sheets with sheetId: 9
- Missing sheetId: 0
- Hidden sheet state is explicitly present on management/reference sheets.

Visible reporting sheets confirmed:
- 울산캠퍼스 KPI(26년 보고용) — sheetId 5
- 인도법인 KPI(26년 보고용) — sheetId 7
- 브라질법인 KPI(26년 보고용) — sheetId 9

Hidden/reference sheets also retain valid sheetId values.

### workbook relationships
All 9 workbook relationship IDs resolve to existing worksheet XML files: PASS.

Resolved visible report sheets:
- India report sheet → `xl/worksheets/sheet5.xml`
- Brazil report sheet → `xl/worksheets/sheet6.xml`

Both target worksheet XML files parse successfully as XML.

Read-only baseline fingerprints:
- India report XML SHA-256 prefix: `90bfb3e6e6640ffc`
- Brazil report XML SHA-256 prefix: `b7795d008103b27b`

### package anchor files
Presence confirmed:
- `xl/styles.xml`
- `xl/sharedStrings.xml`
- `[Content_Types].xml`
- `_rels/.rels`

## Browser-path relevance
The HD-24 browser path loads the original master bytes into JSZip and v9 patches only the selected target worksheet XML. It does not regenerate `xl/workbook.xml`, workbook relationships, styles, shared strings, hidden-sheet metadata, or sheetId declarations. Therefore workbook-level sheetId/state metadata is preserved by design.

## Gate decision
- Canonical ZIP package integrity: PASS
- Canonical workbook.xml sheetId: PASS 9/9
- Missing sheetId: 0
- Workbook relationship resolution: PASS 9/9
- India target worksheet XML: PASS
- Brazil target worksheet XML: PASS
- Required package anchors: PASS
- Browser package-preserve design: PASS
- Artifact-tool sheetId warning: isolated to auxiliary validation export path; it is not evidence of a defect in the canonical workbook package.
- Canonical master modified: NO
- main branch modified: NO

## Next gate
Continue final preview execution validation and allowed-target-only mutation verification before any main deployment.
