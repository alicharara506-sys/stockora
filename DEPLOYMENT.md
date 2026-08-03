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
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | Optional | Omit both to hide the Google login button. |
| `RESEND_API_KEY` / `EMAIL_FROM` | Optional | Without a key, auth emails are logged server-side instead of sent — fine for a demo, not for real users. |
| `ANTHROPIC_API_KEY` / `ANTHROPIC_MODEL` | Optional | Without a key, the AI assistant chat still works but replies that it isn't connected. |

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

Seeding (`npx prisma db seed`) is a local/demo convenience (creates the demo business, system
roles, and plans) — don't run it against a production database that already has real tenants.

## 4. Production checklist

- [ ] `AUTH_SECRET` is unique to this environment and not checked into any repo.
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
