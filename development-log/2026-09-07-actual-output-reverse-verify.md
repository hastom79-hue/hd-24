# HD-24 실제 출력본 생성 및 역검증 — 2026-09-07

기준 브랜치: `preview-v9-integrated`
운영 원칙: 사용자 승인 전 main 배포 금지.

## 검증 목적

Canonical master `총괄파일_인도7월반영_최종검증본 (4)(2).xlsx`를 직접 수정하지 않고 별도 검증본을 생성하여, v9 처리 규칙에 따라 실제 셀 쓰기 후 재읽기 역검증을 수행했다.

검증 범위는 실파일 기준 QA/VSM 핵심 31개 KPI이며 India/Brazil 양 사업장을 포함한다.

## 실제 반영 결과

- 실제 쓰기 대상: 34셀
  - 7월 current write 29셀
  - 과거 master 공란 backfill 5셀
- 반영 직후 셀 검증 실패: 0건
- 생성 파일 재읽기 후 기대값 역검증 실패: 0건
- 8~12월 미래월 변경: 0건
- canonical master 직접 수정: 0건
- 과거 불일치 numeric cell은 v9 규칙대로 기존 master를 보존했고 자동 덮어쓰지 않았다.

## 생성 검증파일

- `HD24_v9_핵심QA_VSM_실제반영_검증본.xlsx`
- `HD24_v9_실제출력_반영후_역검증보고서.xlsx`

## Artifact Tool 경고

Canonical workbook import/export 과정에서 일부 `[76]...` 관리 시트에 `required sheetId` 경고가 출력되었다. 다만 검증 대상인 `인도법인 KPI(26년 보고용)` 및 `브라질법인 KPI(26년 보고용)`의 실제 쓰기/재읽기 검증은 정상 완료되었고, 검증보고서의 FAIL 검색은 0건이었다.

이 경고는 최종 운영 배포 전 별도 구조 리스크로 계속 추적한다. 사용자 승인 전 main 배포는 하지 않는다.
