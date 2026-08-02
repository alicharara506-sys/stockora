import { prisma } from "@/lib/prisma";

/**
 * Canonical plan definitions. This is the *only* place plan pricing is
 * hardcoded — it exists solely to seed the `Plan` table. Every runtime read
 * (marketing pricing section, upgrade modals, usage-limit checks) queries
 * `prisma.plan` instead of importing this file.
 */
export const PLAN_SEED_DATA = [
  {
    key: "STARTER",
    name: "Starter",
    monthlyPrice: 11,
    annualPrice: 11 * 12 * 0.83,
    maxBranches: 1,
    maxUsers: 2,
    aiMessageLimit: 50,
    sortOrder: 0,
    features: [
      "1 branch",
      "Up to 2 users",
      "Unlimited products",
      "Basic reports",
      "Email support",
    ],
  },
  {
    key: "BUSINESS",
    name: "Business",
    monthlyPrice: 29,
    annualPrice: 29 * 12 * 0.83,
    maxBranches: 3,
    maxUsers: 10,
    aiMessageLimit: 500,
    sortOrder: 1,
    features: [
      "Up to 3 branches",
      "Up to 10 users",
      "Advanced reports",
      "Stock transfers",
      "Returns & exchanges",
      "AI assistant (fair-use limits)",
      "Priority support",
    ],
  },
  {
    key: "PREMIUM",
    name: "Premium",
    monthlyPrice: 59,
    annualPrice: 59 * 12 * 0.83,
    maxBranches: -1,
    maxUsers: -1,
    aiMessageLimit: 5000,
    sortOrder: 2,
    features: [
      "Unlimited branches",
      "Unlimited users",
      "Advanced analytics",
      "E-commerce integration",
      "API access",
      "Higher AI limits",
      "Dedicated support",
    ],
  },
] as const;

export async function ensurePlansSeeded() {
  await Promise.all(
    PLAN_SEED_DATA.map((plan) =>
      prisma.plan.upsert({
        where: { key: plan.key },
        create: {
          key: plan.key,
          name: plan.name,
          monthlyPrice: plan.monthlyPrice,
          annualPrice: plan.annualPrice,
          maxBranches: plan.maxBranches,
          maxUsers: plan.maxUsers,
          aiMessageLimit: plan.aiMessageLimit,
          sortOrder: plan.sortOrder,
          features: plan.features,
        },
        update: {},
      }),
    ),
  );
}

/**
 * Read-only for the marketing site. Falls back to the seed constants (not a
 * write) so the pricing section still renders correctly before the database
 * has been seeded — once seeded, the DB rows are always what's returned.
 */
export async function getPublicPlans() {
  const plans = await prisma.plan.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
  });

  if (plans.length > 0) return plans;

  return PLAN_SEED_DATA.map((plan) => ({
    id: plan.key,
    ...plan,
    isActive: true,
  }));
}
