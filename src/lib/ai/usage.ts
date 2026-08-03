import "server-only";
import { prisma } from "@/lib/prisma";

function currentMonthStart() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

export async function getUsageStatus(businessId: string, userId: string) {
  const month = currentMonthStart();

  const [subscription, usage] = await Promise.all([
    prisma.subscription.findUnique({ where: { businessId }, include: { plan: true } }),
    prisma.aIUsage.findUnique({ where: { businessId_userId_month: { businessId, userId, month } } }),
  ]);

  const limit = subscription?.plan.aiMessageLimit ?? 50;
  const used = usage?.messageCount ?? 0;

  return { limit, used, remaining: Math.max(limit - used, 0), month };
}

export async function recordUsage(businessId: string, userId: string, tokenCount: number) {
  const month = currentMonthStart();

  await prisma.aIUsage.upsert({
    where: { businessId_userId_month: { businessId, userId, month } },
    create: { businessId, userId, month, messageCount: 1, tokenCount },
    update: { messageCount: { increment: 1 }, tokenCount: { increment: tokenCount } },
  });
}
