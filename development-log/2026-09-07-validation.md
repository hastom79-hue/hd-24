# HD-24 검증 개발일지 — 2026-09-07

> 기준 브랜치: `preview-safe-mapping`  
> 운영 원칙: Preview 검증 완료 및 사용자 승인 전 main 배포 금지.

## 1. 현재 기준 파일

- Canonical master: `총괄파일_인도7월반영_최종검증본 (4)(2).xlsx`
- India source: `## HCEI Module KPI 2026 _HQ recomendation Jul 26.(1).xlsx`
- Brazil source: `HCEB Module KPI 2026_31Aug2026(1).xlsx`

## 2. 전체 구조 전수검증

실파일 기준 구조 후보:

- India: 103 KPI/Actual 구조
- Brazil: 80 KPI/Actual 구조
- 총 183개

검증 결과:

- 원천 KPI명 중복: India 0 / Brazil 0
- 총괄 KPI명 중복: India 0 / Brazil 0
- `Actual행 = KPI label행 + 1` 구조 이상: 0
- 8월 Actual 오인식: 0
- 미래월 자동 삭제/변경: 금지 유지

## 3. Scale / Unit 전수검증

전체 183개 KPI에 대해 Jan~Jul 실데이터 범위를 이용해 Scale을 검증함.

- India: 103/103 확정
- Brazil: 80/80 확정
- 최종 수동확인 후보 2건 모두 해소

### India LTIR

- Source unit: 공란
- Jan~Jul: `0, 0, 0, 1.3, 0.4, 0.2, 0.2`
- Canonical master row 8과 직접 일치
- Scale ×1 확정

### Brazil LTIR

- Source unit: `%`
- Jan~Jul: `0, 2.2, 0, 2.0, 1.0, 0, 1.0`
- Canonical master row 7의 Jan~May 값과 직접 일치
- Scale ×1 확정
- Jun~Jul 공란은 backfill/current 검증 대상

## 4. v9 Runtime 보완 매핑 확인

Preview `safe-kpi-mapping.js`에서 다음 runtime supplement가 실제 존재함을 재확인함.

### India

- labelRow 94 / actualRow 95
- `Manufacturing Lead Time (Fab Tacking to FDI out)`
- masterRow 42
- Scale ×1

### Brazil

- labelRow 62 / actualRow 63
- `IQ 200 Issues with Production responsibility (Assembly)`
- masterRow 34
- Scale ×1

정적 mapping에는 누락되어 있으나 v9 runtime에서 보완됨.

## 5. Brazil NDT 처리

`Welding Process Defect Rate (NDT)`는 Brazil 정적 mapping 검색에서 직접 매핑 항목이 확인되지 않았음.

총괄 대상이 복합 공정불량 지표이므로 NDT 단독값 자동입력은 계속 BLOCK 처리한다.

## 6. v9 로직 재검증

Preview `safe-kpi-mapping.js`에서 다음을 확인함.

- `ABS_EPS=1e-6`, `REL_EPS=1e-6`
- KPI strict matching
- source/master 월헤더 12개월 검증
- unit family 검증
- Actual행 구조검증
- duplicate master row 차단
- duplicate KPI×month target 차단
- 과거 동일값 보존
- 과거 master 공란 + source 숫자 → backfill
- 과거 불일치 → master 보존 + 경고
- 과거 불일치 때문에 당월 반영 전체를 중단하지 않음
- source 공란/텍스트 → master 보존
- 미래월 미변경
- 패치 후 XML 셀 재검증

## 7. v9 회귀 테스트 실행

`HD24_v9_로직회귀_실행검증.xlsx` 생성.

실행한 대표 테스트:

1. 과거 동일값 보존 → PASS
2. 소수점 미세차이 허용 → PASS
3. 과거 불일치 기존값 보존 → PASS
4. 과거 공란 backfill → PASS
5. 당월 % Scale ×100 작성 → PASS
6. 당월 기존값 갱신 → PASS
7. 원천 공란 기존값 보존 → PASS
8. 원천 `Update` 텍스트 기존값 보존 → PASS
9. 미래월 변경 금지 → PASS
10. duplicate KPI×month target 차단 → PASS
11. Actual 바로 다음 행 구조 차단 → PASS

회귀 테스트 `FAIL` 검색 결과: 0건.

## 8. 확인된 현재 Preview 코드 상태

Preview v9 로직 자체는 `safe-kpi-mapping.js`에 존재함.

다만 UI loader `hd24-ui-v3.js`는 현재:

`safe-kpi-mapping.js?v=2`

로딩 중이므로 최종 브라우저 Preview 검증 전에 cache-bust를 v9 기준으로 변경해야 한다.

## 9. 남은 작업

- 전체 mapping 기준 실제 v9 Dry-run 결과 확정
- 생성본 재읽기 역검증
- 원천 → 출력 대상셀 100% 일치 확인
- 미래월 변경 0셀 확인
- Preview cache-bust 갱신
- 최종 Preview 사용자 승인
- 승인 후에만 main 배포
- GitHub Pages `completed / success` 확인 및 live smoke test

## 10. 현재 판정

- 핵심 안전로직: PASS
- 183개 KPI Scale 판정: PASS
- 구조 중복/행 밀림 위험: 현재 실파일 기준 0건
- 정적 mapping 누락 2건: v9 runtime supplement로 보완 확인
- Brazil NDT: BLOCK 유지
- 운영 main 변경: 없음

현재 단계는 최종 전체 Dry-run 및 출력 역검증 직전 상태이다.
