# 2026-09-07 Formula Target Fail-Closed Hardening

## 목적
향후 총괄 템플릿 변경으로 실제 KPI 반영 target에 Excel 수식이 들어오는 경우, 숫자 실적 반영이 수식을 덮어쓰지 못하도록 fail-closed 보호를 추가한다.

## 변경
- 대상: `safe-kpi-mapping.js` (`preview-v9-integrated` 전용)
- `targetHasFormula(xml, ref)` 추가
- patch 적용 직전 `Object.keys(patches)` 전체를 검사
- 수식 target이 1개라도 발견되면 `수식 셀 반영 차단` 오류로 전체 생성 중단
- 성공 로그에 `수식셀 덮어쓰기 0셀` 추가
- main 미변경

## 코드 커밋
- `63f2ac8aa1cf28c4b93aba92411632dec9f1bae4`
- resulting blob: `524d3fa468601a17f66ab8fceaa399faa910d385`

## 실행검증
합성 XML 공격 6개를 수행했다.
- 일반 숫자셀: ALLOW
- 일반 공란셀: ALLOW
- 일반 수식셀 `<f>...</f>`: BLOCK
- shared formula `<f t="shared">`: BLOCK
- 다른 셀에만 수식 존재: ALLOW
- target 셀 미존재: formula detector 단계에서는 ALLOW (기존 patchCell의 존재/생성 검증 경로로 처리)

결과: 6/6 PASS.

## 실파일 영향
이전 canonical 전수 교차 Gate에서 현재 India/Brazil 실제 v9 mapping target과 수식셀 충돌은 0건으로 확인되었다. 따라서 현재 7월 반영 결과는 바꾸지 않고, 미래 템플릿의 수식 target만 추가로 차단한다.

## 판정
- 수식 target 보호: PASS
- 기존 숫자 target 회귀: PASS
- 현재 canonical blocker: 0
- main deployment: 미실시
