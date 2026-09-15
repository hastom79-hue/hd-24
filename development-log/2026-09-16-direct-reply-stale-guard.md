# 2026-09-16 Direct reply stale-export guard

## 발견
현재 production loader는 과거 `action-export/followup-sync` 병렬 체인을 제거하고 `hd24-followup.js?v=29` 직접 회신 Excel 경로를 사용한다. 이 경로의 `buildReplyFile()`은 `ExcelJS.writeBuffer()` 동안 파일쌍/사업장/대상월/KPI 결과/메일·회신 이력이 바뀌어도 생성 완료 후 그대로 다운로드할 수 있었다. 또한 동일 Preview에서 다운로드 버튼 연타 시 중복 생성이 가능했다.

## 조치
- `hd24-direct-reply-guard.js?v=1` 추가.
- 다운로드 시작 시 원본+총괄 파일 signature, 사업장, 대상월, Preview mode, exact KPI output token을 freeze.
- token에 masterRow/month/KPI/Target/Actual/achieved/streak/trend/status, 반복이슈, 이전 원인·대책, 최근 메일/회신 시점을 포함.
- `writeBuffer()` 완료 직전 동일 상태를 재계산하여 하나라도 바뀌면 다운로드를 fail-closed 차단.
- 동일 signature/month/mode의 in-flight 중복 생성 차단.
- production loader 및 `refresh-runtime.html` preload에 v1 연결.
- `tests/direct-reply-guard.test.js` 추가.

## 검증체계 보정
`HD24 Runtime Regression Gate`가 과거 outer UI/safe runtime 버전 동일성 및 제거된 action-export/followup-sync 체인을 계속 요구해 실제 current production과 불일치했다. 현재 loader chain 기준으로 재정렬하되 safe reflect의 미래월/직전월/unit/수식셀/중복 KPI×월/반영 후 검증 invariant는 유지했다.

## 원칙
과거 체인을 다시 살리지 않고 현재 production 경로만 보호한다. 의미 없는 cache 버전 증가는 하지 않았다.
