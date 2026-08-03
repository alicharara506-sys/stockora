"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/tenancy";
import { PERMISSIONS } from "@/lib/permissions/constants";
import { apiKeyPrefix, generateApiKeyPlaintext, hashApiKey } from "@/lib/api-keys";

export type ActionResult = { success: true } | { success: false; error: string };

const createSchema = z.object({ name: z.string().min(2).max(60) });

export async function createApiKeyAction(
  input: unknown,
): Promise<{ success: true; plaintext: string; name: string } | { success: false; error: string }> {
  const context = await requirePermission(PERMISSIONS.CHANGE_SETTINGS);
  const parsed = createSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const plaintext = generateApiKeyPlaintext();
  await prisma.apiKey.create({
    data: {
      businessId: context.business.id,
      name: parsed.data.name,
      keyPrefix: apiKeyPrefix(plaintext),
      hashedKey: await hashApiKey(plaintext),
      createdById: context.userId,
    },
  });

  revalidatePath("/integrations");
  return { success: true, plaintext, name: parsed.data.name };
}

const revokeSchema = z.object({ id: z.string().min(1) });

export async function revokeApiKeyAction(input: unknown): Promise<ActionResult> {
  const context = await requirePermission(PERMISSIONS.CHANGE_SETTINGS);
  const parsed = revokeSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Invalid input." };

  const key = await prisma.apiKey.findFirst({
    where: { id: parsed.data.id, businessId: context.business.id },
  });
  if (!key) return { success: false, error: "API key not found." };

  await prisma.apiKey.update({ where: { id: key.id }, data: { revokedAt: new Date() } });
  revalidatePath("/integrations");
  return { success: true };
}
