# HD-24 Cache Chain / E2E Gap Hardening — 2026-09-09

## Scope
Continued error hunting after production safe-runtime restoration. This log records newly discovered active cache-chain mismatches, permanent regression-gate gaps, Browser E2E fixture gaps, fixes applied, and current GitHub Actions execution-layer status.

## 1. Active index cache-chain regression rediscovered
Directly re-fetched current production `index.html` and found active references were not aligned:
- UI CSS: `./hd24-ui-v3.css?v=3`
- UI JS: `./hd24-ui-v3.js?v=15`
- current `hd24-ui-v3.js` safe loader: `./safe-kpi-mapping.js?v=18`

Therefore the active browser cache chain is currently `CSS v3 / UI JS v15 / safe runtime cache v18`.

This is an outer-cache consistency defect. The existing `Apply approved HD-24 UI` workflow is designed to derive the safe cache revision from `hd24-ui-v3.js` and align both index CSS and JS references to that revision, but GitHub Actions is still failing before any workflow steps execute.

No direct full-file replacement of the large `index.html` was performed because the available GitHub Contents API replaces the entire file and a broad rewrite would introduce unnecessary corruption risk while the automated alignment workflow remains the safer intended path.

## 2. Runtime Regression Gate CSS blind spot
Finding:
- the permanent Runtime Regression Gate checked index UI-JS cache version alignment;
- it did not check the UI-CSS cache version;
- therefore stale CSS such as the active `?v=3` reference could escape the gate.

Fix commit:
- `1b59514713832f4e6aa19ec8d64566a5d4467500`
- message: `test: close CSS cache regression gap`

New permanent assertions distinguish JS and CSS mismatches and require both to match the active cache revision derived from `hd24-ui-v3.js`.

## 3. India Browser E2E fixture did not exercise real unit exceptions
Finding:
- previous synthetic India fixture copied source units from static mapping;
- therefore it did not reproduce the real-file PPM source unit `Nos.` versus mapping/master PPM family;
- it also did not reproduce the 5S Audit Score source `%` versus master score-family exception;
- it had no negative test proving a pre-existing future-month numeric master value blocks output.

Fix commit:
- `37c7282f860faff7514c82bf1ecf1b7cfc8648da`
- message: `test: exercise India unit exceptions and future-month block`

Permanent India E2E now:
- forces exact `PPM` source unit to `Nos.`;
- forces exact `5S Audit Score` source unit to `%`;
- creates `master_future_contaminated.xlsx` with a numeric August value beyond July source horizon;
- requires the contaminated case to log `미래월 Actual` and emit no download;
- then runs a clean positive reflect/download case and verifies July writes and Aug-Dec untouched.

Triggered run:
- run `34323159284`
- job `102374208001`
- result: infrastructure pre-step failure (`steps=null`), so no E2E code executed.

## 4. Brazil Browser E2E fixture did not exercise LTIR runtime override
Finding:
- previous synthetic Brazil fixture inherited static mapping unit and therefore did not reproduce the actual LTIR `%` condition;
- no negative future-month contamination case existed.

Fix commit:
- `657eac66926bb02f0a9cb4c23769ce6aba181ba0`
- message: `test: exercise Brazil LTIR override and future-month block`

Permanent Brazil E2E now:
- forces exact `LTIR (Lost Time Incident Rate)` source unit to `%`;
- forces corresponding master unit to `%` in the corrected-master fixture;
- retains RCCP percent-string semantics;
- adds a contaminated August master value negative case;
- requires fail-closed error and zero download before a clean positive run.

Triggered run:
- run `34323215361`
- job `102374388652`
- result: infrastructure pre-step failure (`steps=null`), so no E2E code executed.

Latest Runtime Regression on the same Brazil commit:
- run `34323215347`
- job `102374388733`
- `steps=null`.

## 5. CSS-only changes did not trigger Browser E2E
Finding:
Both India and Brazil Browser E2E path filters omitted `hd24-ui-v3.css`, so a CSS-only production change could bypass Browser E2E entirely.

Fixes:
- India: `76588cea77c5ef39c1430e8682c6907646959927` — `test: trigger India E2E on UI CSS changes`
- Brazil: `b3bb293d0cbce72fec79793535315fb9d988875c` — `test: trigger Brazil E2E on UI CSS changes`

Both push and pull-request path filters now include `hd24-ui-v3.css`.

## 6. Pin strengthened E2E scenarios in permanent Regression Gate
Risk:
A future edit could accidentally simplify/remove the newly strengthened Browser E2E cases without altering production runtime code.

Fix commit:
- `7dcc03acd28a4609de418de96f559199b7d4249e`
- message: `test: pin strengthened E2E safety scenarios`

Regression Gate now statically asserts that permanent E2E workflows retain:
- CSS trigger coverage;
- `master_future_contaminated.xlsx` negative fixtures;
- `미래월 Actual` fail-closed assertions;
- no-download assertions for blocked cases;
- India PPM `Nos.` source-unit fixture;
- India 5S `%` source-unit fixture;
- Brazil LTIR `%` source and master fixtures.

Latest gate run after this commit:
- run `34323571570`
- job `102375551450`
- `steps=null`; code never started.

## 7. Runtime refresh helper verification
Current `refresh-runtime.html`:
- force reloads `./hd24-ui-v3.js?v=15`;
- force reloads `./safe-kpi-mapping.js?v=18`.

This is internally consistent with the current index JS reference being v15 while the UI loader requests safe v18. When the outer index is eventually aligned to v18, this helper must also be aligned to UI JS v18.

## 8. Pages deployment
Pages deployment for commit `657eac66926bb02f0a9cb4c23769ce6aba181ba0`:
- run `34323214881`
- conclusion: SUCCESS.

The preceding India-only Pages run was cancelled only because it was superseded by the immediately following Brazil push; this is not an application deployment failure.

## Current status / remaining blockers
Confirmed corrected or hardened:
- production safe-runtime PPM/5S/LTIR/future-month guards restored;
- null-safe reflect install fixed;
- safe runtime inner cache revision v18;
- Regression Gate now checks CSS and JS cache alignment;
- India/Brazil E2E now exercises real unit exceptions and fail-closed future-month contamination;
- CSS-only changes now trigger both Browser E2E workflows;
- strengthened E2E scenarios are pinned by the permanent Regression Gate;
- latest confirmed Pages deployment is successful.

Still unresolved:
1. active `index.html` remains `CSS v3 / JS v15` while safe loader is v18;
2. `Apply approved HD-24 UI` cannot align the outer cache chain because GitHub Actions jobs continue to fail before steps;
3. enhanced Runtime Regression / India E2E / Brazil E2E have not actually executed after the latest hardening;
4. final production readiness must not be declared until those permanent jobs run and pass.
