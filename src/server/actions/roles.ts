"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/tenancy";
import { PERMISSIONS, PERMISSION_DEFINITIONS } from "@/lib/permissions/constants";

const VALID_PERMISSION_KEYS = new Set<string>(PERMISSION_DEFINITIONS.map((p) => p.key));

const createRoleSchema = z.object({
  name: z.string().min(2, "Enter a role name").max(60),
  permissionKeys: z.array(z.string()).default([]),
});

export type ActionResult = { success: true } | { success: false; error: string };

export async function createCustomRoleAction(input: unknown): Promise<ActionResult> {
  const context = await requirePermission(PERMISSIONS.CHANGE_SETTINGS);

  const parsed = createRoleSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const permissionKeys = parsed.data.permissionKeys.filter((key) => VALID_PERMISSION_KEYS.has(key));
  const key = await uniqueRoleKey(context.business.id, parsed.data.name);

  const permissions = await prisma.permission.findMany({ where: { key: { in: permissionKeys } } });

  await prisma.role.create({
    data: {
      businessId: context.business.id,
      key,
      name: parsed.data.name,
      isSystem: false,
      permissions: {
        create: permissions.map((permission) => ({ permissionId: permission.id })),
      },
    },
  });

  revalidatePath("/settings");
  return { success: true };
}

export async function updateRolePermissionsAction(
  roleId: string,
  permissionKeys: string[],
): Promise<ActionResult> {
  const context = await requirePermission(PERMISSIONS.CHANGE_SETTINGS);

  const role = await prisma.role.findFirst({
    where: { id: roleId, businessId: context.business.id },
  });
  if (!role) {
    return { success: false, error: "Role not found." };
  }
  if (role.isSystem) {
    return { success: false, error: "System roles can't be edited." };
  }

  const validKeys = permissionKeys.filter((key) => VALID_PERMISSION_KEYS.has(key));
  const permissions = await prisma.permission.findMany({ where: { key: { in: validKeys } } });

  await prisma.$transaction([
    prisma.rolePermission.deleteMany({ where: { roleId } }),
    prisma.rolePermission.createMany({
      data: permissions.map((permission) => ({ roleId, permissionId: permission.id })),
    }),
  ]);

  revalidatePath("/settings");
  return { success: true };
}

async function uniqueRoleKey(businessId: string, name: string) {
  const base =
    name
      .toUpperCase()
      .trim()
      .replace(/[^A-Z0-9]+/g, "_")
      .replace(/(^_|_$)/g, "") || "ROLE";

  let candidate = base;
  let suffix = 0;
  while (true) {
    const existing = await prisma.role.findUnique({
      where: { businessId_key: { businessId, key: candidate } },
    });
    if (!existing) return candidate;
    suffix += 1;
    candidate = `${base}_${suffix}`;
  }
}
