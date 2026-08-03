import { prisma } from "@/lib/prisma";

/**
 * POS currently operates against a single register per business (the main
 * branch's register). Lazily provisions one so businesses created before
 * this existed — or that never explicitly set one up — still get a
 * working POS instead of a dead end.
 */
export async function ensureMainRegister(businessId: string) {
  const mainBranch = await prisma.branch.findFirst({ where: { businessId, isMainBranch: true } });
  if (!mainBranch) return null;

  const existing = await prisma.register.findFirst({ where: { businessId, branchId: mainBranch.id } });
  if (existing) return existing;

  return prisma.register.create({
    data: {
      businessId,
      branchId: mainBranch.id,
      name: `${mainBranch.name} Register`,
      code: "REG-1",
    },
  });
}

export async function getOpenRegisterSession(registerId: string, userId: string) {
  return prisma.registerSession.findFirst({
    where: { registerId, status: "OPEN", openedById: userId },
    orderBy: { openedAt: "desc" },
  });
}
