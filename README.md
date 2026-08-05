# Stockora

Smart Retail POS & Inventory — a multi-tenant cloud POS, inventory, and retail-management
platform built for apparel, footwear, and modern retail businesses.

See [`ARCHITECTURE.md`](./ARCHITECTURE.md) for the full technical architecture, data model,
multi-tenant/permission/AI/QR design, page map, and phased build plan. This README covers local
setup.

## Stack

Next.js 16 (App Router) · TypeScript · Tailwind CSS v4 · Prisma 7 + PostgreSQL · Auth.js v5 ·
Zod · React Hook Form · Recharts · TanStack Table/Query.

## Prerequisites

- Node.js 20+
- PostgreSQL — either installed locally, or via the bundled Docker setup below

## Quick start

If you have Docker, this is the whole thing:

```bash
npm install
cp .env.example .env          # defaults already match the Docker database
docker compose up -d --wait   # starts PostgreSQL on :5432
npx prisma migrate deploy     # creates the schema
npm run db:seed               # demo business, products, sales, roles
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

**Demo login** (created by the seed script): `owner@stockora-demo.com` / `Stockora123!`

Generate a real `AUTH_SECRET` with `npx auth secret` — the placeholder in
`.env.example` is fine for local use but must never reach a deployment.

### Without Docker

Point `DATABASE_URL` at any PostgreSQL instance you already have and skip the
`docker compose` line. The database named in the URL must exist before you run
the migration; Prisma creates tables, not databases.

### Stopping and resetting

```bash
docker compose down      # stop the database, keep the data
docker compose down -v   # stop and delete the data, for a clean re-seed
```

### Troubleshooting

| Symptom | Cause |
| --- | --- |
| `Can't reach database server at localhost:5432` | PostgreSQL isn't running — `docker compose up -d --wait` |
| `UntrustedHost` after `npm run build && npm run start` | Production mode behind a proxy needs `AUTH_TRUST_HOST=true`. Not needed for `npm run dev`. |
| Login rejects the demo password | The seed hasn't run, or the database was reset — re-run `npm run db:seed` |
| A new screen 404s for an existing tenant | New permissions need `npm run db:sync-permissions` |

## Environment variables

See [`.env.example`](./.env.example) for the full list. `DATABASE_URL` and `AUTH_SECRET` are
required; everything else (Google login, transactional email) degrades gracefully when unset.

## Scripts

| Script              | Purpose                                          |
| -------------------- | ------------------------------------------------- |
| `npm run dev`         | Start the dev server (Turbopack)                   |
| `npm run build`       | Production build                                   |
| `npm run start`       | Run the production build                            |
| `npm run lint`        | ESLint                                              |
| `npm run typecheck`   | `tsc --noEmit`                                      |
| `npm test`            | Unit tests (tax, money, commission, validation)     |
| `npm run db:migrate`  | Create/apply a Prisma migration                     |
| `npm run db:push`     | Push the schema without a migration (prototyping)   |
| `npm run db:seed`     | Run `prisma/seed.ts`                                 |
| `npm run db:studio`   | Open Prisma Studio                                   |
| `npm run db:sync-permissions` | Re-sync system roles after a release adds permissions |

## Notes for anyone continuing the build

- Prisma 7 requires a driver adapter at runtime (`@prisma/adapter-pg`) — see
  `src/lib/prisma.ts` and the note at the bottom of `ARCHITECTURE.md`.
- Next.js 16 renamed `middleware.ts` to `proxy.ts` — the optimistic auth redirect lives in
  `src/proxy.ts`. Real authorization is enforced server-side in `src/lib/tenancy.ts`, never in
  the proxy.
- `src/lib/nav.ts` is the single source of truth for the authenticated app's sidebar and route
  slugs — add a module there and it appears in the sidebar, the mobile drawer, and gets a real
  (auth-gated) route automatically via `app/(app)/[module]/page.tsx` until it has a dedicated
  implementation.

## Deployment

Any Next.js-compatible host (Vercel, etc.) works. You'll need a managed PostgreSQL instance and
the environment variables above configured in the hosting provider, then run
`npx prisma migrate deploy` as part of your release step before starting the app. See
[`DEPLOYMENT.md`](./DEPLOYMENT.md) for the full release checklist (env vars, migration step,
production hardening notes).
