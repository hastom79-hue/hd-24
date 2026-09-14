# HD-24 메일/회신 상세 Timeline 개발·코딩 일지

일자: 2026-09-14 KST

## 사용자 연속 실행 요청
기존 KPI별 최신상태 표에 이어, 동일 KPI의 메일/회신 과정을 개별 이벤트로 펼쳐 볼 수 있도록 상세 Timeline을 추가했다.

## 구현
대상: `hd24-history-view.js`

추가 흐름:
- 1차 Preview/발송
- 1차 회신 수신
- 2차 Preview/발송 또는 독촉
- 2차 회신 수신
- 이후 차수도 동일 방식으로 누적

상세 Timeline 컬럼:
- 시점
- 사업장
- 대상월
- KPI
- 구분(메일/회신)
- 차수
- 상태
- 상세

메일 이벤트는 `preparedAt / sentAt / mailOpenedAt` 중 실제 상태에 맞는 시점을 사용하고, 실제 API 성공 발송과 단순 메일앱 열림을 구분한다. 회신 이벤트는 `replyReceivedAt`과 기존 `replySequence`를 사용한다.

기존 필터(사업장/월/KPI/상태)를 KPI 최신상태 표와 상세 Timeline에 동시에 적용한다.

## 안전 원칙
- `메일앱 열림`은 실제 발송으로 간주하지 않는다.
- `실제 발송`은 메일 API 성공 응답이 기록된 경우에만 표시한다.
- 기존 mail/reply localStorage 이력을 덮어쓰지 않고 읽기 전용 Timeline으로 표시한다.
- KPI/월/사업장 key를 유지해 서로 다른 KPI 이력이 섞이지 않게 한다.

## 변경 커밋
- `57f5666b559f650fab717fb63c47a91e9ba93a33` — `feat: add detailed mail reply event timeline`

## 실행/검증 상태
- GitHub main 반영 완료.
- 기존 KPI별 최신상태 표와 상세 이벤트 Timeline을 함께 렌더링하도록 코드 경로 연결 완료.
- GitHub Actions hosted runner는 기존과 동일하게 step 시작 전 실패하는 문제가 반복되어 자동 E2E 성공 판정은 별도 확인이 필요하다.
- Pages 배포 후 실제 브라우저 렌더링 및 기존 localStorage 이력 기반 차수 정렬을 계속 검증한다.

## 잔여 작업
- 최신 Pages 배포 상태 확인.
- 상세 Timeline 실제 브라우저 렌더링 확인.
- safe-reflect 성공 후 KPI action workbook 후처리 production 연결 및 authoritative Excel E2E는 별도 미완료 상태를 유지한다.
