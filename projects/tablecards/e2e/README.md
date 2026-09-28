# TableCards hosted development acceptance

This project drives the deployed TableCards development surfaces through the
real BFF development-auth handoff, same-site gateway, TableCards Convex backend,
server-generated PDF export, development offer projection and deterministic AI
provider. It never uses Google, OpenAI or a payment provider.

Run after all development surfaces are deployed:

```bash
pnpm exec nx run tablecards-e2e:e2e-hosted-development
```

The local development signing key remains outside Git. Production cannot trust
these grants and Build 3 has no production TableCards deployment.

The hosted suite runs five scenario-sized journeys in both Chromium and WebKit:
the public print-test PDF, compact mobile creator and lazy landing boundary,
anonymous draft through sign-in and stored PDF, professional project/preset/AI
workflow, and Studio invitation acceptance plus role promotion. The Studio
scenario provisions its explicit five-seat/Admin/invitation policy through the
validated operator CLI; choosing the Studio mock offer never changes security
policy.
