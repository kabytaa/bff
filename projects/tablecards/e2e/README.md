# TableCards hosted development acceptance

This project drives the deployed TableCards development surfaces through the
real BFF development-auth handoff, same-site gateway, TableCards Convex backend,
server-generated PDF export, development offer projection and deterministic AI
provider. Normal regression explicitly chooses the no-inference fixture engine;
it never uses Google, OpenAI or a real payment provider.

Run after all development surfaces are deployed:

```bash
pnpm test:e2e:tablecards-hosted
```

The local development signing key remains outside Git. Production cannot trust
these grants. For the same
reason, this hosted suite is deliberately separate from the self-contained
`pnpm check` CI gate; CI never receives the development signing key.
Artifacts go to this project's ignored `test-results/`, separate from local
browser suites so concurrent validation cannot delete hosted traces.

`src/support/coverage.ts` is the executable acceptance registry for PRD stories
US-01 through US-20. Four cohesive story journeys run in desktop Chromium and
mobile WebKit and cover public creation/import/authentication, Free and Event
Pass projects, Planner Pro and Studio mock subscriptions, reusable and
event-scoped artwork, AI reservation behavior, navigation, account isolation,
member invitations/roles/removal and protected ownership transfer. A separate
CSV browser case and the coverage-registry assertion run in both devices as
well.

Seven focused legacy regression cases continue to run in desktop Chromium for
the public print-test PDF, 320-pixel containment, anonymous draft restoration,
stored PDF bytes, Free access guidance, professional project/preset/AI behavior
and Studio invitation acceptance. Eight remediation cases (four journeys on
each device) additionally inspect actual edited PDF title/guest multiplicity,
unauthenticated and post-logout private byte denial, policy/design/navigation
actions, explicit fit failures and the paid 500-card ceiling with embedded
fonts. Together the hosted command executes 27 cases: 17 desktop and 10 mobile.
The Studio owner and member contexts both inherit the selected desktop/mobile
device settings. The creator checks keep the whole page within
phone and desktop viewports while allowing only the design carousel to scroll
horizontally. Two additional manual AI test cases are skipped by default.

The manual AI test is an automated browser check that an operator deliberately
starts; it calls the real Cloudflare provider, not fixtures. "Manual" describes
how the run is triggered, not manual execution of each browser step.

Only with explicit provider-spend authority and available daily budget:

```sh
TABLECARDS_TEST_MANUAL_AI=true pnpm exec playwright test \
  --config projects/tablecards/e2e/playwright.config.ts \
  projects/tablecards/e2e/src/manual-ai.spec.ts
```

This makes two four-image batches total: desktop text-only artwork and mobile
company-style reference preparation/removal/generation. It verifies actual image
pixels, stored choices, one unit consumed and signed-in route navigation. The
deployment-wide safety budget applies ($1/day, up to 138 starts in development). Ordinary CI/regression must not
set this flag or spend AI credits; see [Operations](../docs/operations.md#cloudflare-ai-budget-and-reference-images).

The Studio journeys complete the shared BFF checkout through the visible UI;
completion atomically applies the five-seat/Admin/invitation policy alongside
the product grant. They do not use an operator-policy fixture to bypass that
customer workflow. `$5`, `$9/month` and `$19/month` activation is an
explicit no-charge development provider simulation. Live Paddle checkout,
webhooks, failed renewal and subscription remediation remain Build 4 and are
never implied by this suite.

## Production public smoke

```sh
pnpm exec playwright test --config projects/tablecards/e2e/playwright.production.config.ts
```

This isolated configuration runs six public cases (three journeys on Chromium
and mobile WebKit). It checks pricing, guest input/preview, absent dev controls,
policies, containment and the production TableCards-branded Google handoff.
It does not import development grants, use customer credentials, issue a charge
or generate AI. It stops before Google authentication, so it does not establish
a fresh production authenticated export/checkout/team journey. Its artifacts
remain ignored under `test-results/production`; do not commit cookies or traces.
