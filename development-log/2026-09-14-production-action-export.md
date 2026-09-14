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

## 2026-09-14 12:02 KST 추가 실행검증
### v23 최종 Pages 배포
- release marker commit: `98dd29fb09560903fbcaf8d45b4665791526911c`.
- Pages run `34800998801` 검증 결과:
  - build: `completed / success`
  - deploy: `completed / success`
  - report-build-status: `completed / success`
- 따라서 v23 release marker까지 포함된 Pages 서버측 배포는 PASS로 확정.
- `runtime-release.json`에서 classifier / workbook postprocessor / action export / follow-up / history가 모두 v23으로 선언된 것을 재확인.

### 권위 실파일 재확보 / 구조 Preflight
Library에서 다음 실제 파일을 다시 찾아 작업 컨테이너에 materialize:
- 권위 총괄: `총괄파일_인도7월반영_최종검증본 (4)(3).xlsx`
- 인도 원천: `## HCEI Module KPI 2026 _HQ recomendation Jul 26.(1).xlsx`
- 브라질 원천: `HCEB Module KPI 2026_31Aug2026(1).xlsx`

구조검증:
- 권위 총괄에 `인도법인 KPI(26년 보고용)` / `브라질법인 KPI(26년 보고용)` 시트 존재 PASS.
- 인도 원천에 `Final With HQ Suggestion` 시트 존재 PASS.
- 브라질 원천에 `HCEB KPIs` 시트 존재 PASS.
- 세 파일 모두 OOXML ZIP 무결성 확인. 브라질 원천은 ZIP 자체 오류 없음.

### 브라질 권위 총괄 미래월 오염 재검증
브라질 보고용 시트에서 기준월 7월 이후 8~9월에 기존 숫자 18셀이 존재함을 재확인:
- row 41: AH=415, AI=519
- row 42: AH=1306, AI=1203
- row 43: AH=293, AI=412
- row 44: AH=1335, AI=1381
- row 45: AH=2436, AI=2011
- row 46: AH=1170, AI=1239
- row 47: AH=58, AI=66
- row 48: AH=528, AI=520
- row 49: AH=15, AI=13
- 즉 `(4)(3)` + 브라질 7월 원천 조합은 현재 safe runtime의 `masterFutureContamination()`에 의해 차단되는 것이 정상 동작임.
- 이를 우회하거나 자동 삭제하지 않음.

### 추가 검증 도구 이슈
- `artifact_tool`로 권위 총괄 및 인도 원천은 workbook/sheet 구조 import 확인 가능.
- 브라질 원천은 `artifact_tool` import 시 `Format_InvalidStringWithValue` 오류가 발생했으나, ZIP 무결성 및 workbook.xml의 `HCEB KPIs` 시트 존재는 정상 확인됨.
- 이 오류는 ChatGPT 검증 도구의 parser 호환성 이슈로 기록하며, HD-24 브라우저의 SheetJS/ExcelJS 파싱 실패와 동일하다고 단정하지 않음.

### 현재 완료판정
- 코드 연결: PASS
- v23 캐시체인: PASS
- Pages 서버 배포: PASS
- 권위 실파일/원천 구조 preflight: PASS
- 브라질 `(4)(3)` 미래월 fail-closed 예상차단: PASS
- 실제 사용자 브라우저의 파일선택 이벤트부터 분석후속조치본/메일 Preview까지 실파일 E2E: 아직 사용자 브라우저에서 최종 확인 필요

## 2026-09-14 12:05 KST 계속 실행검증
### 최신 HEAD Pages 재검증
- HEAD `8626153a29b8ae3c38a16d04b2183537a9cf1b9a`에 대해 Pages run `34801350161` 생성 확인.
- build / deploy / report-build-status 모두 `completed / success` 확인.
- 따라서 직전 검증일지 반영분까지 포함된 서버측 배포도 PASS.

### Custom Actions 실행계층 재확인
- Runtime Regression run `34801350878`: job `regression`, `completed / failure`, `steps=null`.
- Apply approved UI run `34801350894`: job `apply`, `completed / failure`, `steps=null`.
- 두 실패 모두 테스트 step 자체가 시작되지 않은 동일 hosted runner pre-step 장애 패턴.
- 따라서 앱 assertion 실패나 UI 적용 실패로 오판정하지 않음.

### 자동분석 → 메일 Preview Gate 코드 교차검증
- `hd24-pipeline-gate.js`는 인도/브라질에서 새 파일쌍 선택 시 `btnJudge`를 강제 disabled로 유지하고, `addHistory(entry.action==='실적 반영')` 성공 기록이 발생한 동일 signature에 대해서만 `hd24SafeReflectSuccessSignature`를 설정하고 `btnJudge`를 활성화함.
- `hd24-followup.js`의 `tryAutoPackage()`는 `btnJudge.disabled`이면 즉시 return하므로, 안전반영 성공 전에는 자동분석/회신파일/메일 Preview 패키지가 시작되지 않음.
- 안전반영 성공 후에는 분석 실행 → 관리대상 추출 → 영문 회신용 Excel 생성/다운로드 → Mail Preview 준비 순서로 진행.
- 발송 버튼은 Preview 이후에만 사용 가능하며, API 연결 시 성공 응답에서 `sentAt`, API 미연결 시 `mailOpenedAt`을 별도 기록하여 실제 발송과 메일앱 열림을 구분함.

### 인도 실파일 수치 교차검증 샘플
권위 총괄 `인도법인 KPI(26년 보고용)`과 원천 `Final With HQ Suggestion` 7월 값을 대조:
- SQDC 목표달성팀 비율: 원천 0.91 → 총괄 91 (percent scale 적용 일치)
- Cost KPI 달성율: 원천 0.84 → 총괄 84 (percent scale 적용 일치)
- 대당 비가동 MH: 원천 3.11 → 총괄 3.11 일치
- 생산이슈 재발율: 원천 0.11 → 총괄 11 (percent scale 적용 일치)
- 생산지시 준수율: 원천 0.63 → 총괄 63 (percent scale 적용 일치)
- 대당 펜딩이슈 조치 리드타임: 원천 0.15 → 총괄 0.15 일치
- 샘플 기준 행/월 밀림이나 percent scale 역전 없음.

### 브라질 원천 파일 구조 재검증
- `HCEB Module KPI 2026_31Aug2026(1).xlsx`의 `xl/workbook.xml` 시트 목록을 직접 확인.
- `HCEB KPIs` 시트가 실제 존재하며 workbook ZIP 무결성도 PASS.
- artifact_tool parser 오류와 파일 구조 손상을 분리 판정함.

### 미완료/잔여 검증
- 사용자 브라우저에서 실제 파일선택 이벤트를 발생시켜 `검증반영본 → 자동분석 → _분석후속조치본.xlsx → 회신용 Excel → 메일 Preview`의 실제 다운로드/화면 결과를 보는 최종 UI E2E는 이 환경에서 직접 클릭할 수 없어 아직 PASS 선언하지 않음.
- 브라질 `(4)(3)`는 미래월 오염 때문에 safe-reflect 차단이 정상이며, 성공경로 E2E 대상으로 사용하지 않음.
