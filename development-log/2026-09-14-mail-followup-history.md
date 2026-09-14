# HD-24 메일 미리보기·회신 이력·재발관리 개발일지

일자: 2026-09-14 KST

## 사용자 확정 요구사항
- 원본 실적파일 + 최종관리파일 업로드 후 시스템이 자동 구동되어야 함.
- 자동으로 KPI 분석을 실행하고 관리대상 지표를 추출해야 함.
- 분석/회신용 Excel 파일을 자동 추출해야 함.
- 배포메일은 자동발송하지 않고 Preview를 먼저 보여줘야 함.
- 사용자가 Preview 확인 후 `발송` 버튼을 눌러야 실제 발송 단계로 넘어가야 함.
- 인도/브라질 메일 및 회신양식은 영문 기준.
- 회신 Excel을 다시 업로드하면 KPI별 사유 이력을 누적 관리해야 함.
- 관리 필드: 미달/악화 사유, 근본원인, Recovery/Catch-up Plan, Action Owner, Planned Completion Date, Next-month Recovery Target, Responder.
- 메일 준비시점, 실제 발송시점, 회신 수신시점, 회신차수를 함께 이력관리해야 함.
- 동일/유사 근본원인으로 반복 회신된 KPI는 `Repeated Issue / Recurrence` 관리대상으로 승격하고 이후 메일링 대상에 자동 포함해야 함.
- 기존 회신 이력은 덮어쓰지 않고 누적해야 함.

## 구현
### 1. follow-up runtime 추가
파일: `hd24-followup.js`
초기 커밋: `8ebcfbc08be40fd6da5076c12669209f3b87a89a`
Loader 연결 커밋: `891a368a18ffa96fb1fa768b648535ff3b852aa1`
기능 보강 커밋: `57842ca2bdd750ba53b96f14faf861f9870c1b8c`

구현 내용:
- 기존 메일 초안 버튼 클릭을 capture 단계에서 가로채 즉시 mailto를 실행하지 않고 Preview 생성.
- Preview: To / Subject / Body / 회신용 Excel 다운로드 / 발송 버튼.
- `발송` 버튼 이전에는 발송되지 않도록 분리.
- 메일 API endpoint가 설정된 경우에만 웹에서 POST 발송을 시도하고 HTTP success 이후에만 `sentAt` 기록.
- endpoint가 없으면 회신용 Excel을 다운로드하고 기본 메일 앱을 열며, 이 경우 `mailOpenedAt`으로 구분 기록하고 실제 발송 완료라고 기록하지 않음.
- 영문 회신용 Excel 컬럼:
  - Plant
  - Target Month
  - KPI (KR)
  - KPI (EN)
  - Target
  - Actual
  - Status / Trend
  - Repeated Issue
  - Previous Reason / Root Cause
  - Previous Countermeasure
  - Last Mail Prepared At
  - Last Mail Sent At
  - Last Reply Received At
  - Reason for Miss / Deterioration
  - Root Cause
  - Recovery / Catch-up Plan
  - Action Owner
  - Planned Completion Date
  - Next-month Recovery Target
  - Responder
- 응답 입력 칸은 노란색으로 강조.

### 2. 자동 분석 패키지
- 원본 + 총괄 파일이 모두 준비되고 `btnJudge`가 활성화되면 자동으로 목표대비/추세 판정을 실행.
- 관리대상은 당월 미달, 연속 미달, 최근 악화, 재발 KPI를 포함.
- 자동분석 완료 후 관리대상용 `HDPS_KPI_Response_<Plant>_<Month>M.xlsx` 자동 다운로드.
- 동시에 메일 Preview 자동 준비.
- 동일 업로드 파일쌍 signature는 1회만 자동 처리하여 중복 다운로드 방지.

### 3. 메일/회신 Timeline
메일 이력(`hd24_kpi_mail_history_v2`):
- plant / targetMonth / KPI
- preparedAt
- sentAt (메일 API 실제 success 시)
- mailOpenedAt (mailto fallback 시)
- status

회신 이력(`hd24_kpi_reply_history_v2`):
- plant / targetMonth / KPI
- reason / rootCause / recoveryPlan
- actionOwner / plannedCompletionDate / nextMonthRecoveryTarget / responder
- replyReceivedAt
- replyFileName
- replySequence
- lastMailPreparedAt / lastMailSentAt / lastMailOpenedAt / lastMailStatus

### 4. 동일사유 재발 판정
- 단일 회신 1건만으로는 Recurrence 판정하지 않음.
- 같은 KPI에서 최소 2건 이상 회신 이력이 존재하고 최신 Root Cause/Reason과 과거 이력의 정규화 유사도가 0.6 이상이면 동일/유사 원인 반복으로 판정.
- `Repeated Issue xN` 태그 부여.
- 다음 분석 시 당월 실적이 달성 상태라도 recurrence 조건이 존재하면 관리대상 메일 추출 조건에 포함.
- 메일 본문에 이전 회신 수신일과 재발 횟수를 표시.

## 실행검증
로컬 Node 시뮬레이션 PASS:
- 회신 1건: recurrence=false
- 동일/유사 원인 2건: recurrence=true
- 서로 다른 원인 2건: recurrence=false
- 동일 KPI/월 회신차수: 1차 → 2차 정상 증가
출력: `PASS followup recurrence + reply sequence + timeline logic`

영구 테스트 추가:
- `tests/kpi-followup-history.test.js`
- 커밋: `f52b244f606d8d19e14a1652103c243612b616d6`

## 실패/재시도 이력
- `hd24-followup.js` 보강 저장 중 1회 GitHub SHA conflict(409) 발생.
- 최신 blob SHA를 재조회 후 동일 변경을 재적용하여 성공.
- 실패 이력 삭제하지 않음.

## 배포/잔여사항
- `891a368...` loader 연결본은 Pages run `34797840954`에서 success 확인.
- 이후 `57842ca...` 자동분석/Timeline 보강본은 새 Pages 배포 완료 여부를 별도 확인해야 함.
- Custom Runtime Regression / Browser E2E는 기존 hosted runner pre-step failure가 반복되어 코드 assertion 결과로 사용하지 않음.
- 현재 GitHub Pages는 정적 호스팅이므로 실제 웹 단일 버튼 발송을 확정하려면 `HD24_MAIL_ENDPOINT`에 인증된 메일 백엔드(Microsoft Graph/사내메일 API 등)가 필요함. endpoint 미설정 상태에서는 발송 버튼이 기본 메일 앱을 열며 실제 발송완료 시점은 웹에서 확인할 수 없음.
- 중앙 이력 영구저장도 현재는 브라우저 localStorage 기반. 여러 PC/사용자 간 이력 공유가 필요하면 백엔드 DB 연동 필요.

## 2026-09-14 추가 실행검증
- 현재 loader `hd24-ui-v3.js`는 `hd24-ui-v3-core.js?v=18`, `hd24-auto-run.js?v=19`, `hd24-pipeline-gate.js?v=21`, `hd24-followup.js?v=21`, `hd24-history-view.js?v=21`을 로드하도록 확인.
- 최신 Pages build/deployment run `34798477094`의 `build`, `deploy`, `report-build-status` 3개 job 모두 `completed/success` 확인. 최신 메일/회신 이력 및 pipeline gate 코드가 Pages 배포 단계까지 성공함.
- 같은 HEAD에서 Custom `Apply approved HD-24 UI` run `34798478058`은 job `103836134457`이 `failure`이나 `steps=null`.
- 같은 HEAD에서 Custom `HD24 Runtime Regression Gate` run `34798478036`은 job `103836134136`이 `failure`이나 `steps=null`.
- 따라서 위 두 실패는 테스트 assertion 실행 후 실패가 아니라 hosted runner가 workflow step을 시작하지 못한 기존 실행계층 문제로 분리 판정.
- Pages 배포 성공과 Custom runner pre-step failure를 혼동하지 않는다.

## 완료판정
- 메일 Preview-before-send: 구현
- 영문 회신파일 생성: 구현
- 회신파일 업로드/이력 누적: 구현
- 메일 준비/발송/회신 시점 데이터 구조: 구현
- 동일원인 반복 재발관리: 구현
- 자동분석 + 회신용 분석파일 자동 추출 + Preview 자동 준비: 구현
- 실제 웹 단일버튼 메일 발송: 메일 API backend 연결 전까지 미완료
- 중앙 공유형 이력관리: backend DB 연결 전까지 미완료
