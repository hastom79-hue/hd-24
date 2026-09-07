# HD-24 최종 Preview 직전 검증 — 2026-09-07

## 기준 브랜치
- `preview-v9-integrated`
- main 기준: `91a109ef4259dbf27962dcaa41c029c4e80bdbaa`

## 브랜치 상태 검증
`main` 대비 `preview-v9-integrated` 비교 결과:
- status: ahead
- ahead_by: 3
- behind_by: 0
- merge base = current main commit

즉 기존 `preview-safe-mapping`의 diverged 상태를 해소했고, 현재 통합 Preview는 main 최신 상태를 기반으로 한다.

변경 파일은 3개로 제한됨:
1. `safe-kpi-mapping.js` — v9 안전반영 로직
2. `hd24-ui-v3.js` — cache-bust `v=9`
3. 본 통합 Preview 관련 개발일지

## Loader 검증
`preview-v9-integrated/hd24-ui-v3.js` 첫 줄을 재확인:

```js
(()=>{const s=document.createElement('script');s.src='./safe-kpi-mapping.js?v=9';s.defer=true;document.head.appendChild(s)})();
```

따라서 브라우저에서 v8 캐시를 재사용하는 위험을 제거하였다.

## v9 로직 검증 상태
확인 완료:
- KPI strict matching
- source/master 12개월 헤더 검증
- Actual행 = label행 + 1 구조 검증
- unit family 검증
- duplicate master row 차단
- duplicate KPI×month target 차단
- 과거 동일값 보존
- 과거 불일치 master 보존 + 경고
- 과거 공란 backfill
- 현재/latest month 반영
- source blank/text 기존값 보존
- 미래월 미변경
- post-write XML target 셀 재검증
- `ABS_EPS=1e-6`, `REL_EPS=1e-6`

## 실파일 전수검증 누적 결과
- India 103 KPI 구조
- Brazil 80 KPI 구조
- 전체 183 KPI
- Scale 판정 183/183 완료
- KPI명 중복 0
- Actual행 구조 이상 0
- 8월 Actual 오인식 0
- 정적 mapping 누락 2건은 runtime supplement로 보완
- Brazil NDT 단독 자동반영은 BLOCK 유지

## 회귀검증
v9 처리규칙 회귀 테스트 FAIL 0건.
검증 항목에는 과거 동일값, 미세오차 허용, 과거 불일치 보호, backfill, 당월 작성, source 공란/텍스트 보존, 미래월 미변경, duplicate target 차단이 포함됨.

## 남은 최종 단계
1. 실제 전체 mapping Dry-run 결과 확정
2. 생성 대상셀 전수 역검증
3. Preview 사용자 검수
4. 승인 후에만 main 반영
5. GitHub Pages completed/success 확인 및 live smoke test

## 현재 판정
통합 Preview 브랜치 구조: PASS
main 기준 동기화: PASS
cache-bust v9: PASS
핵심 안전로직: PASS
운영 main 변경: 없음
