# TableCards web

The accepted customer-facing pages, navigation, responsive behavior and user
stories are defined in the repository-level
[`TableCards Application PRD`](../../../../docs/products/tablecards-application-prd.md).
Canonical offer and product decisions remain in the
[`TableCards MVP specification`](../../../../docs/products/tablecards-mvp.md).

This React application has lazy public and signed-in route shells. `/` is the
concise landing page; `/create` is the public three-step creator; `/projects`
and `/projects/:projectId` manage saved work; `/designs` manages predefined and
reusable designs; `/settings` shows plan/usage; `/settings/team` manages Studio
membership; and `/invite/:invitationToken` completes invitation acceptance.
Import, mapping, design selection and complete sheet preview work before
authentication. Save, PDF export, artwork upload, AI generation and development
offer selection call the TableCards Convex backend with the current BFF account
context.

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

`VITE_TABLECARDS_DEV_CONTROLS=true` shows the development offer selector only
on Account. It is
not an authorization boundary: the backend independently denies mock grants
unless both the deployment and registered Business environment are explicitly
development-enabled. Build 3 ships no production TableCards manifest.

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
workspace. It still permits owning only one account. Account/security policy is
configured through the validated operator workflow and is not changed by
selecting a mock product offer.

The same-site cookie endpoint is the separate fixed-route session gateway at
`api.tablecards-dev.tofler.app`; product Convex calls do not use that proxy.
