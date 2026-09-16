# HD-24 development log — Ulsan reply stale-download guard

## 발견
- `hd24-direct-reply-guard.js?v=1`의 `signature()`가 원본파일(`srcFile`)과 총괄파일(`masterFile`)이 모두 있어야 signature를 만들도록 되어 있었다.
- 울산은 설계상 별도 원본파일 없이 총괄파일만 사용하므로 `signature()`가 항상 빈 문자열을 반환했다.
- 그 결과 `context()`가 null로 빠지고 capture-phase stale/download guard가 울산 회신 Excel 다운로드를 소유하지 못했다.
- 인도/브라질은 기존 file-pair signature가 정상 동작하므로 영향 없음.

## 위험
- 울산 회신 Excel 생성 중 대상월/KPI/메일·회신 상태 또는 총괄파일이 바뀌어도 v1 guard가 개입하지 않아 stale 다운로드가 가능했다.
- 동일 Preview에서 연속 다운로드 클릭에 대한 in-flight dedupe도 울산에서는 적용되지 않았다.

## 조치
- `hd24-direct-reply-guard.js`를 v2로 갱신.
- 울산은 `plant + master-only + master file(name/size/lastModified)` signature를 사용.
- 인도/브라질은 기존 `plant + source + master` file-pair signature를 그대로 유지.
- production loader `hd24-ui-v3.js`와 `refresh-runtime.html`을 v2로 정렬.
- `tests/direct-reply-guard.test.js`에 울산 master-only signature 회귀조건 추가.
- Runtime Regression Gate의 production asset invariant도 v2로 갱신.

## 회귀검증
- GitHub Actions `HD24 Runtime Regression Gate` run `35044625166`의 `Validate production runtime invariants` step이 completed / success.
- 해당 gate는 safe reflect의 미래월 Actual, 직전월 원천↔총괄 anchor, 수식셀 차단, 단위 검증, 중복 KPI×월, 반영 후 재검증과 direct reply guard test를 함께 실행한다.

## 범위 제한
- KPI mapping/판정 수식/safe reflect 본체는 변경하지 않았다.
- live browser E2E 성공으로 간주하지 않는다; 이번 검증은 실행 가능한 CI regression과 production loader/refresh 정합성까지 확인한 것이다.
