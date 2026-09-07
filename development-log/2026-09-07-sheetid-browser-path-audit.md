# HD-24 v9 sheetId / browser output path audit

Date: 2026-09-07
Branch: preview-v9-integrated

## Purpose
Separate the artifact_tool validation warning about missing required sheetId from the actual HD-24 browser output path.

## Canonical workbook package inspection
Canonical master: 총괄파일_인도7월반영_최종검증본 (4)(2).xlsx

Read-only OOXML package inspection of `xl/workbook.xml` found:
- worksheet count: 9
- sheets missing `sheetId`: 0
- all 9 sheet entries contain explicit `sheetId`

Therefore the canonical master itself does not have a missing-sheetId defect.

## Browser code path confirmation
`index.html` loads the uploaded master bytes twice from the same ArrayBuffer:
- `XLSX.read(buf, {type:'array', cellDates:true})` for logical cell access
- `JSZip.loadAsync(buf)` into `masterZip` for package-preserving output

v9 `safe-kpi-mapping.js` locates only the target worksheet XML inside `masterZip`, patches KPI cells in that worksheet XML, writes it back with `masterZip.file(path, xml)`, then generates the download from that same zip.

No code path in v9 rewrites `xl/workbook.xml`, sheet definitions, sheet IDs, hidden-sheet states, relationships, or defined names.

## Artifact-tool warning isolation
The prior artifact_tool-generated validation copy is a separate test artifact. Its export path rewrites package-level XML and is not the browser production path. The artifact_tool warning must therefore not be used as evidence of a production browser sheetId defect.

## Gate result
- Canonical workbook sheetId structure: PASS (9/9)
- Browser package-preserving path: PASS
- v9 writes limited to selected target worksheet XML: PASS
- Production sheetId risk attributable to v9 browser patch path: NOT REPRODUCED
- main branch changed: NO

## Next
Proceed to final Preview execution gate and keep main untouched until user approval.
