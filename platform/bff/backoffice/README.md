# Shared operator backoffice

The admitted-operator React app presents all-Business and environment-scoped
overview, Support, Customers, Activity and Bots views. It consumes public scoped
BFF queries; neither the browser nor the AI grants permissions.

Business KPI labels/event definitions come from validated Business settings,
not imports of product code. The compact overview table pairs seven-day counters
with linear trends for seven consecutive 24-hour intervals, oldest to newest.
Each trend uses its own scale and the same bounded sample as its counter;
partial values/trends are labelled. Definitions and dated counts are expandable.
Customers shows **Business events** before workspace/support details, with
readable labels, properties, references and a link to paginated customer-only
history. Events without a verified customer link are not assigned by guesswork.
Support has one current draft; Review shows the exact envelope,
and explicit Send is the operator's approval. Notes remain operator-only.

Run under Node24: `pnpm exec nx run bff-backoffice:test`, `:typecheck`, `:lint`
and `:build`. Production builds exclude development authentication. Hosted
development uses `:build-development-auth` and
[the authenticated smoke runbook](../../../docs/operations/development-authenticated-smoke.md).
Only its explicit development manifest targets `ops-dev.tofler.tech`.

Workflow/schema ownership: [Operator architecture](../../../docs/architecture/operator-work.md).
Configuration/evaluation/seed automation: [operator CLI](../../../tools/bff-operator/README.md).
Browser evidence: [e2e README](../backoffice-e2e/README.md). These commands do not
authorize a production deployment or an automatic support reply.
