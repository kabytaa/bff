# TableCards web

The accepted customer-facing pages, navigation, responsive behavior and user
stories are defined in the Business-local
[`TableCards Application PRD`](../../docs/application.md).
Canonical offer and product decisions remain in the
[`TableCards MVP specification`](../../docs/product.md).

This React application has lazy public and signed-in route shells. `/` is the
concise landing page; `/create` is the public three-step creator; `/projects`
and `/projects/:projectId` manage saved work; `/designs` manages predefined and
reusable designs; `/settings` shows plan/usage; `/settings/team` manages Studio
membership; and `/invite/:invitationToken` completes invitation acceptance.
Import, mapping, design selection and complete sheet preview work before
authentication. Save, PDF export, artwork upload and AI generation call the
TableCards Convex backend with the current BFF account context. Paid pricing
actions ask the backend for a BFF checkout URL and navigate away; this app does
not render mock or provider payment UI.

Uploads and private artwork/PDF bytes use authenticated TableCards HTTP routes;
the browser adapter manages disposable blob URLs. See the canonical
[Architecture](../../docs/architecture.md) and coordinated deployment procedure
in [Operations](../../docs/operations.md).

The landing page imports the lightweight `@tablecards/core/catalog` entry only.
Spreadsheet/PDF editor code and team-management route code stay behind lazy
route boundaries rather than entering the first public page download.

## Local setup

Copy `.env.example` to a local Vite environment file and fill in only public
origins/identifiers. Do not store credentials here.

For an HTTP localhost preview, set `VITE_TABLECARDS_WEB_ORIGIN` to the
registered HTTPS development web origin. Sign-in will return to that hosted
origin; this override is for local rendering, not a second callback URL.

```bash
pnpm exec nx run tablecards-web:serve
pnpm exec nx run tablecards-web:test
pnpm exec nx run tablecards-web:build
```

The protected draft is a bounded versioned `sessionStorage` value written only
when a public guest list crosses the sign-in boundary. Guest content is never
put in a URL, `localStorage`, analytics, or an AI prompt. The backend remains
authoritative for project/card/design limits and validates every uploaded file.

`VITE_TABLECARDS_DEV_CONTROLS=true` enables development-only product tools such
as deterministic AI and the print trial. It is not an authorization boundary.
Mock commerce is owned and separately enabled by BFF; TableCards receives only
a provider-neutral checkout URL.

Development controls also expose a six-card US Letter landscape print trial.
The web build generates
`dist/projects/tablecards/workloads/web/six-card-landscape-print-test.pdf`, so
the hosted sample is available without backend authentication. Keep this asset
and the layout selector development-only until an Actual Size physical print
confirms the 0.25 inch edge clearance.

## Deployment

Build with the public development variables, then publish the static assets:

```bash
pnpm exec nx run tablecards-web:build
pnpm exec wrangler deploy \
  --config projects/tablecards/workloads/web/wrangler.jsonc \
  --assets dist/projects/tablecards/workloads/web
```

The development Business auth definition permits at most two memberships per
user: the automatically created private workspace plus one invited Studio
workspace. It permits owning up to two accounts so the invited workspace can
be transferred to a member who already owns their private workspace; ordinary
users still cannot create additional accounts. Completing Studio checkout
atomically applies its five-seat, Admin and invitation policy; ordinary policy
configuration remains available through the validated operator workflow.

The same-site cookie endpoint is the separate fixed-route session gateway at
`api.tablecards-dev.tofler.app`; product Convex calls do not use that proxy.
