# HD-24 브랜치/통합 검증일지 — 2026-09-07

## 목적
최종 Preview 및 main 배포 전 브랜치 상태를 점검하여, 검증 완료된 v9 로직이 main의 최신 변경사항을 덮어쓰거나 누락시키지 않도록 한다.

## 1. main ↔ preview 비교

GitHub compare 결과:

- base(main): `91a109ef4259dbf27962dcaa41c029c4e80bdbaa`
- head(preview): `preview-safe-mapping`
- status: `diverged`
- preview ahead_by: 3
- preview behind_by: 1
- merge base: `71426686ad960d2aeba198c141c8bcc441725dae`

즉, preview 브랜치에는 v9 관련 변경이 있으나 main의 최신 1개 commit을 포함하지 않는다. 따라서 최종 배포 시 preview를 그대로 main에 덮어쓰는 방식은 금지한다.

## 2. 현재 diff 파일

main 대비 preview 변경 파일:

1. `safe-kpi-mapping.js`
   - v9 안전 반영 로직
   - ABS/REL tolerance 적용
   - 과거 불일치 보존 + 당월 반영 지속
   - runtime supplement 2건
   - post-write 재검증
2. `DEVELOPMENT_LOG.md`
   - 전체 개발/검증 이력
3. `development-log/2026-09-07-validation.md`
   - 2026-09-07 상세 검증 기록

## 3. 중요 배포 리스크

`safe-kpi-mapping.js`는 main 대비 큰 diff로 표시된다. 이는 v9에서 코드가 압축/정리된 영향이 있으므로 단순 additions/deletions 수치만으로 정상 여부를 판단하지 않는다.

최종 통합 전 반드시:

- current main의 최신 변경 보존
- v9 safe mapping 로직만 의도대로 반영
- loader/cache-bust가 v9를 실제 로드하는지 확인
- diff 파일 목록 재확인
- Preview 브라우저에서 실제 India/Brazil 파일 구동
- 사용자 승인 후 main 반영

## 4. 현재 확인된 loader 상태

Preview `hd24-ui-v3.js`는 현재:

`safe-kpi-mapping.js?v=2`

를 로드하고 있다. 따라서 브라우저 Preview 최종 검증 전에 cache-bust를 v9 기준으로 수정해야 한다.

단, `hd24-ui-v3.js`는 대형 one-line 파일이므로 부분 문자열만 덮어쓰는 방식은 금지한다. 전체 파일을 안전하게 보존한 상태에서 `?v=2` → `?v=9`만 변경하고 diff를 재검증해야 한다.

## 5. 최종 통합 원칙

- preview가 main보다 1 commit 뒤처진 상태에서 직접 배포 금지
- main 최신 상태를 기준으로 v9 변경을 통합하는 방식 사용
- 통합 후 `compare_commits` 재확인
- 예상 외 파일 변경 0건 확인
- GitHub Pages `completed / success` 확인 전 배포 완료로 간주하지 않음

## 6. 현재 판정

- v9 로직 검증: 진행 완료 단계
- 브랜치 통합 안전성: **주의 필요**
- main 직접 배포: **금지 상태 유지**
- 다음 작업: 전체 Dry-run/출력 역검증 완료 후 Preview 통합본 생성 및 cache-bust 수정
