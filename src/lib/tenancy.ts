import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { PermissionKey } from "@/lib/permissions/constants";

export const ACTIVE_BUSINESS_COOKIE = "stockora_active_business";

export type BusinessContext = Awaited<ReturnType<typeof loadBusinessContext>>;

/**
 * Resolves the caller's active business membership from the authenticated
 * session. The businessId is never taken from client input — only from a
 * membership row owned by the signed-in user.
 */
async function loadBusinessContext() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return null;

  const preferredBusinessId = (await cookies()).get(ACTIVE_BUSINESS_COOKIE)?.value;

  const membership = await prisma.businessMembership.findFirst({
    where: {
      userId,
      status: "ACTIVE",
      ...(preferredBusinessId ? { businessId: preferredBusinessId } : {}),
    },
    include: {
      business: true,
      role: { include: { permissions: { include: { permission: true } } } },
    },
    orderBy: { createdAt: "asc" },
  });

  // Cookie pointed at a business the user is no longer part of — fall back
  // to any active membership instead of failing closed.
  const resolved =
    membership ??
    (preferredBusinessId
      ? await prisma.businessMembership.findFirst({
          where: { userId, status: "ACTIVE" },
          include: {
            business: true,
            role: { include: { permissions: { include: { permission: true } } } },
          },
          orderBy: { createdAt: "asc" },
        })
      : null);

  if (!resolved) return null;

  const permissions = new Set(resolved.role.permissions.map((rp) => rp.permission.key));

  return {
    userId,
    business: resolved.business,
    membership: resolved,
    role: resolved.role,
    permissions,
  };
}

export async function getCurrentBusinessContext() {
  return loadBusinessContext();
}

export async function requireBusinessContext() {
  const context = await loadBusinessContext();
  if (!context) redirect("/onboarding");
  return context;
}

export function hasPermission(
  context: { permissions: Set<string> } | null,
  permission: PermissionKey,
) {
  return context?.permissions.has(permission) ?? false;
}

export class ForbiddenError extends Error {
  constructor(permission: string) {
    super(`Missing required permission: ${permission}`);
    this.name = "ForbiddenError";
  }
}

export async function requirePermission(permission: PermissionKey) {
  const context = await requireBusinessContext();
  if (!context.permissions.has(permission)) {
    throw new ForbiddenError(permission);
  }
  return context;
}
