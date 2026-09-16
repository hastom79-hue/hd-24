# 2026-09-17 Brazil Browser E2E future-month assertion repair

## 발견
Brazil Browser E2E run 35094894831은 steps=null 실행계층 실패가 아니었다. Runner/checkout/dependency/fixture/server 단계는 성공했고 실제 E2E 단계에서 assertion이 실패했다.

Production safe-reflect는 오염된 미래월 셀(AH5=999)을 정상 검출하여 `총괄 미래월 기존값 1셀 감지` 및 `오류: 총괄 미래월 기존값 1셀 감지. 총괄파일 생성 중단`으로 fail-closed 했다. 다운로드도 발생하지 않았다. 그러나 E2E는 과거 문구 `미래월 Actual`을 하드코딩하여 정상 차단을 실패로 판정했다.

## 조치
`.github/workflows/hd24-browser-e2e-brazil.yml`의 negative assertion을 현재 production 계약인 `총괄 미래월 기존값` + `총괄파일 생성 중단` 동시 확인으로 정렬했다. blocked case의 no-download assertion은 유지했다.

## Production 영향
애플리케이션 runtime 결함이 아니므로 production loader/refresh/cache version은 변경하지 않았다. 추정성 버전 상승을 금지한다.

## 검증 기준
Workflow 자체 변경이므로 push-triggered Brazil Browser E2E가 실행 가능한 회귀검증이다. 성공 시 contaminated future-month fail-closed + clean July reflect/download + Aug-Dec untouched workbook boundary를 모두 확인한다.
