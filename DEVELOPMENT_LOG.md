# HD-24 개발일지

> 이 문서는 HD-24의 개발·수정·검증·배포 이력을 추적하기 위한 기준 기록이다.  
> 운영 원칙: **변경 → 실파일 검증 → Preview → 사용자 승인 → main 배포 → GitHub Pages 성공 확인**.  
> 사용자 승인 전에는 Preview 브랜치의 변경사항을 main에 배포하지 않는다.

## 1. 프로젝트 목적

HD-24는 글로벌 사업장 월간 HDPS KPI 실적파일을 총괄 KPI 파일에 안전하게 자동 반영하고, 목표 달성·미달·추세·관리 우선순위를 웹에서 분석하기 위한 시스템이다.

핵심 요구사항은 다음과 같다.

- 사업장별 월간 KPI 파일 + 총괄파일 업로드
- 사업장 → KPI명 → Actual행 → 월 헤더 기준으로 정확한 실적 반영
- 유사한 행번호를 근거로 임의 매핑하지 않음
- 행 밀림 0건 / 월 밀림 0건 / 오매핑 0건 / 기존 데이터 훼손 0건 목표
- 원천 공란, `-`, `Update`, 비수치 상태값은 기존 총괄값을 덮어쓰지 않음
- 미래월 데이터를 임의 삭제하거나 변경하지 않음
- 매핑이 불명확하거나 복합지표인 경우 추정하지 않고 BLOCK 또는 경고

## 2. 기준 총괄파일

현재 검증 기준 canonical master는 다음 파일이다.

- `총괄파일_인도7월반영_최종검증본 (4)(2).xlsx`

이 파일을 기준 총괄파일로 사용하며, 별도 명시 없이 다른 과거 버전을 최종파일로 간주하지 않는다.

현재 월간 원천 검증파일:

- India: `## HCEI Module KPI 2026 _HQ recomendation Jul 26.(1).xlsx`
- Brazil: `HCEB Module KPI 2026_31Aug2026(1).xlsx`

## 3. 기존 자동반영 로직 문제

초기 운영 로직에서 확인한 핵심 위험:

- fuzzy KPI 검색 후 과거 `masterRow`로 fallback 가능
- 월 위치를 고정 열번호에 의존할 위험
- 과거월 불일치가 있어도 잘못된 위치에 반영될 가능성
- KPI명이 변경되거나 행이 삽입되면 행 밀림 발생 가능

따라서 안전 로직은 **고정 행번호를 신뢰하는 방식이 아니라 실파일에서 KPI명과 구조를 다시 확인하는 방식**으로 전환하였다.

## 4. Safe Mapping 개발 이력

### v8

주요 안전장치:

- India KPI명 열: G
- India 단위 열: I
- Brazil KPI명 열: F
- Brazil 단위 열: J
- KPI strict matching 및 ambiguity 차단
- 12개월 헤더 탐색
- `Actual행 = KPI label행 + 1` 구조 검증
- 단위 family 검증
- 중복 master row / 중복 KPI×month target 차단
- stale fixed-row fallback 제거
- 미래월 삭제 금지
- 공란/비수치 상태값 보존

v8 문제점:

- 과거월 값이 하나라도 다르면 전체 자동반영을 중단함
- 미세한 소수점 차이도 `EPS=1e-9` 기준으로 불일치 처리될 수 있음

### v9 Preview

Preview 브랜치: `preview-safe-mapping`

v9 commit:

- `ef5c561a78e601b476810e1795f8306bb382d37e`

주요 변경:

- `ABS_EPS=1e-6`, `REL_EPS=1e-6`
- 과거월 값이 동일하면 기존값 보존
- 과거월 master 공란 + source 숫자이면 안전 backfill
- 과거월 master 숫자와 source 숫자가 다르면 **master를 보존하고 `HISTORY_MISMATCH` 경고**
- 과거월 불일치 때문에 현재월 반영 전체를 중단하지 않음
- 현재/latest Actual 월은 정확한 target에만 반영
- source 공란/텍스트는 기존 master 보존
- 미래월 변경 금지
- post-write 대상 셀 검증 유지

**v9는 아직 main에 배포하지 않았다.**

## 5. Runtime 보완 매핑

정적 mapping에서 누락된 것으로 확인된 항목:

### India

- Source label row 94 / Actual row 95
- `Manufacturing Lead Time (Fab Tacking to FDI out)`
- Master row 42
- `제조 리드타임(Fab.to Machine Stock)`
- Scale ×1

### Brazil

- Source label row 62 / Actual row 63
- `IQ 200 Issues with Production responsibility (Assembly)`
- Master row 34
- `IQ200(생산귀책)`
- Scale ×1

현재 v9 runtime supplement로 보완하고 있으며 최종적으로 정적 mapping과 동기화해야 한다.

## 6. 자동반영 금지 지표

Brazil NDT:

- Source label row 64 / Actual row 65
- `Welding Process Defect Rate (NDT)`

총괄 KPI가 단독 NDT가 아닌 복합 공정불량 지표이므로 NDT 값만 단독으로 입력하면 의미가 달라진다. 따라서 **자동 매핑 BLOCK을 유지**한다.

## 7. 실파일 구조 전수검증

검증된 원천 KPI/Actual 구조:

| 구분 | India | Brazil |
|---|---:|---:|
| KPI/Actual 구조 후보 | 103 | 80 |
| KPI명 중복 | 0 | 0 |
| 총괄 KPI명 중복 | 0 | 0 |
| Actual행 구조 이상 | 0 | 0 |
| 8월 Actual 오인식 | 0 | 0 |

총 183개 KPI 구조를 검증하였다.

Brazil 파일은 `artifact_tool` 직접 import 과정에서 `Format_InvalidStringWithValue` 오류가 발생한 적이 있어, 해당 파일의 검증은 XLSX 내부 XML을 읽는 read-only 방식으로 병행하였다. 원본 XLSX 패키지를 임의 수정하지 않았다.

## 8. 월 위치 검증

### India

원천 월 헤더 기준:

- Jan = O
- Feb = P
- Mar = Q
- Apr = R
- May = S
- Jun = T
- Jul = U

과거 검증 과정에서 India 월 열을 한 칸 잘못 해석한 사례가 있었고, 실제 헤더를 다시 확인하여 위 기준으로 수정하였다.

### Brazil

원천 월 헤더 기준:

- Jan = R
- Feb = S
- Mar = T
- Apr = U
- May = V
- Jun = W
- Jul = X
- Aug = Y

Brazil의 중요 KPI에서 8월 숫자는 Actual행이 아닌 Target행에 존재하는 구조가 확인되었다. 따라서 latest Actual month는 **7월**이며 Target행의 8월 값을 Actual로 오인하지 않도록 Actual행만 사용한다.

총괄파일 월 헤더는 `AA=1월 ... AG=7월 ... AL=12월` 구조를 확인하였다.

## 9. QA / VSM 집중 Dry-run

v9 QA/VSM Dry-run 결과:

### India

- current_write: 14
- backfill: 0
- history_same: 82
- history_warn: 6
- blank: 10

### Brazil

- current_write: 15
- backfill: 5
- history_same: 71
- history_warn: 8
- blank: 0
- text: 6

통합:

- 현재월 write 예정: 29셀
- 과거월 불일치 보존/경고: 14셀
- 과거월 불일치가 있어도 현재월 반영은 계속

## 10. 주요 실데이터 검증 사례

### India QA

7월 원천값과 canonical master의 주요 QA 값이 일치함을 확인하였다.

예:

- QIR: 0.81 → 81
- IQ: 36 → 36
- WQ: 447 → 447
- Quality Line Downtime: 0.74 → 0.74
- IQ200 생산귀책: 0.19 → 19
- Process Defect: 0.49 → 49
- PPM: 376 → 376
- Performance Defect: 76 → 76
- Incoming Inspection Defect: 274 → 274

### India VSM

`Manufacturing Lead Time` 원천 Actual:

- Jan 7.5
- Feb 7.41
- Mar 7.0
- Apr 6.64
- May 7.31
- Jun 7.37
- Jul 7.28

canonical master row 42의 기존 값이 해당 원천과 맞지 않는 과거 이력이 확인되어, 자동으로 과거값을 덮어쓰지 않고 경고 대상으로 관리한다.

### Brazil QA/VSM

Brazil QA의 July Actual이 master에서 공란인 항목들이 다수 확인되어 v9 current-month write 대상으로 검증하였다.

VSM 주요 예:

- Value Time Ratio: Jun 0.41 / Jul 0.06 → scale 적용 시 41 / 6
- Manufacturing Lead Time: Jun 14.68 / Jul 55.1
- Parts Inventory Turnover: Jun 4.5 / Jul 4.3
- Shipment Lead Time: Jun 1 / Jul 0

과거 master 값과 원천값이 다른 경우에는 기존 master를 자동 수정하지 않는다.

## 11. Scale / Unit 전수검증

전체 183개 KPI에 대해 단위와 Jan~Jul 실적 범위를 이용해 scale을 검증하였다.

초기 단위/scale 확인 후보: 98건  
실데이터 범위 대조 후 수동확인 후보: 2건  
최종 판정: **183/183 완료**

최종 2건:

### India LTIR

- Source unit: 공란
- Jan~Jul: `0, 0, 0, 1.3, 0.4, 0.2, 0.2`
- Master row 8 값과 직접 일치
- Scale ×1 확정

### Brazil LTIR

- Source unit: `%`
- Jan~Jul: `0, 2.2, 0, 2.0, 1.0, 0, 1.0`
- 기존 master Jan~May 값과 직접 일치
- Scale ×1 확정
- Jun~Jul은 master 공란이므로 backfill/current 반영 검증 대상

## 12. 과거월 데이터 처리 원칙

v9 최종 기준:

1. source 숫자 + master 동일 → master 보존
2. source 숫자 + master 공란 → 안전 backfill 가능
3. source 숫자 + master 다른 숫자 → master 보존 + `HISTORY_MISMATCH`
4. source 공란/텍스트 → master 보존
5. 현재/latest Actual month → 검증된 정확한 target에만 반영
6. 미래월 → 변경하지 않음

과거 데이터 정정이 필요하면 자동반영과 분리하여 **별도의 baseline repair Preview**로 수행한다.

## 13. 검증 산출물

현재까지 생성된 주요 검증 산출물:

- `HD24_v8_실파일_통합검증_결과.xlsx`
- `HD24_v9_QA_VSM_DryRun_검증.xlsx`
- `HD24_v9_전체KPI_구조전수검증_중간결과.xlsx`
- `HD24_v9_전체KPI_단위_Scale_예외검증.xlsx`
- `HD24_v9_Scale전수판정_검증.xlsx`
- `HD24_v9_LTIR예외_최종판정.xlsx`
- `HD24_v9_전체DryRun_Gate검증.xlsx`

검증 리포트 자체의 `#REF!`, `#DIV/0!`, `#VALUE!`, `#NAME?`, `#N/A` 오류 스캔에서도 현재 생성된 최신 검증파일은 0건을 확인하였다.

## 14. Preview / Cache 관리

Preview의 `hd24-ui-v3.js` 로더는 현재 다음과 같이 확인됨:

- `safe-kpi-mapping.js?v=2`

v9 Preview 최종 브라우저 검증 전에 cache-bust를 v9 기준으로 갱신해야 한다. 단, `hd24-ui-v3.js`는 대형 one-line 파일이므로 부분 수정 과정에서 파일 전체를 훼손하지 않도록 주의한다.

## 15. 배포 이력 및 상태

과거 승인된 v8 계열 main 배포는 GitHub Pages `completed / success`를 확인하였다.

현재 main 기준 관련 commit:

- `91a109ef4259dbf27962dcaa41c029c4e80bdbaa`

현재 v9 Preview commit:

- `ef5c561a78e601b476810e1795f8306bb382d37e`

**현재 상태: v9는 Preview 브랜치에만 존재하며 main 미배포.**

## 16. 현재 진행률 및 남은 작업

현재 검증 진행률: 약 94%

남은 순서:

1. 정적 `mapping_india.json` / `mapping_brazil.json`과 runtime supplement 최종 동기화
2. 누락 2건 해소
3. Brazil NDT BLOCK 유지 확인
4. 전체 mapping 기준 실제 v9 Dry-run
5. 반영 예정 셀 전수 추출
6. 생성본 재읽기 및 원천→출력 셀 역검증
7. 행 밀림 0 / 월 밀림 0 / scale 오류 0 / 중복 target 0 / 미래월 변경 0 최종 확인
8. Preview cache-bust 및 브라우저 smoke test
9. 사용자에게 Preview 제시
10. **사용자 승인 후에만 main 배포**
11. GitHub Actions / Pages `completed / success` 확인 후 배포 완료 처리

## 17. 절대 금지사항

- canonical master를 검증 없이 재생성하거나 다른 파일로 대체하지 않는다.
- source row 번호가 비슷하다는 이유로 master row를 추정하지 않는다.
- fuzzy match 실패 시 stale fixed row로 fallback하지 않는다.
- 과거월 불일치를 자동으로 덮어쓰지 않는다.
- source 공란/텍스트로 기존 숫자를 지우지 않는다.
- 미래월을 자동 삭제하지 않는다.
- NDT 단독값을 Brazil 복합 공정불량 KPI에 입력하지 않는다.
- Preview 승인 전에 main에 배포하지 않는다.
- GitHub Pages 성공 확인 전에 배포 완료라고 보고하지 않는다.

---

### 2026-09-07 기록

- 전체 KPI 구조 검증 범위 확정: India 103 / Brazil 80 / 총 183 KPI
- KPI명 및 총괄 KPI명 중복 0건
- Actual행 구조 이상 0건
- 8월 Actual 오인식 0건
- Scale 판정 183/183 완료
- LTIR 2건 예외 최종 확정
- 정적 mapping 누락 2건 확인
- Brazil NDT 복합지표 BLOCK 유지
- 전체 Dry-run Gate 통과
- v9 운영 main 미배포 상태 유지
- 다음 작업: mapping 최종 동기화 → 전체 KPI Dry-run → 생성본 역검증 → Preview 승인
