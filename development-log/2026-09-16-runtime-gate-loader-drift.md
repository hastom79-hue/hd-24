# HD-24 Runtime Regression Gate loader drift 개발일지

일자: 2026-09-16 KST

## 발견사항
최신 main `2c0a469270c7c2ce62cde72312c949fc63a84348`의 `HD24 Runtime Regression Gate` run `35070038172`가 실제 runner/checkout/setup 이후 `Validate production runtime invariants` 단계에서 실패했다. `steps=null` 실행계층 문제가 아니다.

실패 원인은 production runtime 자체가 아니라 회귀 gate의 고정 버전 assertion이었다. 실제 production loader는 `hd24-ui-v3-core.js?v=19`, `hd24-followup.js?v=30`인데 gate는 각각 v18/v29를 요구하여 `production loader missing hd24-ui-v3-core.js?v=18`로 실패했다. `refresh-runtime.html`은 실제 loader의 followup v30과 일치했다.

## 수정
`.github/workflows/hd24-runtime-regression.yml`의 runtime asset 검증을 고정 버전 목록에서 실제 `hd24-ui-v3.js` loader를 파싱하는 방식으로 변경했다. 따라서 앞으로 production loader 버전이 정당하게 변경되어도 gate가 stale version 자체 때문에 오탐하지 않으며, 파싱된 각 runtime asset이 refresh preload와 일치하는지는 계속 검증한다.

safe-reflect 핵심 invariant(미래월 Actual, 직전월 원천↔총괄 anchor, 수식셀, 중복 KPI×월, 단위, 반영 후 셀 재검증, mapping 76건/중복 방지) 검증은 유지했다. production runtime/cache 버전은 변경하지 않았다.

## 코딩일지
- 수정 파일: `.github/workflows/hd24-runtime-regression.yml`
- production JS/CSS: 변경 없음
- production loader/refresh: 이미 core v19 / followup v30 정합 상태이므로 변경 없음
- 수정 commit: `743d1008982a10163eebc121df266f1d4c548a4a`
- 후속 Actions/Pages는 본 로그 commit 이후 상태를 별도 확인한다.
