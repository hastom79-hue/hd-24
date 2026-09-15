# 2026-09-16 Reply auto-import duplicate guard

## 발견
`hd24-followup.js?v=28`에서 회신 파일 input의 `change` 이벤트가 `importReply()`를 자동 실행하도록 변경됐지만 기존 `회신파일 이력 반영` 버튼도 같은 `importReply()`를 그대로 실행한다. 따라서 자동 반영 직후 사용자가 기존 버튼을 누르면 동일 File 객체가 다시 이력에 추가되어 replySequence가 불필요하게 증가하고 반복이슈 판정이 오염될 수 있는 구체적 중복 위험이 확인됐다.

## 조치
- `hd24-reply-import-dedupe.js?v=1` 추가.
- 회신 파일 change를 capture 단계에서 기록하되 자동 import 자체는 방해하지 않는다.
- 동일 File 객체에 대해 자동 반영 직후 5초 이내 수동 버튼 재실행만 차단한다.
- 다른 파일 또는 시간이 지난 명시적 수동 재실행은 유지한다.
- production loader와 `refresh-runtime.html` preload를 동일하게 반영했다.
- `tests/reply-import-dedupe.test.js`를 추가하고 Followup Exact Once workflow에 포함했다.

## 범위
safe reflect/action export/KPI 산출 로직은 변경하지 않았다. 이번 수정은 follow-up/reply history의 exact-once 성질만 보강한다.