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
- `index.html` CSS: `hd24-ui-v3.css?v=3`
- `index.html` UI JS: `hd24-ui-v3.js?v=15`
- `hd24-ui-v3.js` safe runtime: `safe-kpi-mapping.js?v=18`

즉 outer UI cache chain과 safe runtime cache-bust 버전이 불일치했음. 브라우저가 구버전 UI loader를 캐시하면 safe runtime readiness가 설치되지 않아 파일을 선택해도 `btnReflect`가 계속 disabled 상태로 남을 수 있는 구조였음.

## 수정 1 — production index cache chain 정렬
커밋: `752553e842ab460967f4340f7b74302881f99c6e`
메시지: `fix: align production cache chain to safe runtime v18`

변경:
- CSS `v=3` → `v=18`
- UI JS `v=15` → `v=18`
- safe runtime은 기존 `v=18` 유지

결과적으로 production chain을 `CSS v18 / UI JS v18 / Safe Runtime v18`로 정렬함.

비교검증 결과 index 기능 코드의 의도치 않은 대규모 변경은 없으며, 실질 동작 변경은 위 cache-bust reference 정렬임. 일부 주석만 제거됨.

## 수정 2 — runtime refresh helper 정렬
`refresh-runtime.html`도 확인 결과 여전히 CSS v3 / UI JS v15 / safe v18을 강제 reload하고 있었음.
이 상태에서는 refresh helper를 이용해도 다시 구버전 outer assets를 불러올 수 있으므로 수정.

커밋: `239b428bd88a1a5fb1c28d87299cfe0cc7968115`
메시지: `fix: align runtime refresh helper to v18`

변경 후:
- CSS v18
- UI JS v18
- Safe Runtime v18

## 실행검증
프로덕션 index commit 이후 자동 시작된 관련 workflow:
- Runtime Regression: run `34794092924`
- India Browser E2E: run `34794092920`
- Brazil Browser E2E: run `34794092904`
- Apply approved UI: run `34794092890`

모두 GitHub Actions hosted runner 계층의 기존 장애로 인해 정상 test step 실행이 되지 않는 상태가 지속됨. 이 실패는 application assertion 결과로 해석하지 않음.

## Pages 배포 검증 상태
- 수정 직전 커밋 `da307dd...`에 대한 Pages run `34793881478`은 success 확인.
- 신규 cache-chain 수정 커밋 `752553e...` 이후 Pages deployment가 생성/완료되는지 별도 확인 진행 중.
- 신규 커밋이 실제 Pages에 배포됐다는 증거가 확보되기 전에는 '웹에 수정 완료'로 선언하지 않음.

## 완료판정
- 코드 원인 수정: 완료
- refresh helper 수정: 완료
- 정적 기술검증: 완료
- GitHub Actions 자동 E2E: runner 장애로 미실행
- 신규 commit Pages live 배포 확인: 미완료
- 실제 사용자 브라우저에서 재업로드/구동 확인: 미완료
