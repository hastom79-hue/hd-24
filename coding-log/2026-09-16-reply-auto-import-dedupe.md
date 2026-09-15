# Coding log — reply auto-import dedupe

- 신규 runtime: `hd24-reply-import-dedupe.js?v=1`
- 이벤트 전략: document capture listener로 `hd24ReplyFile` change를 먼저 관찰하고, 기존 follow-up bubble listener의 자동 import는 그대로 통과시킨다.
- 중복 차단: 같은 File 객체 + change 후 5초 이내 `hd24ImportReply` click만 `preventDefault()` + `stopImmediatePropagation()` 처리.
- 다른 File 객체는 차단하지 않는다.
- loader 순서: `hd24-followup.js?v=28` 직후, `hd24-followup-sync.js?v=8` 이전에 guard를 로드한다.
- refresh preload도 동일 v1을 포함한다.
- regression: `tests/reply-import-dedupe.test.js`에서 change 미차단, 동일파일 즉시 수동 재실행 차단, 다른파일 수동 import 허용, loader/refresh 연결을 검증한다.
- CI: `.github/workflows/hd24-followup-exact-once.yml` syntax/execute 단계에 신규 guard와 test를 추가했다.
