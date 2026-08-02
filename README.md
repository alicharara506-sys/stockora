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
- A PostgreSQL database (local or hosted)

## Setup

```bash
npm install
cp .env.example .env   # then fill in DATABASE_URL and AUTH_SECRET at minimum
npx prisma migrate dev # creates the schema
npx prisma db seed     # seeds a demo business + system roles + plans
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

**Demo login** (created by the seed script): `owner@stockora-demo.com` / `Stockora123!`

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
| `npm run db:migrate`  | Create/apply a Prisma migration                     |
| `npm run db:push`     | Push the schema without a migration (prototyping)   |
| `npm run db:seed`     | Run `prisma/seed.ts`                                 |
| `npm run db:studio`   | Open Prisma Studio                                   |

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
`npx prisma migrate deploy` as part of your release step before starting the app.
