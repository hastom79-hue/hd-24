# HD-24 안전 파이프라인 Gate + 메일/회신 이력조회 개발일지

일자: 2026-09-14 KST

## 사용자 확정 요구사항
- 파일 업로드 즉시 자동 구동.
- 안전반영 → 자동분석 → 분석/회신용 파일 추출 → 배포메일 Preview 준비 순서.
- Preview 확인 후 사용자가 `발송` 버튼을 눌러야 발송 단계로 진행.
- 인도/브라질은 영문 메일/회신양식.
- 회신파일 재업로드 시 KPI별 사유/근본원인/만회계획/Owner/완료예정일/차월목표/회신자 이력을 누적.
- 메일 준비시점, 실제 발송시점, 회신 수신시점, 회신차수까지 관리.
- 동일/유사 사유가 반복되는 KPI는 재발 관리대상으로 승격하여 다음 메일링에 자동 포함.
- 이력을 웹 화면에서 직접 조회할 수 있어야 함.

## 기술 위험 발견
기존 자동분석 패키지는 `btnJudge` 활성화만 보고 시작할 수 있었음. 그러나 `btnJudge`는 원본/총괄/매핑 준비만 끝나도 활성화될 수 있어, 실제 safe-reflect가 미래월 오염·매핑오류 등으로 FAIL한 파일에서도 분석/메일 단계가 먼저 시작될 가능성이 있었음.

이는 fail-closed 원칙 위반이므로 수정함.

## 수정 1 — safe pipeline gate
파일: `hd24-pipeline-gate.js`
커밋: `3c6592851b6402ae6ccc0ab9ea77b87749b86ecb`

동작:
- India/Brazil은 업로드 파일쌍 signature별로 안전반영 성공 여부를 별도 관리.
- 새 파일/사업장 변경 시 Gate RESET.
- safe runtime의 기존 `addHistory({action:'실적 반영', ...})` 성공 기록을 wrapper로 감지.
- 동일 파일쌍의 `실적 반영` 성공 기록이 실제 발생한 경우에만 `btnJudge`를 활성화하고 `hd24-safe-reflect-complete` 이벤트 발생.
- 안전반영 실패 시 성공 기록이 발생하지 않으므로 분석/파일추출/메일 Preview는 차단 상태 유지.
- Ulsan은 별도 원본 반영이 없는 기존 운영구조이므로 이 gate 적용 제외.

## 수정 2 — 메일/회신 Timeline 화면
파일: `hd24-history-view.js`
커밋: `598676c8fb9aa7314f05195a80d3b5e93d81b65e`

조회 컬럼:
- 사업장
- 대상월
- KPI
- 메일 준비시점
- 실제 발송시점
- 메일앱 열림시점
- 회신 수신시점
- 회신차수
- 회신자
- 재발여부/횟수
- 사유
- 근본원인
- 만회계획
- Owner
- 완료예정일
- 차월 회복목표

필터:
- 사업장
- 월
- KPI 검색
- 발송완료 / 메일앱 열림 / 회신수신 / 재발

중요 판정:
- `sentAt`은 인증된 메일 API가 성공 응답을 준 경우만 ‘실제 발송’으로 표시.
- mailto fallback은 `mailOpenedAt`으로 별도 표시하며 실제 발송으로 허위 기록하지 않음.

## 수정 3 — loader 연결
`hd24-ui-v3.js` 로딩 순서:
1. core v18
2. auto-run v19
3. pipeline-gate v21
4. followup v21
5. history-view v21

커밋: `85a1b94fa52e1942bdd9621fd92a4a8ee37134f9`

## 회귀테스트
파일: `tests/pipeline-gate.test.js`
커밋: `45d33f9b9dc8e26d93dc362fbfbb648a74922594`

검증조건:
- India: safe reflect 성공 전 분석 차단
- Brazil: 이전 파일쌍 성공상태를 새 파일쌍이 상속하지 않음
- India/Brazil: 동일 파일쌍 safe reflect 성공 후만 분석 허용
- Ulsan: source reflect gate 제외

로컬 Node 실행 결과:
- `PASS pipeline-gate fail-closed`
- `PASS kpi-followup-history`

## 현재 파이프라인
India/Brazil:
`원본 실적파일 + 총괄파일 업로드`
→ 자동 safe reflect
→ 전수 KPI/단위/월/과거무결성/미래월 오염 검증
→ safe reflect 성공 기록
→ Pipeline Gate PASS
→ 자동 목표대비/추세/재발 분석
→ 관리대상 추출
→ 영문 회신용 Excel 자동 다운로드
→ 배포메일 Preview 자동 준비
→ 사용자 Preview 확인
→ `발송` 클릭
→ 메일 API 성공 시 sentAt 저장 / mailto fallback이면 mailOpenedAt 저장
→ 회신 Excel 업로드
→ replyReceivedAt + replySequence + 회신내용 누적
→ 동일/유사 원인 반복 시 Repeated Issue로 다음 메일 대상 포함

## 잔여사항
- 최신 Gate/Timeline 코드의 GitHub Pages 배포 success를 확인해야 함.
- `index.html`의 outer loader query는 아직 `hd24-ui-v3.js?v=18`이라 브라우저 stale-cache 위험이 남아 있음. loader 내부 모듈은 v21이지만 outer loader 자체 캐시를 제거하기 위해 index 참조도 v21 이상으로 올리는 것이 필요함.
- 정적 Pages만으로 실제 단일버튼 메일 발송을 확정할 수 없음. 인증된 `HD24_MAIL_ENDPOINT` 연결이 필요함. endpoint가 없으면 `발송` 버튼은 회신용 Excel 다운로드 + 기본 메일앱 열기까지만 수행하며 실제 발송완료라고 기록하지 않음.
- 현재 메일/회신 이력은 브라우저 localStorage 기반. 여러 PC/사용자 공용 이력이 필요하면 중앙 DB 연동 필요.

## 완료판정
- safe-reflect 전 분석/메일 차단: 구현 + 로컬 PASS
- 자동분석/파일추출/Preview: 구현
- Preview-before-send: 구현
- 메일 준비/실제발송/메일앱열림/회신 시점 데이터 모델: 구현
- 동일사유 재발 관리: 구현 + 로컬 PASS
- 이력 조회 화면: 구현
- 실제 인증 메일 backend 연결: 미완료
- 중앙 공유형 DB 이력: 미완료
- 최신 Pages 실배포 확인: 후속 검증 필요
