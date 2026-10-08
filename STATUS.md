# Business Factory Handoff

Updated: 2026-10-08.

## Current state

- Builds 1–3 were released at their authorized production boundaries. TableCards is live in
  [production](https://tablecards.tofler.app) and
  [development](https://tablecards-dev.tofler.app) as a **no-charge preview**,
  not real billing or customer launch.
- Release `ee1e1d9` is committed/pushed and passed CI, production deployment and
  smoke. Duplicate is now labelled Make a copy, clarifying that it creates a new
  editable project rather than marking the original as a duplicate. Copying and
  Archive/Restore behavior are unchanged. Earlier editor simplification, naming
  and unsaved-change protections remain. No schema/API change or paid AI call.
- Development web identifies this release; unchanged development services retain
  their prior releases. 5 focused component tests and 2 desktop/mobile copy
  journeys passed; both layouts were inspected. Production metadata, health and
  published label match the release. Versions, limits and preceding reviews are
  in the [copy-label review](projects/tablecards/docs/reviews/261007-build-3-production-release.md#make-a-copy-terminology--2026-10-08).
- The earlier Free welcome-credit fix remains: one lifetime batch is initialized
  once, never resetting consumption or upgraded access. Its approved compatible
  enum addition required no migration; see the
  [welcome-credit review](projects/tablecards/docs/reviews/261007-build-3-production-release.md#free-welcome-credit-provisioning--2026-10-08).
- Markdown-only changes skip CI/deployment; see [CI scope](tools/production-delivery/README.md#ci-scope).
- Customer-operations and agent-organization discussion is saved as an active
  documentation checkpoint for continuation, not approved implementation.

## Immediate next work

- At the first conversation on or after **2026-10-28**, proactively revisit
  Andrew's workplace-VPN reachability issue for TableCards and related sites.
  Domains registered 2026-09-26 reach the 32-day checkpoint then; age-related
  blocking is **unconfirmed**, and automatic unblocking is not guaranteed.
  Public DNS/HTTPS checks passed. Obtain the exact VPN browser error or IT log
  when Andrew is available, then recheck; no investigation is required from him now.
- Continue the [customer-operations backoffice discussion](.agent/brainstorms/261008-customer-operations-backoffice.md),
  grounded in the single roadmap; accepted scope/history live there, not here.
  Signed-out intake remains reopened, not removed. Initial support tool calls and
  substantive replies require approval; internal advisors use agreed option 2
  for bounded approved-information research/drafts, with approval for effects.
  Latest: architect supervises proposed NOC, QA/regression and developer staff;
  project manager's primary output is verified company-wide progress from analysts.
  Product coordinates business/technical/review needs; agreed work reaches Codex
  with Andrew involved in substantive decisions initially, tuning attention later.
  Ordinary analyst context may be read across roles; private contexts stay protected.
  Andrew sets each secret's access/sharing rule; no blanket assistant exception.
  **Next compare Dots/Paperclip's private-context and outbound controls**, not
  Convex enforcement for external company bots. Dots remains the likely candidate;
  Paperclip matches the org concept, but neither's full secrecy boundary is verified.
  Exact Codex handoff, sources/budgets, role powers and final MVP inclusion remain
  open. Continue remaining intake/context/routing/evaluation questions with options
  and reasons. No provider setup, schema, schedule or implementation is authorized;
  telemetry and future CPU-only model integrations remain separate/deferred.
- Build 4 hosted payment work awaits Paddle access/confirmed terms. Monitoring
  remains later MVP work, before launch; no Pro upgrade or alert setup now.
  Telegram is selected, not configured. Early QA reports come through Andrew.

## Outstanding evidence

- Fresh authenticated production callback/export/checkout/team journeys remain
  **unverified** without personal Google credentials; the popup passes but an
  origin warning remains recorded. Development passes do not prove these flows.
- Andrew accepted his print for Build 3. Detailed physical checks remain for MVP
  launch; six-card landscape is still a development trial.

Product decisions: [TableCards Product](projects/tablecards/docs/product.md).
Technical/operational docs: [TableCards router](projects/tablecards/README.md).
Persistent workflow and safety rules: [AGENTS.md](AGENTS.md).
