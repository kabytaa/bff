# Brainstorm: Business Lifecycle Skills

> **Status**: Accepted — four skills implemented and forward-tested on TableCards
> **Created**: 2026-10-03
> **Last updated**: 2026-10-06
> **Repository baseline**: `0067776`

## Context Snapshot

- TableCards Build 3 is functionally complete in development, with its product
  scope, delivery stages, implementation plans, runbook and acceptance evidence
  distributed across the repository's canonical documents.
- The repository already has focused skills for product/feature brainstorming,
  implementation planning, plan execution, behavior-preserving cleanup,
  retrospective knowledge maintenance and customer-auth configuration.
- The current skills do not define a reusable standard for what every Business
  MVP must decide, how customer/pricing promises become acceptance evidence, or
  how to audit a Business independently before production release.
- Repository completion requires intended production deployment and smoke
  verification unless an accepted scope explicitly ends earlier. External
  actions and production mutations still require the authority appropriate to
  the task.

## The Idea

Create a small Business-lifecycle skill system that helps Codex repeatedly turn
an idea into a coherent, testable and operable Business without hiding missing
product decisions inside implementation plans.

The system should answer four different questions:

1. What Business and MVP should we build?
2. What must that Business promise and prove?
3. How should the accepted Business be implemented using shared BFF capability
   and product-specific code?
4. Is the Business genuinely ready for production and customers?

The skills should preserve user choice, use repository evidence, and produce
durable artifacts. They should not become a single autonomous command that
silently chooses a product, spends money, deploys production or declares market
validation.

## Codebase Context

### What We Have

- `brainstorm-ideas` explores open product or feature direction and records a
  living discussion.
- `plan-feature` converts an accepted direction into an implementation-ready
  repository plan.
- `execute-plan` implements an approved plan with incremental and complete
  validation.
- `cleanup-code` performs behavior-preserving quality review after execution.
- `reflect` updates durable knowledge only after an evidence-backed proposal
  and explicit approval.
- `configure-business-auth` translates product behavior into validated BFF
  customer-auth and account policy.
- `docs/factory/mvp-delivery-plan.md` defines shared delivery stages, while
  `docs/products/tablecards-mvp.md` demonstrates a concrete product contract.
- TableCards now has a useful acceptance pattern: each pricing promise maps to
  a discoverable UI, authoritative enforcement and automated evidence across
  desktop and mobile.

### Constraints

- A Business lifecycle spans product, market, implementation, provider,
  security, operations and production evidence. Loading all detail for every
  request would make a single skill noisy and prone to overreach.
- The skills must be outcome- and evidence-oriented, not universal solution
  recipes. They may require a capability, user-visible state, safety property or
  acceptance result, but must not prescribe one login flow, page structure,
  framework, provider or technical mechanism when several approaches could
  satisfy the Business and repository constraints.
- Market evidence can reduce uncertainty but cannot prove willingness to pay;
  real customers and purchases remain separate evidence.
- Generic repository implementation skills should remain authoritative for
  planning and coding instead of being copied into a Business-specific skill.
- Operational actions must remain assigned deliberately to operator CLI,
  backoffice or product UI.
- Production deployment, purchases, external outreach and provider-account
  changes require explicit scope and authority; a lifecycle skill cannot grant
  them implicitly.

### Opportunities

- Make one reusable **Business contract** the handoff between design, build and
  review: target customer, problem, useful outcome, offer/pricing hypotheses,
  user journeys, product promises, enforcement, evidence, shared/product
  ownership, providers, operations, launch assumptions and exclusions.
- Use a promise-to-evidence matrix so advertised capabilities cannot exist only
  in backend tables or tests that bypass the customer UI.
- Let an independent readiness review consume the same contract and return
  `Ready`, `Not ready`, `Defer` or `Exception requiring named human approval`,
  with exact evidence and gaps.
- Keep the implementation layer thin by routing accepted slices through the
  existing `plan-feature` and `execute-plan` skills.
- Preserve a small design-system contract and review implementation against it
  throughout development so visual and interaction choices do not drift page by
  page.
- Treat product experience, accessibility, security/privacy, legal/commercial
  readiness and operations as explicit review lenses rather than assuming that
  passing feature tests makes a Business launch-ready.

## Options

### Option A: One `build-business` super-skill

**Approach**: One skill handles idea selection, research, PRD, architecture,
implementation sequencing, review and launch.

**Leverages**: All existing repository documents and skills behind one obvious
entry point.

**Constraints**: It must route many modes and carry a large amount of conditional
guidance.

**Effort**: Medium.

**Risk**: It becomes a vague catch-all, duplicates existing skills, loads too
much context and may blur the user's decision and authorization boundaries.

### Option B: Modular lifecycle skills with one shared Business contract

**Approach**: Add four focused skills initially:

- `design-business-mvp`: turn an idea or selected opportunity into an accepted
  Business contract and product PRD, including proportionate research,
  pricing hypotheses, user journeys, delivery stages and acceptance matrix.
- `design-business-app`: translate the accepted Business contract into an
  application PRD: information architecture, routes, menus, page contents,
  complete user stories, discoverability, responsive behavior and every
  loading/empty/error/permission/recovery state that materially affects use.
- `review-business-app`: run during implementation or before release to compare
  the real desktop/mobile product with its application and design-system
  contracts, reviewing usability, state correctness, visual consistency and
  accessibility.
- `review-business-readiness`: independently audit the implemented Business
  against those contracts, pricing promises, production evidence and the
  applicable security, privacy, legal/commercial and operational minimums.

Each design skill should present context-appropriate options and record only the
choice accepted for that Business. For example, it can require correct signed-in
and signed-out states and a discoverable authentication journey without
declaring that every Business must use a redirect, modal, dedicated page or a
particular session mechanism. Review skills judge whether the chosen solution
meets its stated outcomes and constraints; they do not penalize a different but
valid implementation merely because it differs from a preferred template.

Continue to use `plan-feature`, `execute-plan`, `cleanup-code` and
`configure-business-auth` for their existing responsibilities. Add a thin
`advance-business` router later only if repeated use shows that choosing the
next lifecycle action is itself difficult.

**Leverages**: Existing specialization and the TableCards promise-to-evidence
pattern without duplicating coding workflows.

**Constraints**: The four skills need stable shared Business/application/design
contracts and clear handoff rules.

**Effort**: Medium.

**Risk**: Without a later router, the user or Codex must still choose the right
skill at each lifecycle transition.

### Option C: One Business standard plus the existing skills

**Approach**: Create only a `business-mvp-standard` or reference checklist.
Existing brainstorming, planning and execution skills consult it when relevant.

**Leverages**: Minimal new skill surface and no orchestration duplication.

**Constraints**: A passive standard has weak discovery and does not itself
perform the independent readiness audit the user wants.

**Effort**: Low.

**Risk**: Teams may treat the checklist as optional, and gaps remain scattered
across plans, status documents and conversations.

## Proposed Business Contract

The precise format is undecided, but the shared artifact should cover only
decisions that materially change the Business or its acceptance:

- customer and job-to-be-done;
- useful output and value boundary;
- market evidence, alternatives and unresolved hypotheses;
- offers, pricing, limits and cost/risk assumptions;
- complete customer journeys, including failure and recovery;
- promise-to-evidence matrix: visible workflow, authoritative enforcement and
  unit/integration/browser/manual evidence;
- authentication, account, team, data ownership and privacy decisions;
- shared BFF capability versus Business-owned product data/code;
- provider dependencies and mock-versus-production boundaries;
- mobile/desktop, accessibility and supported input/output boundaries;
- support, analytics, monitoring, backoffice and operator responsibilities;
- production topology, release/smoke/rollback evidence and any explicitly
  required physical or provider evidence;
- explicit exclusions, deferred ideas and the next validation hypothesis.

This is not a universal requirement that every Business implement every
capability. Mark consequential items as decided, unresolved with their impact,
or not applicable with a reason. Exploration may leave a decision open; planning
must resolve only the uncertainties that materially affect its selected scope.

## Proposed Application Contract

The application-design artifact should make the expected product experience
reviewable before code is planned. It should include:

- public surfaces such as landing, pricing, policies and signed-out recovery;
- authentication, onboarding, account selection and invitation acceptance;
- the shortest complete path to the Business's useful outcome;
- saved-work, history, reuse and destructive-action flows when applicable;
- account, plan/usage, billing-entry, team and support surfaces promised by the
  Business contract;
- desktop and mobile navigation, page hierarchy and responsive priorities;
- screen-composition decisions: which concerns belong together, which require
  separate routes or focused steps, and which use dialogs, drawers or
  progressive disclosure;
- responsive transformation rather than simple shrinking: desktop columns,
  persistent context and bulk controls may become mobile steps, summaries or
  on-demand panels while preserving the same outcome;
- exact page purpose, primary action, secondary actions and information shown;
- empty, loading, partial, validation, permission, capacity, offline/network,
  expired and destructive-confirmation states;
- role/plan/state visibility rules so hidden capability is not mistaken for a
  broken or inert control;
- an explicit UI state model for signed-out, authenticating, signed-in,
  onboarding-required, account-selection-required, restricted and stale/error
  states, including which navigation and calls to action may appear in each;
- accessibility, keyboard/focus, readable content and performance boundaries;
- a trace from every user story and pricing promise to a discoverable UI path,
  authoritative backend rule and observable acceptance evidence.

The artifact should avoid prescribing generic pages that the product does not
need. For example, a one-shot utility may not need a dashboard, while a saved
project product does. Applicability follows the customer journey, not a fixed
SaaS template.

The maintained application artifact should cover the following information in
the smallest form that makes the chosen experience buildable and reviewable.
These are useful representations, not five mandatory documents or inventories:

1. **Surface map** — every route, screen, dialog/drawer and its purpose,
   entry conditions and possible exits.
2. **Screen-state matrix** — meaningful variants such as signed out, loading,
   empty, populated, invalid, permission denied, plan-limited, restricted and
   provider/network failure.
3. **Consequential actions** — submissions, purchases, permission changes,
   destructive actions, external handoffs and ambiguous transitions. Record
   relevant information such as:
   - the screen/state where it appears;
   - visibility and enabled conditions;
   - accessible label and user intent;
   - resulting transition, mutation or external handoff;
   - success feedback, failure behavior and retry/recovery;
   - required role, plan/capability and authoritative enforcement;
   - desktop/mobile presentation differences;
   - acceptance-evidence references.
4. **Flow diagrams** — primary and exceptional transitions between screen
   states, using compact diagrams where they clarify branching, authentication
   return, payment, invitations or recovery.
5. **Responsive wireframes** — low-fidelity desktop and mobile layouts where
   they resolve a composition or flow question. A small feature may use an
   annotation of the affected existing screen instead.

The canonical artifact should remain human-readable Markdown with tables and
Mermaid where useful. Reuse existing user-story IDs and executable test
registries. Add stable screen/state/action IDs only when they improve actual
traceability; ordinary links and repeated component behavior need no separate
eight-field record. Avoid a second hand-maintained JSON/YAML copy unless later
tooling has a concrete need for machine-readable input.

Not every state/action combination needs an expensive browser test. The
contract assigns appropriate evidence: component tests for rendering/state,
integration tests for authorization and invariants, browser journeys for the
important customer flows and manual evidence for inherently physical or human
judgment. The app review must inspect actual interactive controls within its
scope and flag missing, inert, misleading or state-inconsistent behavior.
Documentation gaps should be reported when they obscure a consequential
decision, not merely because an ordinary button lacks its own Markdown ID.

## Proposed Experience Review

`review-business-app` should include a real product/UX audit rather than
only reading tests and schemas:

Independent review means examining source evidence and observed behavior rather
than accepting the implementation author's completion claim. A fresh agent is
useful when risk or complexity warrants it; it is not mandatory for every delta.

- **Full-application mode** reviews every primary route, accepted journey,
  meaningful state and supported desktop/mobile transformation. Use it for a
  new application, a major redesign or the evidence refresh before an important
  release.
- **Feature/delta mode** starts from the feature, changed files and affected
  contract entries, then reviews its complete journey and expands to shared
  navigation, authentication/account state, components, permissions, pricing
  promises and neighboring flows that could regress. It is narrower than the
  full review, but it must not treat the edited screen as an isolated island.
- Both modes state their scope, exclusions, evidence freshness and confidence.
  The skill should recommend expanding to a full review when the change is
  cross-cutting or the existing full-review evidence is stale.
- Reuse earlier evidence for unaffected behavior after checking its relevant
  code, configuration and dependencies. A local feature does not automatically
  invalidate every previous journey. Required repository test gates remain in
  force independently of the exploratory browser-review scope.

Within the declared scope and affected dependencies, the review should:

- execute every accepted customer story through visible UI on desktop and
  phone, including the advertised Free and paid paths;
- inspect navigation, back behavior, deep links, authentication return and
  account switching for coherent context;
- verify that every visible control matches current session/account/plan state;
  for example, a signed-in customer must not still see a primary login action;
- find buttons that do nothing, controls that do not visibly change state,
  inaccessible functionality, dead ends and misleading copy;
- inspect representative long/empty/invalid content and all important
  permission, limit and provider-failure states;
- compare pricing and marketing copy against actual UI, server enforcement and
  test evidence;
- check responsive layout, focus/keyboard behavior, accessibility basics,
  loading feedback and destructive confirmations;
- distinguish automated evidence from manual evidence and development from
  production evidence;
- return a severity-ranked gap report and a scoped application-review verdict,
  never silently implement fixes during an audit-only request. A positive app
  review is not a production or customer-launch verdict.

If an existing app has incomplete documentation, review the available product
promises and observed behavior anyway. Distinguish accepted requirements from
inferred expectations and report consequential gaps. Do not require a new PRD
before finding a broken button. Use synthetic or redacted evidence; browser
captures, traces and logs must not retain credentials or private customer and
guest-list content.

## Proposed Design-System Contract

`design-business-app` should create or update a compact, code-aligned design
system rather than choosing visual details independently on each page. It should
record:

- product/brand design principles and intended emotional character;
- semantic color roles, contrast requirements and light/dark behavior where
  applicable;
- typography scale, font responsibilities and supported-script boundary;
- spacing, sizing, grid, breakpoints, radius, border, elevation and motion
  conventions;
- standard components and their hover/focus/pressed/disabled/loading/error
  states;
- navigation, form, feedback, confirmation and destructive-action patterns;
- icon, illustration, photography and generated-asset direction;
- content tone, labels and terminology that must remain consistent;
- approved exceptions with rationale rather than silent one-off styling.

Exact reusable values should live in the implementation's tokens/components;
the design document records semantic choices, rules and rationale. Avoid two
independent hand-maintained copies of every CSS value.

`review-business-app` should inspect representative screens and meaningful
states at agreed desktop and phone viewports. It compares the rendered product
with the design-system and application contracts, checks hierarchy, density,
alignment, typography, color, component/state consistency, touch targets,
focus/keyboard behavior and responsive transformations, and records annotated
evidence. Automated visual regression may protect stable high-value screens,
but it does not replace human design judgment.

## Proposed Readiness Lenses

The release-level review should route only into applicable lenses, but every
lens must be consciously accepted or marked not applicable:

First state the requested boundary: a development candidate, an intended
production deployment, or a customer launch. Assess the applicable obligations
of that boundary and keep findings from later delivery stages distinct. For
example, Build 3's explicit no-charge demo can pass its scoped gate without
claiming that Build 4 live subscription billing is already ready.

### Product and commercial truth

- target customer, useful outcome and pricing/marketing promises;
- complete Free/paid journeys and truthful limits;
- provider costs, refunds/cancellations and unresolved market hypotheses.

### Product experience and accessibility

- application/interaction contract conformance;
- visual design-system consistency;
- responsive, keyboard, focus, contrast, labeling and assistive-technology
  evidence proportionate to the product.

### Security and privacy

- data inventory, classification, minimization, retention and deletion;
- authentication, authorization, tenant/account isolation and session handling;
- secrets, uploads, generated files, provider callbacks/webhooks and abuse
  boundaries;
- negative tests, safe diagnostics, dependency/configuration review and
  incident/recovery ownership.

### Legal and commercial disclosures

- public business identity and contact/support route;
- privacy, terms and cookie/consent requirements where applicable;
- price, tax, renewal, cancellation, refund and digital-delivery disclosures;
- email/marketing consent, user-uploaded or AI-generated content rights and
  relevant provider/platform terms;
- jurisdiction-specific questions explicitly escalated to qualified counsel
  when primary sources and repository facts cannot establish the answer.

This lens produces an evidence-backed readiness checklist, not legal advice or
an invented guarantee of compliance.

### Operations and production

- production domains, provider configuration, deploy/smoke/rollback evidence;
- support, analytics, monitoring, backoffice and actionable alerts;
- data recovery, ownership of recurring work and known manual procedures;
- explicit separation between development evidence and production evidence.

## Research Findings

Independent product-design, readiness and public-skill research completed on
2026-10-03 supports the modular four-skill direction. The strongest correction
is that agent review is not user or market validation. The skills may prepare
research, inspect evidence and synthesize supplied observations, but must never
invent participants, quotes, task-success data, willingness to pay or product-
market fit.

### Additional lifecycle concerns

- **Whole-service and multi-actor journeys**: include recipient actions,
  provider handoffs, email, support, offline/manual steps and recovery rather
  than stopping at the first actor's successful submission.
- **Information architecture and content design**: own terminology, labels,
  navigation, findability, help, validation, error and completion copy—not only
  visual styling.
- **Interruption and recovery**: define back/refresh/retry/cancel, partial save,
  stale state, session expiry, provider return, degraded connectivity and later
  re-entry.
- **Real-user evidence**: prepare realistic task-based usability studies and
  preserve consent, recording, privacy and retention decisions. Expert review
  and automated checks never become a claim that users find the product usable.
- **Supported environments**: keep a dated browser/device/input/assistive-
  technology matrix based on users and evidence; review reflow, zoom,
  orientation, text expansion and reduced motion rather than only screenshots
  at two named devices.
- **Performance and capacity as experience**: set proportionate budgets and
  measure real tasks, mobile/desktop loading, interactivity and layout stability;
  add field evidence when real traffic exists.
- **Outcome measurement**: decide which completion, failure, abandonment,
  satisfaction, support, acquisition and commercial measures answer an explicit
  Business question before collecting analytics.
- **Evidence freshness**: record commit/deployment, date, browser/viewport,
  actor/account/role/plan/state and artifact location. Old evidence cannot
  silently certify later behavior.
- **Governance and ownership**: assign owners for product, security, privacy,
  operations and support as relevant. Accepting a material risk that needs
  authorized judgment records its decision-maker and rationale, with controls
  and a review date where useful. Ordinary residual limitations do not create
  an extra approval gate; Codex cannot silently waive an actual requirement.
- **Complete customer lifecycle**: cover onboarding, recovery, upgrade,
  downgrade, cancellation, export/deletion, team departure and account closure.
- **Abuse, fraud and safety**: consider spam, credential/payment/cost abuse,
  user-uploaded or generated content misuse and reporting/blocking where
  applicable.
- **Data, dependency and AI lifecycle**: inventory purposes, vendors, data
  sharing, retention/deletion, backups, licensing, outages, quotas, spend caps,
  exit paths, AI provider data use, unsafe output, provenance and IP boundaries.
- **Integrity and release controls**: cover idempotency, concurrency,
  reconciliation, migrations, exact deployed artifact/configuration, rollback,
  restoration, incident communication and provider failure.

### Risk-profiled readiness dossier

The final readiness artifact should not be a flat universal checklist or an
opaque score. Start with an applicability profile covering seller/entity,
B2C/B2B, served markets, age groups, data classes, money flow, vendors, AI/UGC
and availability impact. Each relevant item records:

`status | applicability reason | owner | dated evidence | release version | remediation`

Allowed statuses are `pass`, `fail`, `unverified`, `not-applicable` and
`accepted-risk`. An applicable check that could not run is `unverified`, with
the reason, its effect on the requested boundary and the next useful check.
Unknown is never silently converted to not applicable. An accepted material
risk also records the named authorized decision-maker, rationale, any
compensating control and review date. Ordinary optional product review is not
turned into a risk-approval dependency.

Begin with the product promises, relevant safety/accessibility boundaries,
supported environments and evidence required by the requested release scope.
Support, monitoring, deploy/recovery and vendor checks should match the
Business's actual dependencies and accepted stage. Payments/subscriptions,
cookies/advertising, children or sensitive sectors, AI/UGC, public APIs, high
availability and international sales activate deeper modules only when
applicable. These lenses do not impose one universal operations stack or
enterprise checklist.

### Durable artifact model

Maintain the following content areas, combining them into existing canonical
documents when that is simpler. They do not require five separate files:

1. **Business product contract** — the canonical product/MVP document owned by
   `design-business-mvp`: customer and problem, useful outcome, scope,
   offers/pricing/limits, promises, user stories, exclusions and acceptance.
2. **Application interaction contract** — the canonical application PRD owned
   by `design-business-app`: surfaces, navigation, meaningful states and
   consequential actions, flows, desktop/mobile behavior and traceability to
   promises, with wireframes where useful.
3. **Design-system contract** — the product-specific visual and interaction
   choices created or maintained by `design-business-app`; implementation
   tokens/components remain the exact executable source for reusable values.
4. **Promise/readiness evidence record** — a dated review dossier maintained by
   the two review skills and tied to exact commits, deployments and review
   scope. It records evidence, findings, fixes, residual risks and freshness; it
   does not rewrite the intended product behavior.
5. **Assumption and learning ledger** — hypotheses and evidence maintained by
   product design and future demand-validation work, distinguishing desk
   research, user observation, activation and real payment. A section in the
   product document is sufficient until a separate ledger helps.

In this repository, Business-owned canonical documentation belongs beside its
code under `projects/<business>/`. Start with files that have useful content;
split them only as the product warrants. A possible layout is:

```text
projects/<business>/
  README.md
  docs/
    product.md               # includes assumptions and learning initially
    application.md           # includes visual/interaction choices initially
    architecture/
      overview.md            # can initially include tables and APIs
      data-model.md          # split when explanation becomes substantial
      api.md                 # split when explanation becomes substantial
    research/                # create when there is actual research
    reviews/                 # dated evidence for actual review candidates
    operations/              # create when an actual runbook is needed
  backend/
  workloads/
  libs/
  e2e/
```

The project `README.md` is a short router to the canonical documents, major run
commands and ownership boundaries. For a simple Business, the design-system
contract may remain a clearly bounded section of `application.md` until it
becomes large or shared enough to need a separate file. Review evidence should
be append-only or dated by candidate so a later review cannot silently
overwrite what an earlier release actually proved. Accepted research
conclusions move into `product.md`, while sources remain in local `research/`.
Keep assumptions in `product.md` and visual choices in `application.md` until
separate `assumptions.md` or `design-system.md` files materially help. Do not
create empty template directories.

### Technical explanations and their owner

Business-local architecture explains the actual system rather than duplicating
shared BFF specifications:

- **Overview** covers components, trust/data ownership, dependencies,
  deployment boundaries and important flows, linking shared BFF decisions.
- **Data model** explains why each Business table exists, relationships,
  account/user scope, lifecycle, access patterns and important invariants.
  Schema and validators remain the exact field/type source.
- **API explanation** identifies consumers, capabilities, authentication/account
  scope, consequential effects, errors, retries/idempotency and compatibility.
  Include native Convex query/mutation/action contracts as well as HTTP when
  applicable; link types and code instead of transcribing every internal
  function.

Existing planning and execution workflows own updating these explanations when
implementation changes the relevant boundaries. Readiness checks their
freshness. No additional architecture skill is needed. Operations explains how
to deploy, monitor, troubleshoot and recover the product; architecture explains
how the product's components and contracts fit together.

The separation rule is ownership, not document type:

- if only one Business owns and changes it, keep it under that Business project;
- if several Businesses or the shared BFF depend on it, keep one canonical copy
  in the root shared documentation and link to it from each Business;
- when a local rule becomes genuinely shared, promote it rather than copying it;
- do not duplicate the same product truth in both root `docs/` and a project.

There is an explicit exception under the current repository rules: dated agent
work records and accepted ADRs retain their root locations. Canonical Business
docs can become local without silently changing work-artifact discovery.
Business-local plans, brainstorms or ADRs would require a separately accepted
change to `AGENTS.md` and the relevant discovery/template instructions.

Existing repository artifacts keep their current responsibilities:

- `.agent/brainstorms/YYMMDD-*.md` records active exploration and accepted
  reasoning;
- `.agent/plans/YYMMDD-*.md` records implementation-ready work and validation,
  not canonical product truth;
- architecture decisions belong in `docs/architecture/adr/` only when an
  accepted technical boundary merits an ADR;
- shared platform operations belong in root `docs/operations/`, while
  Business-only runbooks belong in `projects/<business>/docs/operations/`;
- factory-wide delivery policy remains under root `docs/factory/`;
- `STATUS.md` remains only the short current handoff.

A later document relocation must preserve dated filenames, creation dates,
baselines and historical decisions; update incoming and outgoing relative
links, literal paths in routers/instructions and relevant code/configuration
references together. Retire old canonical locations with clear routing rather
than retaining two independent copies. Do not move factory-wide delivery,
shared source provenance or BFF contracts merely because they mention one
Business.

Small features update the affected canonical sections and review evidence; they
do not create a fresh PRD or duplicate contract. A new plan is created only when
the implementation work needs one. Every review report states whether it was a
full-application or feature/delta review and links the exact contract version,
commit and deployment it assessed.

A later `validate-business-demand` skill is the most plausible fifth lifecycle
skill. It would design and analyze interviews, concierge/file pilots,
willingness-to-pay tests, acquisition experiments and post-launch evidence while
preserving authority boundaries for outreach and spending. Defer creating it
until the first four skills work, but do not overload `design-business-mvp` with
false market-validation claims.

### External evidence used

- The [GOV.UK Service Standard](https://www.gov.uk/service-manual/service-standard)
  separates user needs, whole journeys, simplicity, accessibility, security,
  success measures and reliable operation, and its
  [usability guidance](https://www.gov.uk/service-manual/service-standard/point-4-make-the-service-simple-to-use)
  requires frequent testing with actual and potential users across relevant
  devices.
- [WCAG 2.2](https://www.w3.org/WAI/standards-guidelines/wcag/) supplies stable,
  testable accessibility criteria, while W3C's
  [evaluation guidance](https://www.w3.org/WAI/test-evaluate/) makes clear that
  tools alone do not establish conformance.
- [USWDS design principles](https://designsystem.digital.gov/design-principles/)
  support user-centred, accessible and continuous design-system governance;
  GOV.UK's [components](https://design-system.service.gov.uk/components/) show
  reusable components paired with usage and research guidance.
- [Core Web Vitals](https://web.dev/articles/vitals) provide current measurable
  loading, interaction and visual-stability signals, but do not replace real
  task and user evidence.
- [OWASP ASVS](https://owasp.org/projects/asvs),
  [OWASP SAMM](https://owasp.org/projects/samm) and the
  [NIST SSDF](https://www.nist.gov/publications/secure-software-development-framework-ssdf-version-11-recommendations-mitigating-risk)
  support requirements-driven security across design, implementation,
  verification and operations rather than a final informal code glance.
- Google's [reliable product launches](https://sre.google/sre-book/reliable-product-launches/)
  and [launch checklist](https://sre.google/sre-book/launch-checklist/) support
  an independent, proportional readiness pass covering capacity, dependencies,
  failure and operations.
- Official regulator guidance supports applicability-based legal/privacy review:
  the Israeli [Privacy Protection Authority](https://www.gov.il/en/departments/the_privacy_protection_authority/govil-landing-page),
  EDPB [privacy by design/default](https://www.edpb.europa.eu/topics/ai-and-technology/privacy-by-design-and-by-default_en),
  FTC [digital disclosures](https://www.ftc.gov/business-guidance/resources/com-disclosures-how-make-effective-disclosures-digital-advertising)
  and the European Commission's
  [Consumer Rights Directive overview](https://commission.europa.eu/law/law-topic/consumer-protection-law/consumer-contract-law/consumer-rights-directive_en).
  The skill must research current authoritative rules for the actual markets and
  escalate unresolved legal conclusions to qualified counsel.
- Public agent skills consistently separate PRD/product design, visual/UX
  review, security review and production readiness. Useful patterns—not trusted
  dependencies—include OpenAI's
  [product-design audit](https://github.com/openai/role-specific-plugins/blob/main/plugins/product-design/skills/audit/SKILL.md),
  Cloudflare's
  [security audit skill](https://github.com/cloudflare/security-audit-skill/blob/main/skills/security-audit/SKILL.md),
  a public [production-audit skill](https://github.com/affaan-m/ECC/blob/main/skills/production-audit/SKILL.md)
  and Anthropic's
  [legal launch-review skill](https://github.com/anthropics/claude-for-legal/blob/main/product-legal/skills/launch-review/SKILL.md).

### Skill validation approach

Create one skill at a time. For each skill:

1. define should-trigger and near-miss should-not-trigger prompts;
2. run fresh sub-agents without this brainstorm context;
3. compare representative output with a no-skill baseline;
4. assert artifact completeness, evidence labels and authority boundaries;
5. use independent qualitative review for design judgment;
6. revise and repeat before starting the next skill.

This follows the local `skill-creator` guidance: independent forward-testing is
valuable for complex judgment-heavy skills, while deterministic validation alone
cannot prove good decisions.

## Codex Self-Review and Completion Gate

User review is optional unless an accepted requirement explicitly makes a
particular human or physical check mandatory. Codex must not use “waiting for
Andrew to review” as the normal completion boundary. Before presenting a
development or production candidate, Codex should complete every safe,
authorized check it can perform and produce a compact release/change report.
This is also a cost boundary: repeatable work belongs to Codex, while Andrew may
choose to spend time on subjective judgment, physical checks, personal
authority or real-customer observation.

### What Codex must do first

Apply these checks to the declared review scope and affected dependencies.
Full-application and feature reviews have different coverage; reuse verified
unchanged evidence instead of rerunning unrelated explorations. The requested
release boundary determines which deployment and operational checks are due.

1. **Contract reconciliation**
   - Compare Business, application, interaction and design-system contracts
     with the current implementation and pricing/marketing copy.
   - Trace every accepted user story and commercial promise to visible UI,
     authoritative enforcement and current evidence.
2. **Interactive product sweep**
   - Drive every primary route and consequential action through the deployed
     app at agreed desktop and phone viewports.
   - Exercise signed-out/in, roles, plans, account states, empty/populated,
     loading/error, limits, cancellation, retry, refresh, back, deep-link and
     re-entry behavior.
   - Detect inert controls, wrong-state controls such as Login while signed in,
     dead ends, misleading labels and undiscoverable features.
3. **Visual and responsive review**
   - Capture representative evidence and inspect hierarchy, alignment, spacing,
     typography, component/state consistency, overflow, touch targets and the
     intended desktop-to-mobile transformation.
4. **Accessibility pass**
   - Run configured automation, keyboard/focus/zoom/reflow checks, labels and
     live status/error checks, contrast checks and selected screen-reader or
     accessibility-tree inspection where tools allow.
   - Report remaining manual accessibility evidence honestly; do not claim
     conformance from automation alone.
5. **Functional and security evidence**
   - Run repository formatting, lint, type, unit, integration and browser gates.
   - Verify authorization, account isolation, input/file validation, replay,
     failure and recovery paths at the appropriate test layer.
   - Review secrets/configuration, dependency changes, data flow/retention and
     relevant ASVS-style controls without exposing sensitive values.
6. **Performance and compatibility**
   - Check supported browser engines, representative narrow/wide layouts,
     production bundles, route loading, important task latency and applicable
     performance budgets.
7. **Operational candidate check**
   - Verify exact deployed version/configuration, health/synthetic probes,
     diagnostics, support path, monitoring/alert evidence, provider degradation,
     rollback and recovery procedures proportionate to the release.
8. **Defect loop**
   - In audit-only requests, stop with evidence-backed findings.
   - When the user has explicitly asked to make the candidate ready, plan and
     implement in-scope fixes, redeploy the authorized environment, rerun narrow
     checks and then rerun the applicable gate. Never silently broaden authority
     to production or external providers.

### Release/change report

The final report should contain:

- exact commit and deployed environment/version;
- what product behavior changed;
- what UI changed, including affected screens, states and responsive behavior;
- a pass/fail summary mapped to accepted promises and stories;
- the automated tests, browser journeys, visual reviews and other evidence that
  Codex actually ran;
- fixed defects and rerun evidence;
- unresolved blockers, residual risks, known limitations and unverified items,
  including why Codex could not verify each one;
- any optional human-review suggestions, clearly distinguished from required
  external authority or explicitly accepted human/physical acceptance criteria;
- no vague request to “test everything again.”

If Andrew does not review the candidate, Codex may continue within the existing
authorization and repository completion boundary based on its own evidence.
For this repository, that normally includes the intended production deployment
and production smoke verification. Optional taste or usability review does not
block completion. Codex must still stop for genuinely missing authority or an
explicit acceptance requirement it cannot satisfy, such as production approval
outside the granted scope, provider ownership verification, named acceptance of
a material risk, qualified legal approval when actually required, or a required
physical print check that has not been waived or deferred.

The gate cannot prove market demand or replace observing real target customers.
It does ensure that Andrew is never treated as the default automated tester,
responsive reviewer, permissions tester or broken-button detector. His review
can add evidence or override a subjective decision, but the candidate should
already be independently reviewed and usable without it.

## Exploration Questions — historical

1. Should `design-business-mvp` begin with a raw idea and help compare candidate
   Businesses, or start only after a Business idea has already been selected?
2. Should proportional market/user research live inside Business design while
   real demand validation remains a later separate skill, as recommended?
3. Do we need a later `release-business` skill, or are repository-specific
   runbooks and the existing production workflow sufficient?

The 2026-10-06 implementation supports a selected Business's product definition
or reconciliation, proportionate existing research and explicit learning gaps.
It does not silently choose a new Business or claim observed demand. No extra
demand-validation or release skill was created; those remain possible later
work only if real usage establishes a need. These exploration questions do
not block the accepted four-skill scope.

## Astra Review — 2026-10-03

The requested independent Astra review read every one of the 62 first-party
Markdown files at baseline `0067776`, with no unread items. The full
[review and ownership map](../../docs/factory/reviews/261003-business-lifecycle-skills-astra.md)
preserves the original draft findings and recommended transition boundaries.

The four-skill direction was retained. The proposal now makes document shapes
proportional, scopes feature review and evidence reuse explicitly, names the
existing planning/execution owner for architecture/table/API explanations,
adds an `unverified` result and distinguishes development, production and
launch gates. It includes safe evidence handling and permits useful review of
an imperfectly documented app. Optional user review remains optional.

The review also found stale live READMEs, runbook/source-map guidance and an
oversized STATUS. Those findings are recorded, not silently treated as repaired.
No existing documents have moved, shared rules have not changed, and new skills
have not yet been created or behaviorally tested.

## Current Direction

### 2026-10-06 forward-test closeout

The four skills were created and structurally validated, then committed as
`b5aeae3` before independent TableCards forward-tests. Andrew's later push
request and commit-means-push preference were recorded in `42a6e33`; both
checkpoints are on `origin/feat/tablecards-application`. This did not merge or
deploy production.

Independent product/application agents reconciled the Business-local docs;
hands-on app review and Astra readiness review found important defects beyond
the passing regression suite. The [forward-test record](../../docs/factory/reviews/261006-business-lifecycle-skills-forward-tests.md)
links the outputs, supported shared-SDK inspection refinement and coverage
limits. TableCards now has product, application, architecture, operations and
dated review explanations beside its code, with root paths retained as
routers. No universal page template or additional mandatory document pack
was introduced.

This skill/documentation/review scope is complete; TableCards itself is not
ready for development acceptance because export fidelity/revision and upload
authorization defects remain. The original “functionally complete” context
snapshot is historical, not the new review verdict. Runtime fixes and their
rerun evidence are separate work; optional user review is not a gate.

### 2026-10-06 implementation handoff

Andrew explicitly requested creating/testing the four skills first and then
using them to produce TableCards documentation and review. Initial local docs
were drafted too early and remain subject to the skill-driven reconciliation.
The four repository skills are drafted and structurally validated. Andrew
requested committing the current checkpoint before forward-testing them on
TableCards; no production deployment or push is implied by that request.
The original context and Astra review below remain historical evidence.

Option B is recommended: start with `design-business-mvp`,
`design-business-app`, `review-business-app` and
`review-business-readiness`, joined by Business, application and design-system
contracts. Reuse the existing feature-planning and execution skills rather than
creating a broad `build-business` super-skill. The final readiness review uses
specialized lenses with progressive disclosure instead of loading every legal,
security, design and operations detail for every request. Consider a router or
release skill only after real usage shows a recurring gap. Preserve a later
`validate-business-demand` skill as the explicit boundary between research and
actual market validation.

## Decision Log

| Date       | Decision                                                                                                                                                              | Context                                                                                                                                                                                               |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-10-03 | Begin exploring reusable Business definition, acceptance and review skills.                                                                                           | TableCards exposed that feature delivery can be complete while release criteria remain distributed and less obvious.                                                                                  |
| 2026-10-03 | Include explicit application structure and hands-on UX review in the lifecycle.                                                                                       | A Business contract alone does not determine which pages, navigation, states and visible workflows the web app requires or prove that they work well.                                                 |
| 2026-10-03 | Treat screen composition, responsive transformation and session-aware UI as application-contract decisions.                                                           | Choosing one screen versus multiple steps, mobile versus desktop hierarchy and state-correct controls changes whether the app is understandable and usable.                                           |
| 2026-10-03 | Include low-fidelity desktop/mobile wireframes and a maintained interaction contract.                                                                                 | Stable screen, state, action and flow IDs make the product buildable and let later review compare every meaningful interactive control with intended behavior and evidence.                           |
| 2026-10-03 | Preserve design choices in a code-aligned design-system contract and review them throughout development.                                                              | Consistency requires explicit semantic choices plus rendered desktop/mobile review; feature tests alone cannot judge visual hierarchy or coherence.                                                   |
| 2026-10-03 | Add applicable accessibility, security/privacy, legal/commercial and operations lenses to release readiness.                                                          | A functional web app can still be unsafe, misleading, inaccessible or operationally unready; legal findings remain evidence/checklist items rather than legal advice.                                 |
| 2026-10-03 | Keep `review-business-app` independent and reusable during development.                                                                                               | The final readiness review consumes its evidence, but visual/UX/state defects should be found before release.                                                                                         |
| 2026-10-03 | Validate each future skill with fresh sub-agents, trigger/near-miss prompts and independent qualitative review.                                                       | These judgment-heavy skills need behavioral forward tests; structural validation alone cannot show that they make good decisions.                                                                     |
| 2026-10-03 | Make Codex self-review mandatory and Andrew's product review optional by default.                                                                                     | Codex must exhaust agent-executable checks, fix and rerun authorized defects, then report changes, evidence and residual uncertainty; it must not stop by default waiting for Andrew.                 |
| 2026-10-03 | Keep lifecycle skills outcome-oriented rather than prescribing one implementation.                                                                                    | Skills define capabilities, states, constraints and evidence; each Business may choose the fitting UI and technical solution, and accepted choices become project-specific contracts.                 |
| 2026-10-03 | Give `review-business-app` full-application and feature/delta modes.                                                                                                  | New applications need complete route/journey review, while ordinary feature work needs a faster review that still follows dependencies into shared and neighboring behavior.                          |
| 2026-10-03 | Co-locate Business-only documentation with its code under `projects/<business>/`.                                                                                     | Ownership determines location: local product, app, design, research, reviews and runbooks stay with the Business; shared BFF/factory material remains canonical at the repository root.               |
| 2026-10-03 | Revise the proposed contract after Astra's complete Markdown audit: representations and IDs are optional, and root work-record/ADR locations are explicit exceptions. | Earlier rows preserve discussion history. Current guidance uses proportional content, scoped evidence reuse, unverified outcomes and existing planning/execution ownership of technical explanations. |

## Notes

- TableCards is the first concrete example and validation source, not a template
  whose exact pricing, PDF, team or provider choices should be imposed on every
  future Business.
- A Business readiness review must distinguish implemented functionality,
  deployed development evidence, production evidence, manual human evidence and
  market evidence instead of collapsing them into one “done” label.
