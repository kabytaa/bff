# Build 3 documentation and readiness review

Created: 2026-10-06
Updated: 2026-10-06
Status: Reviewed — development candidate has blocking defects; production readiness not established
Baseline: runtime source at `b5aeae3`; pushed documentation checkpoint `42a6e33` on `feat/tablecards-application`
Target: development documentation/review; no production deployment authority

**Successor, 2026-10-06:** This report preserves the failed original candidate,
not the current runtime verdict. The [completed remediation and development
acceptance](261006-tablecards-remediation-and-development-acceptance.md) records
resolved findings, runtime `a914da0`, 27 passing hosted cases and independent
app/security re-review. Production and customer-launch acceptance remain separate.

## Documentation and review outcome

The four Business lifecycle skills were created and validated before the
requested commit/push checkpoint. Independent agents then used them on
TableCards: product and application explanations were reconciled against
accepted decisions and source/test assertions, and separate application and
Astra readiness reviews inspected behavior and safety. The maintained
[Business README](../../README.md) routes to product, application, architecture
and operations beside the code. Old root paths are compatibility routers,
not competing product truth. Root plans/brainstorms and shared ADRs retain
their existing ownership.

Read the [hands-on app review](261006-tablecards-app-review.md) and
[independent readiness assessment](261006-tablecards-readiness-review.md)
for detailed evidence and exclusions. The separate
[skill forward-test record](../../../../docs/factory/reviews/261006-business-lifecycle-skills-forward-tests.md)
evaluates the skills rather than treating this application's readiness as
proof of every future skill use case.

No runtime source was fixed or deployed in this review/documentation task.
Development is still usable for diagnosis, but the candidate must not be
reported as functionally complete or promoted while the blocking defects
below remain. Optional user review is not the blocker.

## Checks actually completed on 2026-10-06

| Check                                                  | Result                                                              | Evidence boundary                                                                                                            |
| ------------------------------------------------------ | ------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Four skill structural validators                       | Pass                                                                | Frontmatter/naming/scaffold checks; not behavioral proof                                                                     |
| Hosted story suite                                     | Pass: 19 uncached cases, 13 Chromium + 6 mobile WebKit, 5.6 minutes | Existing assertions against development; not every edge case or pricing lifecycle                                            |
| Complete repository gate                               | Pass under Node 24 with Nx concurrency 1                            | Format/lint/boundaries/types/tests/integration/build/bundle/secret scan/local browser gate; some Nx tasks reused valid cache |
| Development public health                              | Pass                                                                | Web and TableCards/gateway health returned 200; gateway rejects product `/v1/health` with 404                                |
| Development web deployment identity                    | Pass                                                                | Read-only Wrangler inspection matched `c82c37eb-b670-4a28-884b-4cd2b559ba9d`                                                 |
| Exact backend/gateway source SHA                       | Unverified                                                          | Health uses `development` / `f6344be-build3-dev`, not a full current source stamp                                            |
| Real billing, physical print, production product smoke | Not established by this task                                        | Explicitly outside this development evidence; no production action authorized                                                |

Commands run from the repository root:

```sh
pnpm --package=node@24 dlx sh -c 'pnpm test:e2e:tablecards-hosted'
pnpm --package=node@24 dlx sh -c 'NX_PARALLEL=1 pnpm check'
```

An initial complete-gate process ended with exit 143 during builds; the second
whole command completed successfully. Passing tests do not cancel independently
demonstrated defects their assertions do not exercise.

## Important defects and next remediation

| Finding                                                             | Evidence                                                                                                                                         | Required outcome                                                                                                      |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------- |
| Dirty saved-project export uses old saved contents                  | Independently reproduced in hosted browser and downloaded PDF; source reuses `savedProject` without saving dirty edits                           | Export the intended current draft, invalidate stale download state and assert corrected names/title in the actual PDF |
| Upload finalization can delete a foreign caller-supplied storage ID | Actual handler invoked with stubbed external dependencies: entitlement denial still called delete; no hosted cross-account destruction attempted | Bind uploads to authorized account/uploader and prove denial/cleanup cannot read, attach or delete foreign files      |
| Queued export reads live contents under an old recorded revision    | Source inspection; no hosted timing race claimed                                                                                                 | Bind/check the render input revision and test edits interleaved with queued work                                      |
| Mobile has no replacement for hidden sidebar Sign out               | Hosted 320/390-pixel inspection: zero visible buttons, sole DOM control in hidden sidebar                                                        | Make session exit reachable in the supported phone composition and assert it through UI                               |

The application document also records auth-return/draft continuity, account
switching, transfer-finality copy, feedback and constrained-style gaps. The
readiness assessment separates additional safety, file-access and deployment
questions from demonstrated defects. Fixes need their own in-scope regression
tests and hosted rerun; today's passing suite is insufficient to close them.

## Later delivery boundaries

Build 3's shared checkout explicitly charges nothing; future production demo
permission is not an existing deployment. Build 4 owns verified payment,
paid-through renewal, expiry/cancellation, Event Pass binding and retention.
Build 5 owns two-way support; Build 6 owns operational visibility. These are
not silently implemented by the mock, nor requirements for claiming real
payment testing today. Physical output and the accepted font boundary still
need their own recorded acceptance before the corresponding launch promise.
