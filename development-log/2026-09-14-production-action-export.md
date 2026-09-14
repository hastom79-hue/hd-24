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
`hd24-ui-v3.js`에 다음 모듈을 production 연결:
- `kpi-action-classifier.js?v=22`
- `kpi-action-workbook.js?v=22`
- `hd24-action-export.js?v=22`
- `hd24-history-view.js?v=22`

## Cache refresh
`refresh-runtime.html`이 v22 전체 분석 runtime을 강제 reload하도록 갱신:
- classifier
- workbook postprocessor
- action export bridge
- history view
- 기존 safe runtime / mapping JSON 포함

## 영구 회귀테스트
신규: `tests/kpi-action-export.test.js`
검증 assertion:
- safe-reflect success signature 필수
- `검증반영본`만 캡처
- approved `applyKpiActionColumn()` 호출
- XLSM fail-closed 존재
- completion event 존재
- loader에 classifier/workbook/export v22 연결

`.github/workflows/hd24-kpi-action-regression.yml`에도 syntax + bridge assertion을 추가함.

## 실행검증 / Actions 상태
- Pages 직전 상세 Timeline 배포 run `34799941400`: build / deploy / status 모두 SUCCESS 확인.
- 신규 action-export 포함 Pages run `34800302959`: 생성 후 build 실행 진행 중(확정 결과 추적 필요).
- KPI Action Regression run `34800303514`: `completed / failure`, job `103841473976`, `steps=null`.
- 판정: 기존과 동일한 GitHub hosted runner pre-step/execution-layer 장애. 신규 테스트 assertion이 실행된 결과가 아니므로 애플리케이션 실패로 판정하지 않음.

## 커밋
- `020f40a87ffe68d28439a5e6baeeb437eb355e1f` — production action export bridge
- `ef078beb397d2f148ea8a2670389d8ad122d102b` — production loader 연결
- `fab6f94a4ec347b59513cfa986892cbe09dc7218` — v22 refresh chain
- `4262aea131a114982d14f88497bc076daad0e967` — export bridge regression test
- `aaed0a9ff1f3a359e5a66987679c2137e9560d30` — action regression workflow 연결

## 완료판정 보류사항
- 최신 Pages 배포 `34800302959` 완료 확인 필요.
- 실제 브라우저에서 권위 실적파일 + 최종관리파일 업로드 후 `검증반영본 → 자동분석 → 분석후속조치본 → 메일 Preview` 전구간 실파일 E2E 확인 필요.
- 브라질 권위 `(4)(3)` 총괄파일은 8~9월 미래월 오염 18셀 때문에 7월 원천 기준 safe-reflect가 정상적으로 차단될 수 있음. 이를 보호로직 실패로 오판정하거나 강제 우회하지 않는다.
