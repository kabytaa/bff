# TableCards hosted development acceptance

This project drives the deployed TableCards development surfaces through the
real BFF development-auth handoff, same-site gateway, TableCards Convex backend,
server-generated PDF export, development offer projection and deterministic AI
provider. It never uses Google, OpenAI or a payment provider.

Run after all development surfaces are deployed:

```bash
pnpm test:e2e:tablecards-hosted
```

The local development signing key remains outside Git. Production cannot trust
these grants and Build 3 has no production TableCards deployment. For the same
reason, this hosted suite is deliberately separate from the self-contained
`pnpm check` CI gate; CI never receives the development signing key.

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
horizontally.

The Studio journeys complete the shared BFF checkout through the visible UI;
completion atomically applies the five-seat/Admin/invitation policy alongside
the product grant. They do not use an operator-policy fixture to bypass that
customer workflow. `$5`, `$9/month` and `$19/month` activation is an
explicit no-charge development provider simulation. Live Paddle checkout,
webhooks, failed renewal and subscription remediation remain Build 4 and are
never implied by this suite.
