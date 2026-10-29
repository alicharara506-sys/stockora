# Deploying Stockora

This covers taking Stockora from local dev to a production deployment. For architecture and data
model background, see [`ARCHITECTURE.md`](./ARCHITECTURE.md); for local setup, see
[`README.md`](./README.md).

## 1. Prerequisites

- A managed PostgreSQL 16+ instance (Neon, Supabase, RDS, Railway, etc.), reachable from your
  hosting provider.
- A Next.js-compatible host (Vercel is the reference target; any Node 20+ host that can run
  `next build` / `next start` works).
- An SMTP-compatible transactional email provider (Resend is wired up out of the box) if you want
  real verification/reset emails instead of console-logged links.

## 2. Environment variables

Copy `.env.example` and fill in every value below for a production deployment.

| Variable | Required | Notes |
| --- | --- | --- |
| `DATABASE_URL` | Yes | Postgres connection string. Include `?sslmode=require` for most managed providers. |
| `NEXT_PUBLIC_APP_URL` | Yes | The public URL of the deployment — used to build absolute links in emails, QR codes, and the API reference panel. Must match the real domain in production (QR tokens embed this). |
| `AUTH_SECRET` | Yes | Generate a fresh one per environment: `npx auth secret` or `openssl rand -base64 32`. Never reuse the dev value in production. |
| `AUTH_TRUST_HOST` | Yes, behind a proxy | Set to `true` when the app runs behind a reverse proxy or in a container (Docker, Fly, Railway, self-hosted). Without it, a production build rejects every request with `UntrustedHost` and login is impossible. Vercel sets this automatically, so it can be omitted there. |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | Optional | Omit both to hide the Google login button. |
| `RESEND_API_KEY` / `EMAIL_FROM` | Optional | Without a key, auth emails are logged server-side instead of sent — fine for a demo, not for real users. |
| `GROQ_API_KEY` | Required for AI | Create a key at https://console.groq.com/keys. Keep the account on Groq's Free plan for quota-limited free inference. Without a key, chat displays a connection-needed message. |
| `GROQ_MODEL` | Optional | Defaults to `openai/gpt-oss-120b`. Choose a model available to your Groq account. There is no automatic fallback to another provider. |

Set these in your hosting provider's environment/secrets UI — never commit a filled-in `.env`.

## 3. Release steps

```bash
npm ci
npx prisma migrate deploy   # applies pending migrations without prompting — safe for CI/CD
npm run build
npm run start               # or let your host's Next.js runtime start the server
```

`prisma migrate deploy` (not `migrate dev`) is the one to run in CI/CD — it never generates a new
migration or prompts, it only applies what's already committed under `prisma/migrations/`.

After a release that introduces new permissions, also run:

```bash
npm run db:sync-permissions
```

System roles are seeded once when a business signs up, so existing tenants keep their old grants
until this runs — new screens stay invisible to them otherwise. It only rewrites system roles
(Owner, Admin, Manager, ...); custom roles a business created are left untouched.

Seeding (`npx prisma db seed`) is a local/demo convenience (creates the demo business, system
roles, and plans) — don't run it against a production database that already has real tenants.

## 4. Production checklist

- [ ] `AUTH_SECRET` is unique to this environment and not checked into any repo.
- [ ] `AUTH_TRUST_HOST=true` is set if deploying anywhere other than Vercel — verify by loading the
      login page on the real domain and signing in, not just by checking the process starts.
- [ ] `DATABASE_URL` points at a database with TLS enabled and automated backups.
- [ ] `NEXT_PUBLIC_APP_URL` matches the real public domain (affects QR code targets and email links).
- [ ] Migrations are applied via `prisma migrate deploy` in the release pipeline, not manually.
- [ ] A real email provider is configured — the console-log fallback is dev-only.
- [ ] If you expect more than one running instance: the login rate limiter
      (`src/lib/rate-limit.ts`) is in-memory and per-instance. Behind a load balancer with N
      instances, the effective limit is N× the configured value. Replace it with a shared store
      (Redis, etc.) behind the same `checkRateLimit` signature if that matters for your threat
      model.
- [ ] Subscription billing runs in **manual mode** (`src/server/actions/billing.ts`) — plan changes
      apply immediately and record a `PAID` invoice with no real payment collection. Wire in a real
      provider (Stripe, etc.) before charging real customers; the `Subscription`/`Invoice` schema
      and the settings UI are already shaped for it (`provider`, `providerCustomerId`,
      `providerSubscriptionId`, `providerInvoiceId` fields exist for this purpose).
- [ ] Rotate any API keys (`/integrations`) issued during testing before go-live — they're
      bcrypt-hashed at rest but should still be treated as compromised if shared.

## 5. Observability

- `AuditLog` records sensitive changes (role/permission edits, business profile changes, team
  member role changes) — query it per business for a lightweight activity trail.
- `QRScan` records every scan attempt (success, expired, revoked, not-found) with a hashed IP, for
  QR abuse investigation.
- Server logs: Next.js request logs go to stdout — pipe them into your host's log aggregation.

## 6. Security headers

`next.config.ts` sets `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, and a
conservative `Permissions-Policy` on every response. If you put Stockora behind a CDN/WAF, confirm
it doesn't strip these.

## 7. OLON free testing deployment

The repository's `render.yaml` configures a single free Render web service in Frankfurt for
`https://stockora.olonagency.com`. Import the repository as a Render Blueprint, select the
`claude/stockora-brand-components-7ureyx` branch, and keep the compute plan on Free.

Create a separate Neon Free PostgreSQL project in the same region. Supply its connection string
as `DATABASE_URL`, including the TLS parameters supplied by Neon, and supply `GROQ_API_KEY` through
Render's secret environment variables. The Blueprint generates a new `AUTH_SECRET`; never copy
the local `.env` into Git or reuse its local database URL.

The build installs development dependencies for TypeScript and Prisma generation, then builds
Next.js with Webpack. Free Render instances do not have a pre-deploy step, so the start command
applies the committed migrations before starting the server. Next.js reads Render's `PORT`
automatically. Do not run the demo seed on the public database: it creates a publicly documented
demo password. Create your own account through the signup/onboarding flow instead.

Once Render assigns the service its `onrender.com` hostname, add the custom domain in the service's
Settings if it was not added by the Blueprint. In GoDaddy DNS for `olonagency.com`, add a CNAME
with Name `stockora` and Value equal to that exact Render hostname (no `https://` or path).
Verify the custom domain in Render and wait for its managed TLS certificate. Test the HTTPS
login, onboarding, and an AI question on the final domain.

This is a testing setup: Render Free can sleep after 15 minutes of inactivity, and Neon Free can
suspend compute when idle or when its quotas are exhausted. Account limits can change; check the
provider dashboards before upgrading. Signup verification and password-reset emails require
`RESEND_API_KEY` and a verified `EMAIL_FROM` sender; without them, the existing app logs the
links in the private server logs rather than delivering mail.

Provider references: [Render Free](https://render.com/docs/free),
[Render custom domains](https://render.com/docs/custom-domains), and
[Neon plans](https://neon.com/docs/introduction/plans).
