# HD-24 KPI Action Regression loader drift 개발일지

일자: 2026-09-23 KST

## 발견
최신 main `ec089639a0510b74c4a17dfad88cca5ad23228c5`의 `HD24 KPI Action Regression` run `35301855047`이 failure였다. `steps=null` 실행계층 실패가 아니며 runner/checkout/setup-node는 정상, 실제 `Validate classifier, workbook post-processing, and production export bridge` 단계에서 실패했다.

실패 원인은 production 결함이 아니라 `tests/kpi-action-export.test.js`의 stale wiring assertion이었다. 테스트가 이미 production loader에서 의도적으로 제거된 legacy `kpi-action-classifier.js?v=23`, `kpi-action-workbook.js?v=23`, `hd24-action-export.js?v=27`, `hd24-action-cycle-guard.js?v=1`, watchdog/followup-sync 체인의 존재를 계속 요구했다. 현재 production은 `auto-run → pipeline-gate → followup → direct-reply-guard → reply-import-dedupe → history` 단일 체인이다. legacy 체인을 loader에 재삽입하면 오히려 중복 실행/race 위험이 생긴다.

## 조치
production runtime은 변경하지 않고 회귀테스트만 현재 production wiring에 맞게 수정했다. legacy action-export 계열 소스 자체의 fail-closed invariant 검증은 유지하되, loader/refresh에는 legacy 모듈이 **없어야 함**을 검증하도록 반전했다. 동시에 현재 production 모듈 버전(`auto-run v27`, `pipeline-gate v22`, `followup v37`, `direct-reply-guard v2`, `reply-import-dedupe v1`)의 loader/refresh 연결을 명시적으로 검증한다.

## 검증 원칙
- safe-reflect/action-export legacy fixture의 stale signature/cycle fail-closed assertion은 삭제하지 않음.
- production loader/refresh에는 legacy producer/consumer가 재유입되지 않는지 검증.
- application runtime 결함이 아니므로 loader/refresh/cache 버전은 올리지 않음.
- workflow가 새 commit에서 실제 실행 완료되기 전 SUCCESS로 과장하지 않음.

## 코딩일지
- 수정: `tests/kpi-action-export.test.js`
- production JS/CSS: 변경 없음
- production loader/refresh: 변경 없음
- 수정 commit: `f095b537d8e2b83afd3cd617f5f351827276be0a`
- 문서 commit 이후 Actions/Pages 상태는 별도 확인하며, 완료 전 성공 판정하지 않는다.
