"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/tenancy";
import { PERMISSIONS } from "@/lib/permissions/constants";

export type ActionResult = { success: true } | { success: false; error: string };

const openSchema = z.object({
  registerId: z.string().min(1),
  openingCash: z.coerce.number().min(0),
});

export async function openRegisterAction(input: unknown): Promise<ActionResult> {
  const context = await requirePermission(PERMISSIONS.OPEN_REGISTER);

  const parsed = openSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const register = await prisma.register.findFirst({
    where: { id: parsed.data.registerId, businessId: context.business.id },
  });
  if (!register) return { success: false, error: "Register not found." };

  const existingOpen = await prisma.registerSession.findFirst({
    where: { registerId: register.id, status: "OPEN", openedById: context.userId },
  });
  if (existingOpen) return { success: true };

  await prisma.registerSession.create({
    data: {
      registerId: register.id,
      openedById: context.userId,
      openingCash: parsed.data.openingCash,
    },
  });

  revalidatePath("/pos");
  return { success: true };
}

const closeSchema = z.object({
  sessionId: z.string().min(1),
  actualCash: z.coerce.number().min(0),
  notes: z.string().max(500).optional().or(z.literal("")),
});

export async function closeRegisterAction(input: unknown): Promise<ActionResult> {
  const context = await requirePermission(PERMISSIONS.CLOSE_REGISTER);

  const parsed = closeSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const session = await prisma.registerSession.findFirst({
    where: { id: parsed.data.sessionId, status: "OPEN" },
    include: { register: true, cashMovements: true },
  });
  if (!session || session.register.businessId !== context.business.id) {
    return { success: false, error: "Register session not found." };
  }

  const cashDelta = session.cashMovements.reduce((sum, movement) => sum + Number(movement.amount), 0);
  const expectedCash = Number(session.openingCash) + cashDelta;
  const difference = parsed.data.actualCash - expectedCash;

  await prisma.registerSession.update({
    where: { id: session.id },
    data: {
      status: "CLOSED",
      closedById: context.userId,
      closedAt: new Date(),
      expectedCash,
      actualCash: parsed.data.actualCash,
      difference,
      notes: parsed.data.notes || null,
    },
  });

  revalidatePath("/pos");
  return { success: true };
}
