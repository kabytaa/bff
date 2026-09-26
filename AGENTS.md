# Repository Instructions

At the start of work in this repository, read [STATUS.md](STATUS.md). Then read only the canonical document it points to for the active work.

Use these sources in this order:

1. `STATUS.md` — short current handoff: last completed work, immediate next moves and blockers.
2. `docs/products/tablecards-mvp.md` — canonical TableCards product decisions.
3. `docs/factory/mvp-delivery-plan.md` — delivery stages and acceptance boundary.
4. `docs/architecture/adr/` — accepted technical decisions.

After meaningful implementation or a durable decision, update `STATUS.md` before handing off. Keep it short. Record outcomes and immediate next moves; do not copy full plans, maintain a speculative backlog or turn it into a second source of product truth. If it conflicts with a canonical document, correct `STATUS.md`.

Keep durable Codex work products in the repository rather than relying on chat history or session memory:

- active explorations and their discussion decisions in `.agent/brainstorms/`
- implementation-ready plans in `.agent/plans/`
- accepted architecture decisions in `docs/architecture/adr/`
- only the short current handoff in `STATUS.md`

Name every brainstorm and implementation plan with an immutable six-digit creation-date prefix followed by its concise kebab-case topic: `YYMMDD-topic.md`. The prefix records when the artifact was created and must never change when the document is updated, accepted, completed or superseded. Record the full `YYYY-MM-DD` creation and last-updated dates inside the document; lifecycle status inside the artifact remains authoritative. Continue an existing artifact instead of creating a new dated copy when the same discussion or plan evolves.

When creating or materially expanding an Nx project, assess its local documentation before handoff. Add or update the nearest `README.md` when the project introduces non-obvious setup or run commands, public contracts, operational procedures, troubleshooting or ownership boundaries that are not already clear from root documentation and project configuration. Otherwise keep the root README as the router and avoid boilerplate project READMEs that will drift. Add a nested `AGENTS.md` only when a subtree needs genuinely different commands, conventions or safety rules; keep status and architecture in their canonical documents rather than duplicating them there.

Do not delete a brainstorm, plan or accepted decision record merely because it is old or replaced. Mark it `Accepted`, `Completed` or `Superseded`, add the date and link to the successor when applicable, and preserve the earlier reasoning. Each brainstorm and plan must include its creation/update dates, lifecycle status, repository baseline and a concise snapshot of the known repository state when the decisions were made. Keep dated decisions or revisions in the artifact so later work can distinguish historical context from the current `STATUS.md` handoff.

During product brainstorming, selectively consult relevant personas from the community [Agency Agents](https://github.com/msitarzewski/agency-agents) catalog when their perspectives would improve the discussion. Use them as additional review lenses, not as authoritative sources; repository decisions and official primary documentation take precedence. Do not install or load the entire catalog by default.

During brainstorming, explicitly decide where each operational action belongs: a Codex/operator CLI, the read-oriented backoffice dashboard or a product-facing interface. Favor self-managing businesses: keep repeatable configuration and lifecycle work in validated automation that Codex can run, show essential state in the dashboard, and add web controls only for actions that genuinely need human judgment or direct operator handling.

Nirvana is only for short personal blockers Andrew must complete outside the conversation. Keep Codex work, discussion topics and conversational reviews out of Nirvana.

Never place credentials, access tokens, identity documents or payment details in repository files.

Keep reviewed non-secret identifiers and configuration that are intentionally identical in every BFF deployment in `@bff/static-config`. Use environment variables for credentials and values that genuinely differ by deployment. Keep ordinary implementation constants beside the code that owns them rather than turning the static configuration module into a catch-all.

Treat implemented work as complete only after the intended production deployment and production smoke verification pass, unless the accepted scope explicitly ends before production. Local and development validation are intermediate gates, not completion.
