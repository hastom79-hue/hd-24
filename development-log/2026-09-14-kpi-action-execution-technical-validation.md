# HD-24 KPI 후속조치 기능 — 실행검증 + 기술검증 일지

일자: 2026-09-14 KST

## 검증 범위
- `kpi-action-classifier.js`
- `kpi-action-workbook.js`
- `tests/kpi-action-classifier.test.js`
- `tests/kpi-action-workbook.test.js`
- 실제 최종관리파일 구조: `총괄파일_인도7월반영_최종검증본 (4)` 계열의 인도/브라질 보고용 시트
- 기존 `safe-kpi-mapping.js` fail-closed 안전반영 로직과의 결합 위험

## 실제 파일 구조 검증
인도/브라질 보고용 시트 공통 확인:
- 4행이 헤더
- `L4:M4` 병합: `표준 성과지표(KPIs)`
- 실제 KPI명 데이터: M열
- Y열: 목표
- Z열: 단위
- AA:AL: 1월~12월
- AM1: 기존 계산식 `=25/Q1`
- AN: 실제 데이터 공란
- 시트 max column은 서식/잔존 영역 때문에 AS까지 확장되어 있음

## 기술검증 중 발견 결함과 조치
### 1. KPI명 열 오인 위험 — 수정 완료
초기 후처리 코드는 병합헤더의 좌측 L열을 KPI열로 오인할 수 있었음.
실제 KPI명은 M열이므로 안전매핑 결과의 `masterRow + kpiKr`를 이용해 후보열을 재검증하고 실제 KPI명 열을 결정하도록 수정.
KPI명 문자열이 매핑명과 불일치하면 후속조치 생성을 중단하도록 fail-closed 적용.

관련 커밋:
- `19f2fe6e1a6fadf2a91a4a1d8b3e3da4ffdc229b` — real workbook layout hardening

### 2. 신규 열이 AT 등에 잘못 생성될 위험 — 수정 완료
초기 코드는 `worksheet.columnCount + 1`을 사용하므로 실제 시트의 max column이 AS인 경우 AT에 생성될 수 있었음.
수정 후 12월 열(AL) 다음부터 실제 데이터 존재 여부를 검사하고, AM의 기존 수식을 보존한 채 첫 완전 공란 열인 AN을 선택.

### 3. 재실행 시 열 중복생성 및 담당자 입력 덮어쓰기 위험 — 수정 완료
기존 `미달사유 / 만회계획` 헤더가 있으면 같은 열을 재사용.
담당자가 이미 입력한 셀 내용이 있으면 자동 프롬프트로 덮어쓰지 않음.
즉 월간 반복 실행 시 멱등성을 보장하도록 수정.

관련 테스트 커밋:
- `33f49a0e824019d902ef23bbb5353459957519dc` — merged header / AN / idempotency / manual preservation test

### 4. 당월 실적 공란 시 직전월 값을 당월 실적으로 오인할 위험 — 수정 완료
초기 classifier는 최신 non-null 값을 actual로 사용했기 때문에 당월이 비어 있어도 직전월 값으로 목표미달을 판정할 수 있었음.
수정 후 actual은 반드시 horizon의 현재월 셀만 사용.
현재월 값이 공란이면:
- `hasCurrentActual=false`
- 당월 목표미달 판정 금지
- 현재월 기준 악화 streak 판정 금지

관련 커밋:
- `4c07fed6f621227986dc6d6b98124c04a269d40d`
- `932a6ccac6600013c4bd43b47172ac50c13cf4d5`

### 5. 연간 목표를 월 실적과 직접 비교하는 허위 미달 위험 — 수정 완료(1차 fail-closed)
실제 관리파일에는 `건/년`, `명/년` 등 연간 목표 KPI가 존재함.
예: 연간 420건 목표를 7월 단월 40건과 비교하면 허위 목표미달이 발생함.
따라서 `/년`, `per year`, `/year`, `yearly` 단위는 현재 월 목표와 직접 비교하지 않도록 `targetComparable=false` 처리.
이 경우 추세분석은 유지하지만 당월 목표미달 판정은 하지 않음.

관련 커밋:
- `15a5841edadd4d41051b06b442c35bbe21ab6079`
- `5b1a8b93a3bd5be0ca71dc430b341e98e7eaf795`

### 6. 기존 KPI 배경색 훼손 및 정상회복 후 경고색 잔존 위험 — 수정 완료
실제 기준파일의 KPI명 셀에는 노랑/주황 fill이 이미 기존 관리 의미로 사용되고 있음을 확인.
신규 경고 fill로 덮어쓰면 원본 의미가 훼손되므로 다음과 같이 변경:
- KPI 기존 fill은 절대 변경하지 않음
- 이상 KPI는 글자색 + bold만 사용
- 정상/개선으로 회복되면 HD-24가 관리한 경고 글자속성을 theme-1 / non-bold로 복원
- 기존 담당자 미달사유/만회계획 이력은 정상회복 후에도 보존

관련 커밋:
- `387273ad9386afa34c6c756e162a3f5b77e37da5`
- `e9bcc6b6f9be4d4de4d66d2102545be5c3bca71a`

## 실행검증
### 로컬 Node 실행
실행 결과:
- `PASS kpi-action-workbook: real layout, AN selection, existing fills preserved, stale status reset, annual-target fail-closed, idempotency, manual text preservation`
- `PASS classifier edge cases: blank current, annual-target fail-closed, trend retained, lower-is-better`

검증 항목:
- 상향지표 목표미달
- 하향지표 목표미달
- 3개월 지속악화
- 6개월 장기 지속악화
- 일시적 악화
- 복합판정
- 병합 KPI 헤더 상황에서 M열 KPI명 선택
- AM 기존 계산식 보존 후 AN 신규 열 선택
- 재실행 시 AN 재사용
- 담당자 수기입력 보존
- 현재월 공란 시 stale prior month 오인 방지
- 연간단위 KPI 월목표 허위미달 차단
- 기존 KPI fill 보존
- 정상회복 시 stale warning font 제거

## 실제 기준파일 `(4)(3)` 추가 전수검증
사용자 지정 기준파일 `총괄파일_인도7월반영_최종검증본 (4)(3).xlsx`를 직접 재검증함.

### 인도 보고용 시트
- 1~7월 데이터 존재
- 8~12월 KPI 실적은 확인 범위에서 비어 있음
- 구조상 KPI명 M / 목표 Y / 단위 Z / 월 AA:AL 확인

### 브라질 보고용 시트 — 미래월/열밀림 오염 발견
8~9월에 숫자값이 남아 있는 KPI를 전수 추출한 결과 총 **18셀(9개 KPI × 8월/9월)** 발견.

대상 KPI와 값:
- 라인품질비가동(부품): 8월 415 / 9월 519
- 완제품 시운전 불량율: 8월 1306 / 9월 1203
- 완제품 입고검사 불량율: 8월 293 / 9월 412
- IQ(부품귀책): 8월 1335 / 9월 1381
- WQ(부품귀책): 8월 2436 / 9월 2011
- 표준 준수율: 8월 1170 / 9월 1239
- 제조 리드타임(Fab Tacking to FDI out): 8월 58 / 9월 66
- 부품재고 회전율: 8월 528 / 9월 520
- 출하 리드타임: 8월 15 / 9월 13

이는 기존 대화에서 반복 제기된 브라질 지표 열밀림 위험과 일치하는 패턴임.

### 이후 보정본과 비교검증
비교용으로 `총괄파일_인도7월_브라질6_7월반영_실파일최종보정_v16검증본.xlsx`를 확인함.
주의: 이 파일은 비교증거로만 사용하며 사용자 지정 기준파일 `(4)(3)`을 임의 대체하지 않음.

보정본에서는 위 8~9월 잔존값이 제거되고 일부 KPI의 6~7월 값으로 정상화된 흔적 확인:
- 완제품 시운전 불량율: 6월 256 / 7월 242
- 완제품 입고검사 불량율: 6월 2187 / 7월 2083
- 제조 리드타임: 6월 14.68 / 7월 55.1
- 부품재고 회전율: 6월 4.5 / 7월 4.3
- 출하 리드타임: 6월 1 / 7월 0

## 기존 safe-reflect와의 기술적 정합성
기존 안전반영 원칙은 유지:
- KPI 전수검증
- KPI/단위 검증
- 월 헤더 12개월 동적검증
- 미래월 Actual 오염 차단
- 직전월 원천↔총괄 불일치 차단
- 과거 drift 보존
- 중복 KPI×월 쓰기 차단
- 수식셀 쓰기 차단
- 반영 후 값 재검증

`safe-kpi-mapping.js`의 `masterFutureContamination(masterWs, masterInfo, horizon)`는 기준월 이후 숫자 셀을 전수 검사하고 존재 시 총괄파일 생성을 중단한다.
따라서 브라질 원천 기준월이 7월이라면 `(4)(3)`의 위 18개 8~9월 숫자 셀은 안전반영 전에 반드시 차단되어야 함.
신규 KPI action 후처리는 반드시 safe-reflect 성공 이후에만 실행해야 한다.
현재 신규 action 모듈은 production safe-reflect 경로에 아직 연결하지 않았으므로 오염된 기준파일에 action 열이 먼저 생성되는 production 경로는 아직 없음.

## 영구 회귀게이트
신규 workflow:
- `.github/workflows/hd24-kpi-action-regression.yml`

검증 항목:
- Node syntax check
- classifier regression
- workbook post-process regression
- 병합헤더 / M열 KPI
- AN 선택
- 기존 fill 보존
- 정상회복 시 stale warning 제거
- 연간목표 fail-closed
- 수기 action 보존

관련 커밋:
- `517c5fcc4ff8193ddff23784b13859b7c822ff7e`

### GitHub Actions 실행 결과
- Run: `34793822837`
- Job: `103822962973`
- 결과: `completed / failure`
- `steps=[]`
- `runner_id=0`
- `runner_name=''`
- 판정: workflow step 자체가 시작되지 않은 기존 GitHub hosted runner/execution-layer 장애 재확인. 애플리케이션 assertion 실패가 아님.

## 남은 기술위험 / 미완료
1. 신규 classifier/workbook 모듈은 아직 production `index.html` / safe-reflect 성공 직후 런타임에 연결되지 않음.
2. GitHub Actions runner 장애 때문에 실제 browser E2E 자동실행은 불가.
3. `건/년`, `명/년`은 1차 fail-closed 처리했으나, 향후 KPI별 목표 의미(월목표/누적목표/연간목표)가 명시적으로 존재한다면 단위 추정 대신 해당 메타데이터를 우선 사용해야 함.
4. 실제 ExcelJS 브라우저 런타임으로 원본 파일을 열고 AN 열 생성 → 저장 → 재오픈 → formulas/styles/merges package integrity까지 검증하는 최종 통합검증이 남아 있음.
5. production cache chain CSS v3 / UI JS v15 / safe runtime v18 불일치도 별도 잔여 위험으로 유지됨.
6. 사용자 지정 `(4)(3)` 기준파일 자체에 브라질 미래월/열밀림 오염 18셀이 있으므로 원천파일과 결합 시 fail-closed 확인이 필수임.

## 완료판정
현재 판정: **신규 후속조치 분석모듈 단위/구조 기술검증 PASS. 실제 기준파일에서 브라질 열밀림 오염을 추가 검출했고 기존 safe-reflect가 이를 차단해야 하는 조건도 확인. production 통합은 미완료.**
100% 완료로 선언하지 않는다.
