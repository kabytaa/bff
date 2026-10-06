# Astra Review: Business Lifecycle Skills and Documentation

Created: 2026-10-03. Updated: 2026-10-03.

Status: Completed proposal review; skill implementation and document relocation
have not been performed.

Reviewer: Astra (`gpt-6-astra`), an independent sub-agent with a fresh context.
Repository baseline: `0067776` on `feat/tablecards-application`.

Reviewed proposal:
[`261003-business-lifecycle-skills.md`](../../../.agent/brainstorms/261003-business-lifecycle-skills.md),
the uncommitted draft before reconciliation. Its SHA-256 was
`b64a36d8173bcc5ae45a3b391539f6179dd5ab312fcde3ff9443d2bea0e546af`.
Proposal line numbers below refer to that draft; section names and quoted text
identify the reasoning preserved after revision.

## Verdict

The four focused skills serve the intended goal. The draft needed simplification
before implementation: useful review criteria had become unnecessarily fixed
document inventories and broad verification obligations. Keep the skill
boundaries and Business-specific choices, and make the documentation and review
scope proportional to the work.

This was a repository/document review, not behavioral testing of implemented
skills. No new lifecycle skill exists yet. Astra read all 62 first-party Markdown
files present at review start, totaling 13,612 lines. No first-party Markdown
file was left unread. Dependencies, generated reports and caches were excluded;
the external `skill-creator` instructions were also read.

## Findings and disposition

### High: feature review was overridden by full-review obligations

The proposal's Experience Review defined feature scope at lines 286–293, but
then said, “In either mode,” to execute every accepted story on desktop and
phone at lines 295–298. The self-review gate repeated broad coverage at line 626.

Correction incorporated into the proposal: apply each obligation to declared
scope and affected dependencies, allow evidence reuse for unchanged behavior,
and expand when cross-cutting changes or stale evidence justify it. Required
repository test gates still apply. An app-review pass does not certify a whole
production launch.

### High: documentation requirements were too prescriptive

Application Contract lines 239–275 required five representations, multiple ID
namespaces and a detailed control registry; Durable Artifact Model line 467
required five linked artifacts. Those could become a second hand-maintained
application model.

Correction incorporated: preserve coverage of important outcomes, states,
actions and responsive behavior while allowing combined sections. Reuse
existing story IDs and executable acceptance registries. Wireframes and
diagrams should resolve an actual design question. Broken buttons are found by
inspecting the rendered app, including controls without a Markdown ID.

### High: existing live documentation contains contradictory guidance

These remain findings for a later documentation cleanup:

| File at reviewed baseline                                                                       | Contradiction                                                                                                                                  | Current evidence                                                                                                                                                                            |
| ----------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [TableCards E2E README](../../../projects/tablecards/e2e/README.md), line 36                    | Says Studio tests provision policy through the operator CLI and offer selection never changes it.                                              | [Shared checkout plan](../../../.agent/plans/260929-shared-mock-checkout.md), lines 13, 274 and 333, records removing that fixture bypass and applying policy through real shared checkout. |
| [TableCards web README](../../../projects/tablecards/workloads/web/README.md), line 69          | Says users may own only one account.                                                                                                           | [Code-owned defaults](../../../projects/tablecards/customer-auth.defaults.ts) permit two owned accounts and two memberships for invitation/transfer behavior.                               |
| [Source map](../../research/source-map.md), lines 118–130                                       | “Current reconciliation” still requires login to use the generator, advertises 20 Studio seats and presents settled product questions as open. | [Current product specification](../../products/tablecards-mvp.md) permits public import/preview and a five-seat Studio offer.                                                               |
| [Build 2 runbook](../../operations/build-2-customer-auth.md), line 5                            | Says production acceptance is pending.                                                                                                         | [Completed Build 2 plan](../../../.agent/plans/260926-build-2-shared-mvp.md) and current handoff record production/Safari acceptance.                                                       |
| [Provider runbook](../../operations/provider-accounts-and-secrets.md), lines 11, 27, 33 and 119 | Mixes older rollout/support assumptions with present-tense guidance.                                                                           | Current delivery/product decisions provide the successor scope.                                                                                                                             |

Repair live instructions or clearly label historical sections and route to their
successors. Preserve earlier plans' historical decisions: the shared-checkout
plan already records the supersession of the old fixture approach.

### Medium: local ownership needed a clear root-artifact exception

Durable Artifact Model lines 486–530 promised absolute Business co-location
while retaining root work artifacts. Root locations are required by current
[`AGENTS.md`](../../../AGENTS.md); they are not a present rule violation.

Correction incorporated: Business canonical documentation becomes local, while
agent work records and ADRs retain current root locations. Moving those work
records locally would need a deliberate change to the governing rules and
skill discovery. This audit authorizes no silent migration.

### Medium: architecture explanations had no maintenance owner

The proposed layout omitted architecture, table purposes and API explanations.

Correction incorporated: add useful Business-local technical explanations,
starting combined and splitting when substantial. Existing planning/execution
maintain them, and readiness checks freshness. The shared
[BFF data model](../../architecture/shared-bff-data-model.md) is a useful pattern:
explain ownership, semantics and invariants, with exact schema/types in code.
API explanations cover native Convex contracts as well as HTTP when applicable.
No fifth architecture skill is needed.

### Medium: unperformed checks needed an explicit result

Risk-profiled Readiness Dossier line 454 allowed only pass, fail, N/A and
accepted risk. An applicable check that cannot run needs a distinct result.

Correction incorporated: `unverified` records why, its effect on the requested
gate and the next useful check. State whether the review targets a development
candidate, production deployment or customer launch. Optional user review does
not become a universal release dependency.

### Medium: STATUS and routing contain too much history

[`STATUS.md`](../../../STATUS.md) contains 128 long lines and extensive completed
history, rather than the short router required by repository instructions. Root
[`README.md`](../../../README.md), lines 28–34, also retains obsolete Build 2
wording.

Recommendation: preserve historical evidence in dated work/review artifacts and
reduce STATUS to current state, active artifact, next moves and blockers. A short
pointer for this review is added; the larger history cleanup remains separate.

## Recommended skills and documentation

Keep four skills:

- `design-business-mvp`: customer/problem/outcome, offers/promises, scope,
  acceptance and evidence-qualified assumptions.
- `design-business-app`: chosen surfaces, journeys, consequential actions,
  meaningful states, responsive behavior and design choices.
- `review-business-app`: rendered application review with full/feature scope,
  findings and uncertainty, including imperfectly documented applications.
- `review-business-readiness`: challenge current evidence against the requested
  release boundary using applicable lenses.

Begin with useful content, not empty scaffolds:

```text
projects/tablecards/
  README.md
  docs/
    product.md                 # assumptions can remain a section here
    application.md             # design choices can remain a section here
    architecture/
      overview.md              # tables/APIs can initially be sections
      data-model.md            # split when substantial
      api.md                   # split when substantial
    research/                  # when there is actual research
    reviews/                   # dated evidence for actual candidates
    operations/                # actual deployment/recovery runbooks
```

Overview explains runtime components, dependencies and ownership. Data-model
prose explains table purpose, relationships, lifecycle, important invariants and
access paths. API prose explains supported consumer contracts, authorization,
effects, errors, retries and compatibility. Link code and shared BFF documents;
avoid copying complete validators, field lists or every internal function.

Retain code-near READMEs for concrete setup and public contracts. Split a design
system or assumptions ledger only when it becomes useful. Defer a release/router
super-skill, a mandatory ID scheme, documentation generation and exhaustive
browser permutations.

## Complete Markdown ownership coverage

| Existing group                   | Files | Role and recommendation                                                                                             |
| -------------------------------- | ----: | ------------------------------------------------------------------------------------------------------------------- |
| Root AGENTS, README, STATUS      |     3 | Shared rules, routing and current handoff; stay root.                                                               |
| `.agents/skills/` and references |     9 | Shared workflows; stay root.                                                                                        |
| `.agent/brainstorms/`            |     8 | Dated exploration and reasoning; preserve current convention/history.                                               |
| `.agent/plans/`                  |     8 | Dated implementation intent and completion evidence; preserve current convention/history.                           |
| `docs/architecture/adr/`         |     4 | Accepted shared BFF/platform choices; stay root.                                                                    |
| Other `docs/architecture/`       |     3 | Shared architecture source, data model and deferred ideas; stay shared.                                             |
| `docs/factory/`                  |     1 | Cross-boundary delivery stages; stay shared and link Business details.                                              |
| `docs/products/`                 |     2 | TableCards canonical product/app docs; candidates for Business-local migration.                                     |
| `docs/research/`                 |     2 | Local TableCards market report plus shared historical source/provenance map; separate by ownership.                 |
| `docs/operations/`               |     7 | Six shared platform/provider/auth/deployment runbooks and one TableCards runbook; move only Business-owned content. |
| `platform/` READMEs              |     4 | Code-near shared setup/contracts; keep.                                                                             |
| `projects/example/` READMEs      |     3 | Code-near example setup/contracts; keep.                                                                            |
| `projects/tablecards/` READMEs   |     5 | Code-near product setup/contracts; keep and repair current drift.                                                   |
| `tools/` READMEs                 |     3 | Operator/customer-auth/production-tool commands and ownership; keep.                                                |
| Total                            |    62 | All read; no unread first-party Markdown.                                                                           |

The mixed factory delivery plan and source map should not move wholesale simply
because they mention TableCards. No canonical files were relocated during this
review.

For a future relocation, preserve creation dates, immutable dated filenames,
baseline snapshots and historical reasoning. Update incoming/outgoing relative
links, literal paths in AGENTS/README/STATUS, skill discovery/template references
and relevant code/config paths together. Preserve historical facts while
repairing links, and maintain one canonical copy.

## Evidence limits and verification

The main agent independently verified the E2E README, web README, current
TableCards defaults and product/runbook references. An inline local Markdown
file-target scan outside fenced examples found zero missing targets in the
62-file baseline. It did not check anchors, reference-style links or external
URLs, and a working link does not establish semantic freshness.

The requested review is complete. New skills still need realistic behavioral
forward tests after implementation. Application runtime tests and production
deployments were outside this documentation-review scope.

## Follow-up review

Astra reread the revised proposal and this report. It confirmed that the report
accurately represents its findings and limits, and that the material scope,
evidence reuse, artifact size, architecture ownership and root-location
contradictions were resolved. The follow-up requested small consistency edits:
define independence, align material-risk language, remove leftover registry
wording, append a dated reconciliation to the decision log and allow explicitly
unresolved product questions during exploration. These edits are incorporated.
The proposal is suitable for skill drafting; live-document drift remains open.
