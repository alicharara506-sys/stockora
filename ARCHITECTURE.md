# Stockora — Architecture

Stockora is a multi-tenant cloud POS, inventory, and retail-management platform for apparel,
footwear, and modern retail businesses. This document is the architecture reference requested
before implementation started, kept up to date as phases land.

## 1. Technical architecture

- **Framework**: Next.js 16 (App Router, Turbopack), React 19, TypeScript (strict mode).
- **Styling**: Tailwind CSS v4 (CSS-first `@theme` tokens in `globals.css`), hand-built
  shadcn/ui-style primitives in `src/components/ui` (Radix UI primitives underneath where
  interactivity is needed — Dialog, Label, etc.).
- **Data**: PostgreSQL via Prisma ORM 7. Prisma 7 requires an explicit driver adapter
  (`@prisma/adapter-pg`) rather than a bare connection string in the client — see
  `src/lib/prisma.ts`.
- **Auth**: Auth.js v5 (`next-auth@beta`) with a Credentials provider (email + bcrypt password
  hash) and an optional Google provider, `@auth/prisma-adapter` for account linking, JWT session
  strategy (required for Credentials).
- **Server logic**: Next.js Server Actions (`src/server/actions`) call into `src/lib` and Prisma
  directly for now; as modules grow, business rules move into `src/server/services` /
  `src/server/repositories` per the module boundaries below, keeping React components free of
  business logic.
- **Validation**: Zod schemas in `src/lib/validation`.
- **Charts / tables / forms** (wired for later phases): Recharts, TanStack Table, TanStack Query,
  React Hook Form + `@hookform/resolvers`.
- **QR codes**: `qrcode` (PNG/SVG generation, server-side).
- **Email**: thin `src/lib/email.ts` abstraction — swappable transport, currently wired to Resend
  with a console-log fallback in development so auth flows work without a provider configured.

## 2. Folder structure

```
prisma/
  schema.prisma        # full data model (see section 3)
  seed.ts               # demo business + plans + permissions seed
src/
  app/
    (marketing)-esque home page lives at app/page.tsx (single-page marketing site)
    (auth)/              # login, signup, forgot/reset password, verify email, accept invite
    (app)/                # authenticated shell: dark sidebar + topbar, tenant-gated
      dashboard/
      [module]/           # generic "scheduled for Phase N" stub for not-yet-built modules
    onboarding/            # create-business wizard (first step only in Phase 1)
    legal/                 # privacy / terms
    api/auth/[...nextauth]/
  components/
    ui/                  # design-system primitives (Button, Card, Badge, Logo, ...)
    marketing/            # landing page sections
    auth/ onboarding/ dashboard/  # feature-scoped components
  lib/
    auth/                # password hashing
    permissions/          # permission + system role constants and seeding
    validation/           # zod schemas
    tenancy.ts             # current-business resolution, permission checks
    prisma.ts               # Prisma client singleton (driver adapter)
    plans.ts                 # subscription plan seed data + read helpers
    nav.ts                     # single source of truth for the app sidebar / route slugs
  server/
    actions/              # "use server" mutations (auth, business, tenancy, session)
  types/                   # ambient type augmentation (next-auth session typing)
  generated/prisma/          # generated Prisma client (gitignored)
```

Business logic for modules that aren't built yet (POS, inventory, sales, ...) will live under
`src/modules/<domain>` and `src/server/services|repositories` as each phase lands, keeping
`app/` and `components/` thin.

## 3. Database entities & relationships

`prisma/schema.prisma` is the full model — it already contains every entity requested up front
(56 models) so later phases only add logic, not schema churn:

- **Identity/Auth**: `User`, `Account`, `Session`, `VerificationToken`, `PasswordResetToken`
  (Auth.js-compatible plus a custom reset-token table).
- **Tenancy**: `Business`, `BusinessMembership`, `BranchAccess`, `Role`, `Permission`,
  `RolePermission`, `Invitation`.
- **Locations**: `Branch`, `Warehouse`, `InventoryLocation` (unifies branch/warehouse for stock),
  `Register`, `RegisterSession`, `CashMovement`.
- **Catalog**: `Category`, `Brand`, `Supplier`, `Attribute`, `AttributeValue`, `SizeChart`,
  `SizeChartValue`, `Tax`.
- **Products**: `Product`, `ProductImage`, `ProductVariant`, `VariantAttributeValue` (generic
  variant↔attribute join so a variant can carry any number of attributes, not just color/size),
  `Barcode`.
- **Inventory ledger**: `InventoryBalance` (derived/cached projection), `InventoryMovement`
  (append-only ledger — the only source of truth for stock), `StockTransfer(+Item)`,
  `StockCount(+Item)`.
- **CRM**: `Customer`, `CustomerGroup`, `CustomerCreditTransaction`, `LoyaltyTransaction`.
- **Sales**: `Sale`, `SaleItem`, `Payment` (supports split/mixed payments via multiple rows),
  `Return`, `ReturnItem`, `Exchange`.
- **Expenses/Purchasing**: `ExpenseCategory`, `Expense`, `PurchaseOrder(+Item)`,
  `GoodsReceipt(+Item)`, `SupplierPayment`.
- **Promotions**: `Discount`, `Promotion`, `Coupon`.
- **QR**: `QRCode` (signed random `token`, never a raw sequential ID), `QRScan`.
- **AI**: `AIConversation`, `AIMessage`, `AIUsage` (per business/user/month, for plan limits).
- **Billing**: `Plan`, `Subscription`, `Invoice`.
- **Currency**: `ExchangeRate` (append-only history; historical sales keep the rate captured at
  `Sale.exchangeRate` and are never recalculated).
- **Ops**: `Notification`, `AuditLog`, `BusinessSetting`.

Every tenant-owned table carries `businessId`. Money is `Decimal`, never `Float`. Tenant-scoped
uniqueness (e.g. a SKU unique per business, not globally) is enforced with composite
`@@unique([businessId, ...])` constraints rather than global uniques.

## 4. Multi-tenant strategy

- Hierarchy: `Business` → `Branch`/`Warehouse` → `InventoryLocation` → stock; `Business` →
  `BusinessMembership` (per user, per role) → `Role` → `Permission`.
- **The businessId is never trusted from the client.** `src/lib/tenancy.ts` resolves the active
  business purely from the authenticated session: it reads a `stockora_active_business` cookie
  (which business a multi-business user last picked), validates that an **active membership**
  exists for that (user, business) pair, and falls back to the user's first active membership if
  the cookie is stale or absent. Every server action and page that touches tenant data calls
  `requireBusinessContext()` / `requirePermission()` — there is no code path that takes a
  `businessId` as a request parameter and trusts it directly.
- `proxy.ts` (Next 16's renamed `middleware.ts`) does an **optimistic** JWT-only redirect for UX
  (bounce logged-out users away from `/dashboard`-style routes, bounce logged-in users away from
  `/login`). It is not the authorization boundary — real enforcement happens server-side via
  `lib/tenancy.ts` on every request, per the Next.js auth guidance.

## 5. Authentication strategy

- Auth.js v5, JWT session strategy (required to mix Credentials with an OAuth provider under one
  adapter).
- Credentials provider: email + bcrypt-hashed password (`src/lib/auth/password.ts`,
  12 salt rounds).
- Email verification and password reset use single-use, expiring tokens
  (`VerificationToken`, `PasswordResetToken`) emailed via `src/lib/email.ts`.
- Sign-in errors surface through the classic "server action redirects with an error query param"
  pattern (avoids needing a client-side session provider for the base login form).
- `src/types/next-auth.d.ts` augments the session/JWT types so `session.user.id` is available
  everywhere without casts.

## 6. Permission model

- Permission keys are flat strings (`view_cost_price`, `manage_products`, `close_register`, ...)
  defined once in `src/lib/permissions/constants.ts` and mirrored into the `Permission` table.
- System roles (Owner, Admin, Manager, Cashier, Inventory Manager, Accountant, Salesperson) are
  defined as a permission-key matrix in the same file and materialized per-business (as `Role` +
  `RolePermission` rows) the first time a business is created — `ensureSystemRolesSeeded()`.
  Businesses can add custom roles later (the `Role` table already supports non-system rows).
- `hasPermission()` / `requirePermission()` in `lib/tenancy.ts` are the only way server code
  should gate an action; a `ForbiddenError` is thrown when a check fails, since the caller is
  always already an authenticated, tenant-scoped request by that point.

## 7. Inventory transaction strategy

- `InventoryMovement` is an **append-only ledger** — every stock change (opening, received, sold,
  returned, transferred, adjusted, damaged, lost, counted, ...) inserts a row with
  `previousQuantity` → `newQuantity`, a `referenceType`/`referenceId` back to the sale/transfer/
  purchase that caused it, and the acting user.
- `InventoryBalance` is a cached/derived projection (`quantityOnHand`/`quantityReserved`) per
  `(location, variant)` — application services update it in the same transaction as the ledger
  insert, never independently. No code path is allowed to mutate `InventoryBalance` without also
  writing the corresponding `InventoryMovement` row.
- Stock-affecting operations (checkout, returns, transfers, counts) are expected to run inside a
  single `prisma.$transaction` so a failed checkout can't partially decrement stock.

## 8. AI-assistant architecture (planned — Phase 9)

- A provider-agnostic interface so the assistant can run on Anthropic or OpenAI without touching
  call sites; the actual model call happens server-side only (never expose a provider API key to
  the browser).
- The model gets a fixed set of **approved analytics tools** (`getSalesSummary`,
  `getTopProducts`, `getLowStockVariants`, `getProfitSummary`, `comparePeriods`,
  `getBranchPerformance`, `getSlowMovingStock`, `getCustomerSummary`, `getReturnSummary`,
  `getSuggestedReorders`) backed by parameterized Prisma queries — never arbitrary SQL.
- Every tool call is scoped to `requireBusinessContext()` and checks the caller's permissions
  (e.g. a Cashier without `view_profit` gets a permission-denied tool result, not profit numbers).
  `AIUsage` tracks messages/tokens per business/user/month against the active `Plan.aiMessageLimit`.

## 9. QR-code security architecture (planned — Phase 10)

- `QRCode.token` is a signed/random public identifier, generated server-side — never a raw,
  sequential database ID is encoded into a QR payload.
- Each code has a `type` (payment/product/receipt/loyalty/store/inventory), optional `expiresAt`,
  and a `status` (active/expired/revoked) that's checked on every scan; `QRScan` records scan
  attempts (including failed ones) for auditability.
- PNG/SVG generation happens server-side via the `qrcode` package (already wired into the
  marketing "Scan to Pay" section as a real, generated QR code, not a static image).

## 10. Frontend page map

**Public / marketing** (single page, `app/page.tsx`, anchor-navigated):
Hero → About → Core Features → Industries → Retailer Benefits → Pricing (DB-driven, monthly/
annual toggle) → AI Assistant preview → QR spec → Works on all devices → Coming next → Final CTA
→ Footer (privacy/terms pages included).

**Auth** (`(auth)` route group): `/login`, `/signup`, `/forgot-password`, `/reset-password`,
`/verify-email`, `/accept-invitation`.

**Onboarding**: `/onboarding` — creates the Business, main Branch, system roles, Owner
membership, and a trial Subscription in one transaction-backed action.

**Authenticated app** (`(app)` route group, dark sidebar + topbar, tenant-gated):
`/dashboard` (real counts from the DB) plus one route per sidebar item (`/pos`, `/sales`,
`/products`, `/inventory`, `/transfers`, `/purchases`, `/suppliers`, `/customers`, `/returns`,
`/expenses`, `/employees`, `/reports`, `/ai-assistant`, `/qr-codes`, `/branches`,
`/integrations`, `/settings`) — implemented modules get real pages; everything else renders an
honest "scheduled for Phase N" state (`lib/nav.ts` is the single source of truth for this list,
consumed by the sidebar, the mobile drawer, and the generic `[module]` stub route) so there is no
dead/broken navigation while the rest of the build ships.

## 11. Implementation phases

1. **Project init, design system, database, auth, multi-tenancy, marketing site** — *done, this
   PR*.
2. Business onboarding (full multi-step wizard), branches, users, roles & permissions UI.
3. Products, categories, brands, variants, barcodes, product images.
4. Inventory, inventory ledger UI, stock adjustments/transfers.
5. POS, payments, receipts, register sessions.
6. Customers, returns, exchanges, store credit, loyalty.
7. Suppliers, purchases, expenses.
8. Reports, dashboard analytics.
9. AI assistant + analytics tool layer.
10. QR system, subscription billing, integrations, hardening, deployment docs.

## 12. Environment variables

See `.env.example`:

- `DATABASE_URL` — Postgres connection string (consumed via `@prisma/adapter-pg`).
- `NEXT_PUBLIC_APP_URL` — used to build absolute links in emails.
- `AUTH_SECRET` — Auth.js session encryption secret.
- `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` — optional; Google login only appears when both are set.
- `RESEND_API_KEY` / `EMAIL_FROM` — optional; without a key, auth emails are logged to the server
  console instead of sent, so the flows stay testable without an email provider.

## Notes on the toolchain (Next.js 16 / Prisma 7)

Two ecosystem changes worth flagging since they differ from older docs/training data:

- Next.js 16 renamed `middleware.ts` → `proxy.ts` (same behavior, new file name/export).
- Prisma 7's generated client requires an explicit **driver adapter** (`@prisma/adapter-pg`)
  passed to `new PrismaClient({ adapter })` — a bare connection string in `schema.prisma` is no
  longer sufficient at runtime; `prisma.config.ts` holds the CLI-side `DATABASE_URL` for
  migrate/seed, while `src/lib/prisma.ts` constructs the adapter for the app itself.
