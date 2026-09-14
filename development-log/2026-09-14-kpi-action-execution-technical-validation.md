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

## 실행검증
### 로컬 Node 실행
실행 결과:
- `PASS local execution`
- `PASS local technical edge cases`

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

## GitHub Actions 실행 상태
최신 관련 Runtime Regression run `34791873794` / job `103817493606` 확인.
결과: `completed / failure`, `steps=null`.
이번에도 workflow step 자체가 시작되지 않았으므로 애플리케이션 assertion 실패가 아니라 GitHub Actions runner/execution layer 장애로 분류.

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

신규 후속조치 모듈은 이 안전반영 성공 결과(`resolvedMappings`, `horizon`)를 입력으로 받도록 설계하여 안전반영 이전에는 실행하지 않는다.

## 남은 기술위험 / 미완료
1. 신규 classifier/workbook 모듈은 아직 production `index.html` / safe-reflect 성공 직후 런타임에 연결되지 않음.
2. GitHub Actions runner 장애 때문에 실제 browser E2E 자동실행은 불가.
3. `건/년`, `명/년`은 1차 fail-closed 처리했으나, 향후 KPI별 목표 의미(월목표/누적목표/연간목표)가 명시적으로 존재한다면 단위 추정 대신 해당 메타데이터를 우선 사용해야 함.
4. 실제 ExcelJS 브라우저 런타임으로 원본 파일을 열고 AN 열 생성 → 저장 → 재오픈 → formulas/styles/merges package integrity까지 검증하는 최종 통합검증이 남아 있음.
5. production cache chain CSS v3 / UI JS v15 / safe runtime v18 불일치도 별도 잔여 위험으로 유지됨.

## 완료판정
현재 판정: **신규 후속조치 분석모듈 단위/구조 기술검증 PASS, production 통합은 미완료.**
100% 완료로 선언하지 않는다.
