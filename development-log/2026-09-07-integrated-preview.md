# HD-24 Integrated Preview 작업일지 — 2026-09-07

## 목적
기존 `preview-safe-mapping` 브랜치가 main보다 1 commit 뒤처진 상태에서 단순 병합/덮어쓰기로 main 최신 변경을 유실하지 않도록, 현재 main을 기준으로 새로운 통합 Preview 브랜치를 구성했다.

## 확인된 main-only 변경
merge-base `71426686ad960d2aeba198c141c8bcc441725dae` 대비 main `91a109ef4259dbf27962dcaa41c029c4e80bdbaa`의 유일한 변경파일은 `hd24-ui-v3.js`였으며, 변경내용은 safe mapping loader의 cache query를 `v=2`에서 `v=8`로 변경한 것이었다.

## 새 통합 Preview 브랜치
- Branch: `preview-v9-integrated`
- Base: current `main`

따라서 main의 최신 UI/cache 변경을 먼저 보존한 상태에서 v9를 적용한다.

## v9 안전매핑 통합
`safe-kpi-mapping.js`를 검증 완료된 v9 내용으로 교체했다.

주요 포함사항:
- ABS_EPS=1e-6 / REL_EPS=1e-6
- strict KPI source/master 재탐색
- 12개월 월헤더 전수검증
- Actual=Label+1 구조검증
- 단위 family 검증
- 중복 master row / KPI×month target 차단
- India Manufacturing Lead Time runtime supplement
- Brazil IQ200 생산귀책 runtime supplement
- 과거월 master 값 불일치 시 기존값 보존 + 경고
- 과거월 공란 backfill
- 현재/latest Actual 월 반영 계속
- source 공란/텍스트 기존값 보존
- 미래월 미변경
- XML patch 후 대상셀 재검증

Commit:
- `508bd88b1e211ce85835e7f9c2a3dc33881fbb8f`

## Cache-bust 통합
main에서 보존한 `hd24-ui-v3.js` 전체 내용을 그대로 유지하면서 loader query만 `safe-kpi-mapping.js?v=8` → `safe-kpi-mapping.js?v=9`로 변경했다.

Commit:
- `cd5fa910ab45547e554a86fe20c0455bc9d94dea`

이로써 기존 Preview의 `v=2` stale cache 문제와 main의 `v=8` 변경 유실 위험을 동시에 제거했다.

## 현재 상태
- main: 변경 없음
- `preview-safe-mapping`: 기존 검증 브랜치, main과 diverged
- `preview-v9-integrated`: main 최신 상태 기반 + v9 safe mapping + v9 cache-bust 적용

## 다음 검증
1. integrated branch diff가 `safe-kpi-mapping.js`와 cache query 변경 외 불필요 변경이 없는지 검증
2. 실제 파일 기준 전체 mapping Dry-run
3. 생성 셀 재읽기/역검증
4. 미래월 0 변경, 타사업장 0 변경, 과거 기존값 강제덮어쓰기 0 확인
5. 사용자 Preview 승인 후에만 main 배포
