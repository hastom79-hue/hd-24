# 2026-09-08 Browser E2E / Sheet XML Compatibility Closure

## Objective
Close the remaining browser-path uncertainty by executing the actual HD-24 web flow in headless Chromium: file selection -> safe guard readiness -> reflect click -> XLSX generation/download -> downloaded workbook verification.

## Permanent E2E added
- workflow: `.github/workflows/hd24-browser-e2e.yml`
- first workflow commit: `d406f45105170b89b93fa46d892ebf0c77b2d5d6`
- anonymous fixtures are generated at runtime from production India mapping; no company workbook is committed to the repository.
- India static mapping count is 76; `runtimeMappings()` adds the recovered manufacturing lead-time KPI, therefore safe reflection count is 77.

## Failure 1: blind download timeout
- run: `34181894234`
- job: `101922498686`
- dependency install: PASS
- fixture generation: PASS
- local web server: PASS
- browser reflect/download step: FAIL because the test waited for download before exposing the application error.

## Diagnostic hardening
- commit: `fb06f399094d788c60d3ae520f9f92cbf16a6259`
- change: browser test now waits for either `반영 후 재검증 PASS` or `오류:` and prints the full HD-24 application log before asserting download.

## Failure 2: actual runtime defect exposed
- run: `34182194139`
- job: `101923356608`
- safe mapping: `77/77`, rejected 0
- source row relocation: 0
- master row relocation: 0
- source month header: row 11, 12 months
- master month header: row 4, 12 months
- horizon: July
- current-month planned writes: 77
- prior-month anchor checks: 77
- older-history equal/display-equivalent checks: 462
- application error: `시트 경로 확인 실패`

## Root cause
Legacy `findSheetXmlPath()` parsed `xl/_rels/workbook.xml.rels` with a regex that assumed the XML `Id` attribute appeared before `Target` in the `Relationship` tag. XLSX producers such as OpenPyXL may emit attributes in a different order. The old code was also brittle around absolute/relative relationship targets.

## Runtime fix
- successful apply workflow run: `34182464759`
- job: `101924136988`
- runtime patch commit: `63b83c371635871b4b03f30a92307cd8631766f3`
- `findSheetXmlPath()` now uses browser `DOMParser` for workbook and relationship XML, resolves relationship attributes independent of serialization order, normalizes relative/absolute target paths, removes `.`/`..` path components, and confirms that the resolved XML file actually exists in the ZIP before mutation.

## Final browser E2E PASS
Because the runtime patch commit used `[skip ci]`, the permanent browser workflow was explicitly retriggered by commit:
- `4760a87bfb36d08c094c076594cacac28088c34b`

Final E2E:
- run: `34182543102`
- job: `101924363869`
- conclusion: SUCCESS

Application browser log:
- safe mapping: `77/77`
- rejected: 0
- current-month writes: 77
- prior-month anchor checks: 77
- post-write revalidation: `77셀 PASS`
- other plant writes: 0
- future-month writes: 0
- historical existing-value overwrites: 0
- historical revision warnings: 0
- formula overwrites: 0
- actual browser download emitted: `master_인도검증반영본.xlsx`

Downloaded workbook reverse verification:
- July `AG`: verified on all 77 mapped master rows
- August-December `AH:AL`: untouched on all 77 mapped master rows
- result: `BROWSER E2E PASS: July verified on 77 master rows; Aug-Dec untouched`

## Permanent regression protection
The permanent runtime regression workflow was hardened so the DOM-based sheet relationship parser cannot silently regress to the old attribute-order-dependent regex.
- gate hardening commit: `6b7653c50cc5c5b61622c2263048ecbc35814250`
- post-cleanup runtime regression run: `34182674786`
- job: `101924751927`
- conclusion: SUCCESS

## Cleanup
Temporary sheet-XML patch workflow/script were removed after the successful E2E. Permanent assets retained:
- `.github/workflows/hd24-browser-e2e.yml`
- `.github/workflows/hd24-runtime-regression.yml`
- `.github/workflows/apply-approved-ui.yml`

Latest cleanup commit checked before this log: `ceaa4162182ab59d6739886b1c0359bbd2526a62`.

## Remaining administration-level limitation
The browser/data/runtime path is now exercised by permanent CI. GitHub `main` branch still lacks server-side required-status/ruleset protection under the currently available repository administration permissions; that remains a repository-settings risk rather than a runtime defect.
