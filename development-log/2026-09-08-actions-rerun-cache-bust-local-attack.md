# 2026-09-08 — Actions 재실행 / 캐시 버스트 / 로컬 공격검증

## 목적
실파일 보정본과 fail-closed hotfix 이후 남은 위험을 추가 제거한다. 특히 GitHub Actions 실행층 장애가 코드 결함인지 외부 runner 문제인지 재확인하고, 브라우저 캐시가 이전 safe runtime을 계속 사용할 가능성을 제거하며, Actions 공백 동안 로컬 함수 공격검증과 실파일 재검증으로 안전성을 보완한다.

## 기준
- Repo: `hastom79-hue/hd-24`
- 직전 개발일지 HEAD: `f9fc590d76144895eb1900bfd76c230e1d8c360e`
- 현재 보정 실파일: `총괄파일_인도7월_브라질6_7월반영_실파일최종보정_v16검증본.xlsx`
- 기준 총괄 원본은 기존 승인본을 그대로 보존하며 수정하지 않는다.

## GitHub Pages 확인
- Run: `34188850916`
- Head: `f9fc590d76144895eb1900bfd76c230e1d8c360e`
- Result: SUCCESS
- Cache-bust commit Pages run: `34191687520`
- Head: `d89165707be677df6aa7b97dc431ee4c19b769bc`
- Result: SUCCESS

## Actions 실행층 재시험
기존 Runtime Regression 실패 job을 API로 직접 재실행했다.
- Original run: `34188851128`
- Original job: `101942571088`
- Re-run job: `101949601225`
- Re-run API: accepted
- Re-run result: FAILURE
- Job steps: `[]`
- Job log retrieval: 404 BlobNotFound

따라서 테스트 코드가 실행된 뒤 assertion이 실패한 것이 아니라 runner가 workflow step을 시작하지 못한 실행층 장애로 판정한다.

Cache-bust HEAD `d89165707be677df6aa7b97dc431ee4c19b769bc`에서도 같은 현상이 반복됐다.
- Runtime Regression run `34191687938` / job `101950883746`: FAILURE, steps `[]`
- India Browser E2E run `34191687987`: FAILURE before normal execution
- Brazil Browser E2E run `34191688039`: FAILURE before normal execution
- Apply approved HD-24 UI run `34191687956`: FAILURE before normal execution

## 실파일 재검증
현재 보정본의 대상 보고시트를 artifact_tool 및 ZIP/XML 읽기 전용 검증으로 재확인했다.
- 인도법인 KPI(26년 보고용): `#REF!`, `#DIV/0!`, `#VALUE!`, `#NAME?`, `#N/A` = 0
- 브라질법인 KPI(26년 보고용): 동일 오류 = 0
- 인도 AH:AL(8~12월), 헤더 이후 numeric contamination = 0
- 브라질 AH:AL(8~12월), 헤더 이후 numeric contamination = 0
- 기존 비대상 참조시트의 legacy formula error는 본 대상시트 검증과 분리한다.

## 로컬 JS 함수 공격검증
GitHub main의 safe runtime snapshot을 Node VM으로 직접 실행해 내부 보호 함수를 검증했다.
첫 harness 실행은 외부 의존 함수 `normalizeValue` stub 누락으로 실패했으며 runtime defect로 판정하지 않았다. stub을 동일 의미로 보완한 뒤 재실행했다.

최종 결과: `HD24_LOCAL_GUARD_ATTACK_PASS`

검증 항목:
- `Nos.` → count
- `%` → pct
- `PPM` → ppm
- India 정확 KPI `PPM`만 count→ppm 예외 허용
- `Other PPM`에는 예외가 전파되지 않음
- India 정확 KPI `5S Audit Score`만 pct→score 예외 허용
- 일반 `Audit Score`에는 예외가 전파되지 않음
- Brazil LTIR runtime unit만 `%`로 교정
- 다른 Brazil KPI unit은 변경되지 않음
- 미래월 contamination 검사는 월 헤더 row를 오염으로 오인하지 않음
- 헤더 다음 행의 미래월 numeric value는 정상적으로 BLOCK

## 캐시 위험 발견 및 제거
hotfix된 `safe-kpi-mapping.js`의 내용은 최신이지만 loader가 계속 `safe-kpi-mapping.js?v=15`를 요청하면 기존 브라우저 캐시가 이전 내용을 재사용할 수 있는 위험을 발견했다.

GitHub blob과 로컬 runtime snapshot을 Git hash 기준으로 비교해 동일성 확인 후 loader만 최소 변경했다.
- old `hd24-ui-v3.js` blob: `c1342d388445e0ed922083a17cd5318351301aa7`
- snapshot Git blob: 동일
- old `index.html` blob: `ac6a61550d7c679527728edd649118fe39a762ac`
- snapshot Git blob: 동일

적용 commit:
- `d89165707be677df6aa7b97dc431ee4c19b769bc`
- message: `fix: bust safe reflect cache for real-file hotfix`
- `hd24-ui-v3.js` now requests `safe-kpi-mapping.js?v=16`
- new `hd24-ui-v3.js` blob: `a9b426eef70d78c6df8f6c017398de83b0a5a429`

## 현재 잔여위험
1. `index.html`은 아직 `hd24-ui-v3.js?v=15`, `hd24-ui-v3.css?v=15`를 참조한다. 정상적인 `Apply approved HD-24 UI` workflow는 `hd24-ui-v3.js`에서 safe version을 읽어 index를 v16으로 자동 정렬하도록 되어 있으나, 현재 Actions runner 장애로 실행되지 못했다.
2. safe runtime install tail의 `btn.dataset.safeReflectReady='1'`가 `if(btn)` 밖에 있다. 현재 DOM에는 버튼이 있어 실사용 영향은 낮지만 DOM 구조 변경 시 fail-safe install을 위해 추후 null-guard 반영 필요.
3. permanent Runtime Regression / India Browser E2E / Brazil Browser E2E는 Actions runner가 회복된 후 반드시 재실행해 PASS를 확보해야 한다.

## 판정
- 실파일 데이터/대상 보고시트: PASS
- 미래월 contamination: PASS
- safe runtime 로컬 함수 공격검증: PASS
- hotfix safe cache bust (`safe-kpi-mapping.js?v=16`): PASS
- GitHub Pages deployment: PASS
- GitHub Actions permanent CI/E2E: BLOCKED by runner execution layer (`steps=[]`), not yet PASS
- index outer cache key alignment: REMAINING
