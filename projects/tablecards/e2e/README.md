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
