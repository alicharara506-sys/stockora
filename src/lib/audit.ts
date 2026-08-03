import "server-only";
import { prisma } from "@/lib/prisma";

export async function logAudit(entry: {
  businessId: string;
  userId: string | null;
  action: string;
  entityType: string;
  entityId: string;
  before?: unknown;
  after?: unknown;
}) {
  await prisma.auditLog.create({
    data: {
      businessId: entry.businessId,
      userId: entry.userId,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId,
      before: entry.before as never,
      after: entry.after as never,
    },
  });
}
