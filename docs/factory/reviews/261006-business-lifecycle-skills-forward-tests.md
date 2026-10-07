# Business lifecycle skills — TableCards forward-tests

Created: 2026-10-06
Updated: 2026-10-06
Status: Completed first real-application forward-test; generalization limits recorded
Baseline: runtime source `b5aeae3`, checkpoint pushed as `42a6e33` on `feat/tablecards-application`

## Scope and sequence

Andrew requested four lightweight, outcome-oriented skills, then tests on
TableCards, then durable documentation/review beside the Business code. The
skills were created and structurally validated before the requested commit
checkpoint. `b5aeae3` includes the skills and initial documentation drafts;
`42a6e33` adds the agreed commit-also-push repository preference. Both were
pushed to the feature branch before these forward-tests. No merge or
production deployment occurred.

Independent agents received realistic reconciliation/review assignments and
the relevant skill paths, with non-overlapping output ownership. They
inspected accepted records, code and test evidence rather than being given an
expected document or a list of planted defects. Product/application agents
could reconcile the existing drafts; reviewers could inspect development with
synthetic identities and no-charge flows. Shared working documents were
visible, so this is independent task work, not a controlled blinded benchmark.
Runtime fixes, paid providers and production writes were outside the test.

## Observed outcomes

| Skill                                                                                   | Assignment and output                                                                                                                               | Behavior demonstrated                                                                                                                                                                                                                 |
| --------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [design-business-mvp](../../../.agents/skills/design-business-mvp/SKILL.md)             | Reconcile [TableCards Product](../../../projects/tablecards/docs/product.md)                                                                        | Preserved accepted prices/promises, separated mock/real stages and market assumptions, mapped promises to workflows/enforcement/evidence, flagged contradictory stage guidance without inventing a new product                        |
| [design-business-app](../../../.agents/skills/design-business-app/SKILL.md)             | Reconcile [TableCards Application](../../../projects/tablecards/docs/application.md)                                                                | Inspected actual routes/actions/states/styles and test assertions, distinguished intended from delivered behavior, kept design choices in the existing document instead of requiring a new template or per-button inventory           |
| [review-business-app](../../../.agents/skills/review-business-app/SKILL.md)             | Drive development desktop/mobile; [dated report](../../../projects/tablecards/docs/reviews/261006-tablecards-app-review.md)                         | Found a stale edited-project PDF despite the passing story suite, inspected visible phone controls and real invitation journeys, qualified reused versus fresh evidence                                                               |
| [review-business-readiness](../../../.agents/skills/review-business-readiness/SKILL.md) | Independent Astra development-candidate assessment; [dated report](../../../projects/tablecards/docs/reviews/261006-tablecards-readiness-review.md) | Detected storage cleanup authorization and queued-export revision defects, ran 11 backend tests plus an isolated actual-handler reproduction, gave a not-ready development verdict without demanding routine user review or deploying |

The [documentation standard](../business-documentation.md) placed Business
explanations beside code while retaining shared BFF docs and root work/ADR
records. Technical and operational explanations were maintained by the
explicit documentation assignment, not a fifth mandatory architecture skill.
The combined [TableCards review](../../../projects/tablecards/docs/reviews/261006-build-3-documentation-and-readiness.md)
records the product result; this document records the skill experiment.

## Supported refinement

Source tracing exposed a specific omission risk: a local account-switch
effect looked correct until the shared SDK's loading state/provider remount
was followed. Both application reconciliation and Astra identified it. One
short reminder was added to the application-design skill to trace relevant
shared SDK/provider lifecycle for consequential transitions. This is not a
React-specific rule or a demand to inspect every platform file.

Current delivery-plan/mock boundary and stale root README instructions were
reconciled. Runbook guidance was corrected: Convex file URLs are bearer URLs,
not automatically expiring authorization. These are verified documentation
corrections, not evidence that the runtime defects were repaired.

## Validation and limits

All four bundled skill validators passed at creation and were rerun at
closeout. Markdown formatting, relative link existence, whitespace and
repository secret scanning were checked for the resulting artifacts.
Structural validation cannot prove useful judgment; the real assignments
above provide that bounded behavioral evidence.

The fresh 19-case hosted regression and complete Node 24 repository gate
passed. They coexist with the newly found failures: coverage labels do not
prove assertions absent from the tests. Findings retain source-only, isolated
handler, hosted-browser and actual-PDF evidence distinctions.

This first exercise covered one established Business and full-app review.
New-Business definition, a bounded feature/delta review, unavailable-browser
conditions, near-miss automatic routing and unrelated technologies have not
been behaviorally benchmarked here. No defect-detection percentage or
comparison with a no-skill baseline is claimed. The skills are usable now;
future real use should refine demonstrated gaps, not accumulate universal
requirements. They do not prove demand, physical printing, legal compliance,
real billing or production release.

## Handoff

The requested skill/documentation/review scope is complete. TableCards Build 3
is **not ready** until its current defects are fixed and proved. Next product
work should address the review findings with action-level ownership denials,
edited PDF-content assertions, queued-edit interleaving and phone navigation
checks, then rerun affected hosted evidence. Optional user review is not a
prerequisite for those agent-executable fixes; separate implementation and
production authority still govern mutations.
