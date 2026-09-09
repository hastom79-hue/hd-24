# HD-24 Production Safe Runtime Regression Restore — 2026-09-09

## 발견 사항
실제 main의 `safe-kpi-mapping.js`를 재검증하는 과정에서 production 안전 로직 회귀를 확인했다.

회귀 상태의 safe blob:
- `5c3e2c347f719a3e79e4cf6742fa99cb5e6d5188`

해당 production 파일에는 이전에 검증 완료했던 다음 안전장치가 누락되어 있었다.
1. Brazil 정확 LTIR KPI runtime unit `%` override
2. India 정확 `PPM` KPI의 source `Nos.`(count) → mapping `PPM` 예외
3. India 정확 `5S Audit Score`의 source `%` → mapping `score` 예외
4. `masterFutureContamination()` 미래월 기존값 fail-closed 차단
5. 미래월 scan의 `masterInfo.row + 1` 헤더행 제외

또한 install tail에서 `btn.dataset.safeReflectReady='1'`가 `if(btn)` 밖에 있어 DOM 변경 시 예외 가능성이 남아 있었다.

## 기준 안전본 비교
이전에 실파일/로컬 attack 검증이 완료된 Git blob을 직접 재조회했다.
- known-good blob: `1236ba6715c0764236e1c3357886c94cae5b8934`

해당 blob에는 LTIR / PPM / 5S / future contamination / header exclusion이 모두 존재함을 확인했다.

## Production 복구
`safe-kpi-mapping.js`를 known-good 안전본 기준으로 복구하면서 install null-guard도 동시에 보강했다.

복구 commit:
- `208acbe3d1d9fcb32ece383de903169324d24b13`
- message: `fix: restore fail-closed KPI guards and null-safe install`
- restored safe content SHA: `c89b2ff2e244576afa4e512ffd9148c571c3e752`

install tail은 버튼 존재 시에만 listener/dataset/readiness=true를 설정하고, 버튼이 없으면 readiness=false로 유지하도록 변경했다. catch 경로도 readiness=false를 명시한다.

## Browser cache bust
회귀본이 `safe-kpi-mapping.js?v=17`로 캐시되었을 가능성을 제거하기 위해 `hd24-ui-v3.js`의 safe loader cache key를 v18로 상승시켰다.

cache-bust commit:
- `6d9f9eb5d2f64c546f554381305b09a377fb3c50`
- message: `fix: bust restored safe runtime cache`
- UI content SHA: `01bf09d6d395ec17bfc8ad8aaa6f6be45f971482`
- current loader: `./safe-kpi-mapping.js?v=18`

post-commit direct re-fetch에서 아래를 다시 확인했다.
- Brazil exact LTIR `%` override 존재
- India exact PPM count→ppm 예외 존재
- India exact 5S pct→score 예외 존재
- `masterFutureContamination()` 존재
- future scan starts `masterInfo.row+1`
- null-safe `btn` install guard 존재

## Post-restore 자동검증 실행 상태
복구/cache-bust push로 영구 workflow들이 정상 트리거되었다.

- India Browser E2E run `34322437796`
  - job `102371915008`
  - conclusion failure
  - `steps=null`
- Brazil Browser E2E run `34322437806`
  - job `102371914524`
  - conclusion failure
  - `steps=null`
- Runtime Regression run `34322437803`
  - job `102371914445`
  - conclusion failure
  - `steps=null`
- Apply approved UI run `34322437772`
  - execution-layer failure before normal steps

위 failure들은 application test failure가 아니라 GitHub Actions runner가 step을 시작하지 못한 기존 execution-layer 장애와 동일하다.

## Pages 배포
복구/cache-bust head `6d9f9eb5d2f64c546f554381305b09a377fb3c50`의 Pages run:
- `34322437312`
- conclusion: `success`

따라서 복구된 safe runtime과 v18 loader는 Pages에 배포되었다.

## Permanent Runtime Regression Gate 자체 회귀 방지 보강
기존 Regression Gate는 `safe-kpi-mapping.js?v=X`의 cache-bust revision과 safe runtime 내부 semantic banner `안전 실적 반영 vY`를 동일 버전으로 강제했다. 현재 cache key는 v18이고 semantic runtime banner는 v15이므로 서로 다른 목적의 버전을 같은 값으로 강제하는 것은 잘못된 assertion이었다.

이를 수정하고 최신 안전장치를 영구 assertion으로 추가했다.

commit:
- `dacc8e7b2b54df6f0f81b2fb54c32e1abe4aaacc`
- message: `test: harden regression gate for restored KPI guards`

추가/수정 assertion:
- cache version과 semantic runtime version을 분리 파싱
- India exact PPM exception
- India exact 5S exception
- Brazil LTIR override token
- `masterFutureContamination`
- `masterInfo.row+1`
- null-safe btn install guard
- 기존 fail-closed / formula / duplicate / post-write / mapping / NVA / RCCP / DOMParser 관계 lookup 검증 유지

새 head `dacc8e7b...`의 Pages run `34322569519`도 `success`.
새 Runtime Regression run `34322570375`, job `102372335240` 역시 `steps=null`로 runner 실행 전 실패했다.

## Runtime refresh helper 정렬
`refresh-runtime.html`이 safe `?v=17`을 강제 reload하고 있어 현재 복구본과 불일치함을 확인했다.

수정 commit:
- `5d58160e2ea8ecd09ac6617f50670374253c3f66`
- message: `fix: align runtime refresh helper to safe cache v18`
- helper safe fetch: `./safe-kpi-mapping.js?v=18` with `cache:'reload'`

## 현재 잔여 위험
1. `index.html`은 아직 `hd24-ui-v3.js?v=15`를 참조한다. 현재 `hd24-ui-v3.js` 내부 safe loader는 `?v=18`이다.
2. `Apply approved HD-24 UI` workflow는 safe loader에서 v18을 동적으로 읽어 index CSS/JS를 v18으로 정렬하도록 정상 구현되어 있으나 Actions runner 장애로 실행되지 못한다.
3. 따라서 outer UI asset cache chain은 아직 완전히 닫히지 않았다.
4. India/Brazil Browser E2E와 Runtime Regression은 실제 step 실행이 회복된 뒤 반드시 재실행 PASS가 필요하다.
5. Browser E2E fixture에는 향후 India PPM/5S exact semantic cases, Brazil LTIR `%`, 미래월 contamination negative case, month-header Date false-positive 방지 positive case를 영구 추가해야 한다.

## 판정
- 실파일 workbook 논리 검증: PASS 유지
- production safe runtime 실제 회귀: 발견 및 복구 완료
- 핵심 fail-closed hotfix + null guard: production 반영 완료
- safe cache key v18: production 반영 완료
- Pages deployment: PASS
- permanent CI/browser execution: PENDING (runner pre-step outage)
- outer index cache alignment: REMAINING

전체 체인은 아직 final로 판정하지 않는다.
