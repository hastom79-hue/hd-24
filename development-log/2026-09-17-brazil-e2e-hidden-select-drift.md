# HD-24 Brazil Browser E2E hidden-select drift 개발/코딩일지

일자: 2026-09-17 KST

## 발견사항
main `1847a6d16038feb05771f749751be4c499334e34`의 `HD24 Brazil Browser E2E` run `35214746346`은 `steps=null` 실행계층 실패가 아니다. runner/checkout/Python/fixture/server 단계가 정상 완료된 뒤 실제 Browser E2E 단계에서 실패했다.

실패 원인은 production의 사업장 선택 UI가 카드형으로 전환되면서 native `#plantSelect`가 `display:none`이 되었는데 Brazil E2E가 계속 `locator('#plantSelect').select_option('brazil')`을 호출한 stale UI fixture였다. Playwright는 hidden select의 actionability를 기다리다 30초 timeout으로 종료했다.

## 수정
`.github/workflows/hd24-browser-e2e-brazil.yml`의 negative/clean 두 브라우저 경로 모두 실제 production UI인 `.hd24-plant-card[data-plant="brazil"]` 클릭으로 변경했다.

Production safe-reflect/runtime/loader/refresh/cache에는 결함이 확인되지 않았으므로 변경하거나 버전을 올리지 않았다. 미래월 fail-closed, 다운로드 0건, 77 KPI mapping, July 반영, Aug-Dec untouched, 타 사업장/과거값/수식셀 mutation 0건 검증은 그대로 유지했다.

## 회귀검증
수정 commit: `bc21b69d1001ba409ecf50525c66cd19106f417d`
새 Brazil Browser E2E run: `35222466588`.
작성 시점 runner/checkout/Python setup은 success이고 dependency 설치 이후 실제 브라우저 검증 진행 중이다. 완료 전 SUCCESS로 판정하지 않는다.

## 코딩일지
- 수정 파일: `.github/workflows/hd24-browser-e2e-brazil.yml`
- 변경 범위: hidden native select 직접 조작 2곳 → visible production plant card 클릭 2곳
- production JS/CSS: 변경 없음
- production loader/refresh: 변경 없음
- cache/version bump: 없음
- 이유: 애플리케이션 결함이 아니라 E2E와 production UI 간 stale interaction 계약 결함이므로 최소 변경 원칙 적용
