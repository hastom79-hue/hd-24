# HD-24 Production Action Export 통합/검증 일지

일자: 2026-09-14 KST

## 사용자 확정 운영흐름
1. 실적파일 + 최종관리파일 업로드
2. 파일 준비 즉시 안전검증/실적 자동반영
3. 안전반영 성공 후 자동 KPI 분석
4. 당월 목표미달 / 일시악화 / 3개월 이상 지속악화 / 6개월 이상 장기악화 / 재발 KPI 관리대상 추출
5. 안전반영본을 기반으로 `미달사유 / 만회계획` 입력열이 포함된 최종 분석파일 자동 추출
6. 영문 회신용 Excel + 메일 Preview 자동 준비
7. Preview 확인 후 사용자 발송 버튼 클릭
8. 발송시점 / 회신시점 / 회신차수 / 반복사유 재발 이력관리

## 이번 Production 연결
### 신규 `hd24-action-export.js`
- 기존 `safe-kpi-mapping.js`의 fail-closed 안전반영 로직은 수정하지 않음.
- 안전반영 다운로드 파일명(`검증반영본.xlsx/.xlsm`)만 캡처.
- 동일 파일쌍에 대한 `window.hd24SafeReflectSuccessSignature`가 존재해야 후처리를 허용.
- 안전반영 성공 후 `btnJudge` 자동실행을 보강.
- 자동판정 결과 `allResults`의 실제 `masterRow / KPI / direction`을 안전 후처리 매핑으로 사용.
- 안전반영 결과 Blob을 ExcelJS로 다시 열어 `kpi-action-workbook.js`의 `applyKpiActionColumn()` 실행.
- `미달사유 / 만회계획` 열 생성 / KPI 기존 fill 보존 / 기존 수기입력 보존 / KPI명 원문 보존 규칙 유지.
- 최종 파일명: 기존 `...검증반영본` + `_분석후속조치본.xlsx`.
- 완료 시 `hd24-action-export-complete` 이벤트 발행.

### XLSM fail-closed
- ExcelJS 재저장 시 VBA/macro 보존을 보장할 수 없으므로 `.xlsm`은 자동 후처리 재저장을 차단.
- 이 경우 기존 safe-reflect 결과파일만 유지하고 로그에 후처리 보류 사유를 명시.
- 매크로 손상 위험을 감수하고 임의 변환하지 않음.

## Runtime Loader
초기 production 연결은 v22였으며, 2026-09-14 11:56 KST 전후 캐시 재검증 과정에서 production 전체 분석모듈을 v23으로 cache-bust 함.
현재 `hd24-ui-v3.js` 연결:
- `kpi-action-classifier.js?v=23`
- `kpi-action-workbook.js?v=23`
- `hd24-action-export.js?v=23`
- `hd24-followup.js?v=23`
- `hd24-history-view.js?v=23`

기존 핵심 안전체인은 유지:
- core v18
- auto-run v19
- pipeline-gate v21

## Cache refresh
`refresh-runtime.html`은 실제 index가 요청하는 wrapper URL `hd24-ui-v3.js?v=18` 자체를 `cache:'reload'`로 강제 재요청하고, 이후 v23 하위 모듈도 모두 직접 reload함.
- classifier v23
- workbook postprocessor v23
- action export v23
- follow-up v23
- history view v23
- 기존 safe runtime / mapping JSON 포함

## 영구 회귀테스트
신규: `tests/kpi-action-export.test.js`
검증 assertion:
- safe-reflect success signature 필수
- `검증반영본`만 캡처
- approved `applyKpiActionColumn()` 호출
- XLSM fail-closed 존재
- completion event 존재
- loader에 classifier/workbook/export 현재 production 버전 연결

`.github/workflows/hd24-kpi-action-regression.yml`에도 syntax + bridge assertion을 추가함.

### 검증 중 발견/수정된 실제 회귀
- v23 cache-bust 후 `tests/kpi-action-export.test.js`가 loader v22를 하드코딩 기대하고 있음을 발견.
- Hosted runner가 `steps=null` 상태라 자동테스트에서 이 결함이 드러나지 않았음.
- runner 정상화 시 즉시 실패할 수 있는 잠재 회귀였으므로 v23 assertion으로 즉시 수정.
- 수정 커밋: `2a7c145c9c1efd98eeacfcc834148c32c0346861`.

## 실행검증 / Actions 상태
- Pages 직전 상세 Timeline 배포 run `34799941400`: build / deploy / status 모두 SUCCESS 확인.
- action-export 포함 Pages run `34800302959`: build SUCCESS. 이후 신규 커밋들이 연속 발생하면서 deploy 및 report-build-status가 CANCELLED 됨. 따라서 이 run을 최종 production 배포 PASS로 간주하지 않음.
- KPI Action Regression run `34800303514`: `completed / failure`, job `103841473976`, `steps=null`.
- 최신 Runtime Regression run `34800874121`: `completed / failure`. 기존과 동일한 hosted runner pre-step 장애 계열로 추적 중.
- Web 외부 직접 접근은 private Pages/검색 비노출 특성 때문에 이 환경에서 신뢰 가능한 live HTTP 증거로 사용하지 않음.

## 커밋
- `020f40a87ffe68d28439a5e6baeeb437eb355e1f` — production action export bridge
- `ef078beb397d2f148ea8a2670389d8ad122d102b` — production loader 연결
- `fab6f94a4ec347b59513cfa986892cbe09dc7218` — v22 refresh chain
- `4262aea131a114982d14f88497bc076daad0e967` — export bridge regression test
- `aaed0a9ff1f3a359e5a66987679c2137e9560d30` — action regression workflow 연결
- `aa9af180a94f5e3426a7737fd67827db4ac97506` — production module cache-bust v23
- `e174e6d51003174d15d15cd322afbf968a1e7179` — refresh helper v23 체인 정렬
- `2a7c145c9c1efd98eeacfcc834148c32c0346861` — regression assertion v23 정렬

## 완료판정 보류사항
- v23 최신 코드가 포함된 GitHub Pages 새 deploy의 `deploy SUCCESS` 확인 필요.
- 실제 브라우저에서 권위 실적파일 + 최종관리파일 업로드 후 `검증반영본 → 자동분석 → 분석후속조치본 → 메일 Preview` 전구간 실파일 E2E 확인 필요.
- 브라질 권위 `(4)(3)` 총괄파일은 8~9월 미래월 오염 18셀 때문에 7월 원천 기준 safe-reflect가 정상적으로 차단될 수 있음. 이를 보호로직 실패로 오판정하거나 강제 우회하지 않는다.
