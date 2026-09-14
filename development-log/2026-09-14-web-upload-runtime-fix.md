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
- 즉 readiness hotfix + hard-refresh helper까지 GitHub Pages 배포가 실제 성공한 증거 확보.
- 후속 mapping cache-bust URL 수정 `e254e69...`에 대해서도 Pages 재배포가 자동 시작되었으며 최종 완료 여부를 계속 추적함.

### Custom Actions runner
- 최신 Runtime Regression run `34796683905`의 job `103831036151` 확인 결과 `steps: []`, `runner_id: 0`, runner name 공란 상태로 종료됨.
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
- Pages 배포 확인: `ca024544...`까지 PASS, `e254e69...` 최종 배포 확인 진행
- GitHub Actions 자동 E2E: hosted runner 장애로 test step 미실행
- 실제 사용자 브라우저에서 두 파일 업로드 → 버튼 활성화 → 반영본 다운로드 E2E 확인: 미완료

따라서 현재는 코드/배포 계층의 핵심 수정은 반영되었으나, 실제 사용자 브라우저에서 파일 2개를 다시 올려 반영본 다운로드까지 성공하는 시점에 최종 완료로 판정한다.