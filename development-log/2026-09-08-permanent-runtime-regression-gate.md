# 2026-09-08 Permanent HD24 Runtime Regression Gate

## Purpose
Add a permanent read-only regression workflow so future code/mapping edits automatically detect reintroduction of previously removed HD-24 failure modes.

Workflow added:
- `.github/workflows/hd24-runtime-regression.yml`
- commit `3bb7f883758e5a8fa7df00c6d5b1e5142b061535`

## Permanent checks
The gate validates on every push to `main` and every pull request targeting `main`:
- runtime/cache chain consistency between `index.html`, `hd24-ui-v3.js`, and `safe-kpi-mapping.js`;
- legacy unsafe reflect click handler is absent;
- reflect button requires `hd24SafeReflectReady`;
- loader defaults fail-closed and has an onerror fail-closed path;
- safe capture listener/readiness install exists;
- full KPI mapping failure guard exists;
- future-month anomaly guard exists;
- previous-month historical integrity anchor exists;
- older historical drift preservation exists;
- formula-target blocking exists;
- duplicate KPI×month target blocking exists;
- post-write XML verification and applied-count verification exist;
- semantic historical display comparison exists;
- fail-closed unit validation exists;
- India/Brazil static mapping cardinality is 76 each (77 each after runtime additions);
- no duplicate KPI names/master rows within static mappings;
- Brazil NVA mapping remains row150/151 -> master row122;
- Brazil RCCP remains `scale:1` + `퍼센트텍스트`;
- permanent UI recovery workflow cannot hard-code stale v3 references and still derives the active runtime version dynamically.

## Execution result
Initial permanent gate run:
- run `34181503310`
- conclusion: SUCCESS
- production runtime invariant step: SUCCESS

Same commit also ran permanent approved-UI recovery:
- run `34181503301`
- conclusion: SUCCESS
- active-version recovery and stale-v3 assertion both PASS

This establishes a repeatable CI-level regression signal. The repository branch currently has no required-status-check branch protection, so the workflow detects regressions but cannot itself prevent a direct push from landing. Browser GUI click E2E remains unclaimed because browser automation was unavailable.
