# 2026-09-28 Multi-month reply Excel

6,7,8월 멀티셀렉트 Preview가 최신월 단일 Excel로 바뀌는 문제를 확인했다. capture-phase direct reply guard v2가 selectedMonth만 다시 조회한 것이 원인이었다.

v3에서 selectedMailMonths 전체를 snapshot으로 보존하고 KPI×월 union, 행별 r.month, 행별 mail-history anchor, multi-month filename, post-write month-set stale 검증, 전체월 in-flight dedupe를 적용했다. 원본 월파일이 없는 총괄파일 단독 판정에서도 guard가 동작하도록 signature도 현재 source-optional 구조와 정렬했다.

production loader와 refresh-runtime을 v3로 맞추고 tests/direct-reply-guard.test.js에 multi-month 회귀조건을 추가했다.