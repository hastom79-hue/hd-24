# HD-24 웹 파일업로드 구동불가 — 실행/기술검증 일지

일자: 2026-09-14 KST

## 사용자 현상
- 브라질 원본 KPI 파일과 총괄파일을 웹에서 선택하면 파일명은 정상 표시됨.
- 그러나 파일 선택 이후 웹 처리 흐름이 진행되지 않는 현상 보고.
- 첨부 화면 기준 파일 input 자체는 정상 동작하므로, 업로드 파싱 이후 실행 준비상태/readiness 경로를 우선 점검함.

## 원인 추적
`index.html`의 `checkReady()`는 다음 조건이 모두 true일 때만 실적 반영 버튼을 활성화함.
- 원본 workbook 로드
- 총괄 workbook 로드
- JSZip 로드
- KPI mapping 로드
- `window.hd24SafeReflectReady === true`

프로덕션 asset cache chain 확인 결과:
- 초기 `index.html` CSS: `hd24-ui-v3.css?v=3`
- 초기 `index.html` UI JS: `hd24-ui-v3.js?v=15`
- `hd24-ui-v3.js` safe runtime: `safe-kpi-mapping.js?v=18`

즉 outer UI cache chain과 safe runtime cache-bust 버전이 불일치했음. 브라우저가 구버전 UI loader를 캐시하면 safe runtime readiness가 설치되지 않아 파일을 선택해도 `btnReflect`가 계속 disabled 상태로 남을 수 있는 구조였음.

추가 코드 추적에서 `plantSelect` 변경 경로가 `checkReady()`를 먼저 호출한 뒤 `await loadMapping()`을 수행하는 흐름이 존재하고, `loadMapping()` 완료 자체가 항상 즉시 `checkReady()`를 다시 호출하는 구조가 아니어서 비동기 mapping load 시 readiness race가 남아 있음을 확인함.

## 수정 1 — production index cache chain 정렬
커밋: `752553e842ab460967f4340f7b74302881f99c6e`
메시지: `fix: align production cache chain to safe runtime v18`

변경:
- CSS `v=3` → `v=18`
- UI JS `v=15` → `v=18`
- safe runtime은 기존 `v=18` 유지

결과적으로 production chain을 `CSS v18 / UI JS v18 / Safe Runtime v18`로 정렬함.

## 수정 2 — runtime refresh helper 정렬
초기 `refresh-runtime.html`도 CSS v3 / UI JS v15 / safe v18을 강제 reload하고 있어 v18로 정렬함.

커밋: `239b428bd88a1a5fb1c28d87299cfe0cc7968115`
메시지: `fix: align runtime refresh helper to v18`

## 수정 3 — 업로드/사업장 변경 후 mapping readiness 강제 재동기화
커밋: `b824e0ba3e990053afe0300acfc441cdd1cd7292`
메시지: `fix: force mapping readiness resync after file upload`

`hd24-ui-v3.js`에 다음 fail-safe 재동기화 경로를 추가함.
- `srcFile`, `masterFile`, `plantSelect` 변경 후 mapping을 다시 확인
- 가능한 경우 `await loadMapping()` 완료 후 `checkReady()` 실행
- 시작 시 250/700/1500/3000ms 단계별 readiness 재검증
- 성공/오류를 화면 로그에도 남기도록 함

목적은 파일 파싱 완료와 mapping JSON 비동기 로드 완료 시점이 엇갈려 `실적 반영` 버튼이 계속 disabled로 남는 레이스를 제거하는 것임.

## 수정 4 — 브라우저 캐시 강제 갱신 helper 강화
커밋: `ca02454430f81757662948f0cdac15aa355755e4`
메시지: `fix: hard refresh HD24 runtime assets after readiness hotfix`

`refresh-runtime.html`에서:
- CacheStorage 삭제
- CSS/UI JS/Safe Runtime/India mapping/Brazil mapping을 `cache:'reload'`로 재요청
- 완료 후 메인으로 timestamp query를 붙여 재진입하도록 구성함.

### 수정 4-1 — refresh helper cache-bust URL 오류 발견 및 즉시 보정
검증 중 mapping JSON에는 기존 query string이 없는데도 무조건 `&hotfix=`를 붙이는 오류를 발견함.
예: 잘못된 형태 `mapping_brazil.json&hotfix=...`

커밋: `e254e69ba5283df2ec85324557a56ce9056437ea`
메시지: `fix: correct mapping cache-bust URLs in runtime refresh`

보정:
- URL에 `?`가 있으면 `&hotfix=`
- URL에 `?`가 없으면 `?hotfix=`

따라서 mapping JSON도 정상 URL로 강제 재검증/재로딩 가능하도록 수정함.

## 실행검증
### GitHub Pages
- `ca02454430f81757662948f0cdac15aa355755e4`에 대한 Pages run `34796683508`은 `completed / success` 확인.
- 후속 mapping cache-bust URL 수정 `e254e69ba5283df2ec85324557a56ce9056437ea`에 대한 Pages run `34796826113`도 `completed / success` 확인.
- 따라서 readiness hotfix, hard-refresh helper, mapping cache-bust URL 보정까지 실제 GitHub Pages 배포 PASS가 확보됨.
- 현재 main HEAD `1d37c3bee232933ff65ab1d471168271d73577c2`는 위 앱 코드 `e254e69...`의 직계 후손이며 추가 변경은 개발로그 문서뿐임.

### Custom Actions runner
- Runtime Regression run `34796683905`의 job `103831036151` 확인 결과 `steps: []`, `runner_id: 0`, runner name 공란 상태로 종료됨.
- 따라서 해당 failure는 테스트 assertion 실패가 아니라 hosted runner가 실제 step을 시작하지 못한 기존 실행계층 장애로 판정함.
- Browser E2E / Apply approved UI도 동일 계층 장애가 반복되고 있어 application failure 증거로 사용하지 않음.

### 웹 주소 직접 조회 시도
- 외부 실행환경에서 추정 GitHub Pages URL 직접 HTTP 조회를 시도했으나 404가 반환됨.
- 저장소가 private이고 Pages 접근 정책/URL 노출 방식이 달라질 수 있으므로 이를 제품 장애의 직접 증거로 사용하지 않음.
- GitHub 내부 Pages workflow success를 배포 근거로 사용함.

## 개발 로그
- 캐시 버전 불일치 → 정렬
- 비동기 mapping readiness race → 강제 `loadMapping()` 후 `checkReady()` 재동기화
- 브라우저 stale cache → CacheStorage 삭제 + reload helper 강화
- helper 자체 mapping URL 오류 → 즉시 발견/수정
- 자동 E2E failure → job `steps: []` 확인으로 runner 계층 장애임을 재확인
- 개발로그 업데이트 중 1회 SHA conflict(HTTP 409) 발생 → 최신 파일 SHA 재조회 후 재시도 성공. 실패 이력 보존.
- `e254e69...` Pages 배포 run `34796826113` success 확인.

## 코딩 로그
- `index.html`: v18 cache chain 정렬
- `hd24-ui-v3.js`: 파일/사업장 change 및 startup readiness 재동기화 로직 추가
- `refresh-runtime.html`: CacheStorage purge + asset reload + timestamp redirect
- `refresh-runtime.html`: query separator(`?`/`&`) 동적 처리 보정
- `safe-kpi-mapping.js`: 기존 fail-closed 실행 경로 유지, 이번 수정에서 안전매핑 로직 자체는 변경하지 않음

## 완료판정
- 코드 원인 수정: 완료
- readiness race 완화/강제 재동기화: 완료
- refresh helper 강화: 완료
- refresh helper URL 오류 보정: 완료
- 최신 앱 코드 Pages 배포 확인: PASS (`e254e69...`, run `34796826113`)
- GitHub Actions 자동 E2E: hosted runner 장애로 test step 미실행
- 실제 사용자 브라우저에서 두 파일 업로드 → 버튼 활성화 → 반영본 다운로드 E2E 확인: 미완료

따라서 서버측 코드와 Pages 배포는 최신 앱 수정까지 검증 완료했다. 최종 완료 판정은 실제 사용자 브라우저에서 refresh-runtime 경유 후 원본/총괄 파일 업로드 → `실행 준비 재검증 PASS` → 실적 반영 버튼 활성화 → 검증반영본 다운로드까지 성공하는 시점으로 한다.

## 2026-09-14 긴급 복구 — 파일 업로드 즉시 자동실행
### 사용자 확정 동작
- 원본 실적파일 + 총괄파일이 모두 준비되는 순간 사용자가 별도 `실적 반영` 버튼을 누르지 않아도 시스템이 자동 구동되어야 함.
- 안전검증은 우회하지 않음. `hd24SafeReflectReady`, `data-safe-reflect-ready`, 파일 2종, 매핑/파싱 준비가 모두 완료된 시점에 기존 안전반영 버튼 click 경로를 자동 1회 호출함.

### 구현
커밋: `02db07e4cac27cbe9ec0e0f6a67a0b8303abf7c4`
메시지: `fix: auto-run safe reflect immediately after file upload`

- 기존 `hd24-ui-v3.js` 전체 로직은 동일 blob을 `hd24-ui-v3-core.js`로 보존함.
- `hd24-ui-v3.js`는 core(v18) + 신규 `hd24-auto-run.js?v=19`를 순서대로 로딩하는 경량 wrapper로 전환함.
- `hd24-auto-run.js` 추가:
  - 원본/총괄 파일 모두 선택 여부 확인
  - safe runtime true + 버튼 safe dataset + 버튼 enabled 확인
  - 업로드/사업장 변경/readiness 속성 변경을 감시
  - 0~10초 범위의 재시도 스케줄로 비동기 파싱/매핑 시차 흡수
  - 동일 파일쌍 signature는 자동 1회만 실행하여 중복 다운로드 방지
  - 준비 완료 즉시 `btnReflect.click()`을 호출하여 기존 fail-closed 안전반영 경로 실행

### 실행검증/실패 이력
- main에서 wrapper와 신규 auto-run 파일이 실제 존재하고 내용이 일치함을 재조회하여 확인함.
- 커밋 직후 Custom Browser E2E들은 기존 hosted runner 문제로 pre-step failure가 반복됨.
- 더 중요한 문제 발견: 커밋 `02db07e4...` 직후 조회한 최신 Pages run `34797299268`은 `head_sha=16ac819...`로, 새 자동실행 커밋을 아직 포함하지 않은 이전 배포본이었음.
- 즉 사용자가 당시 보고 있던 웹에는 신규 자동실행 코드가 배포되지 않은 상태였음. 이를 앱 정상으로 오판하지 않음.
- 본 개발로그를 일반 Contents API 커밋으로 다시 갱신하여 main 최신 트리를 대상으로 Pages 배포를 재트리거함. 이후 Pages의 `head_sha`가 이 문서 커밋(그리고 부모인 `02db07e4...`)을 포함하는지 확인 후 실제 배포 PASS 여부를 판정한다.

### 잔여위험
- `index.html`의 외부 UI 참조는 여전히 `hd24-ui-v3.js?v=18`이므로 브라우저 stale cache 가능성이 남아 있음. 새 Pages 배포 확인 후에도 실사용에서 old v18이 재사용되면 index cache key를 v19로 올리는 별도 수정이 필요함.
- 최종 완료 조건은 실제 사용자 환경에서 두 파일 선택 직후 자동으로 안전검증/반영 흐름이 시작되는 것임.