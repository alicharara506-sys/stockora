import { prisma } from "@/lib/prisma";
import { PERMISSION_DEFINITIONS, SYSTEM_ROLE_DEFINITIONS } from "@/lib/permissions/constants";

export async function ensurePermissionsSeeded() {
  await Promise.all(
    PERMISSION_DEFINITIONS.map((permission) =>
      prisma.permission.upsert({
        where: { key: permission.key },
        create: permission,
        update: { label: permission.label, group: permission.group },
      }),
    ),
  );
}

/** Creates the standard set of roles (Owner, Admin, Manager, ...) for a new business. */
export async function ensureSystemRolesSeeded(businessId: string) {
  await ensurePermissionsSeeded();
  const permissions = await prisma.permission.findMany();
  const permissionIdByKey = new Map(permissions.map((p) => [p.key, p.id]));

  const roles = await Promise.all(
    Object.entries(SYSTEM_ROLE_DEFINITIONS).map(async ([key, definition]) => {
      const role = await prisma.role.upsert({
        where: { businessId_key: { businessId, key } },
        create: { businessId, key, name: definition.name, isSystem: true },
        update: { name: definition.name },
      });

      await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
      await prisma.rolePermission.createMany({
        data: definition.permissions
          .map((permissionKey) => permissionIdByKey.get(permissionKey))
          .filter((id): id is string => Boolean(id))
          .map((permissionId) => ({ roleId: role.id, permissionId })),
      });

      return role;
    }),
  );

  return roles;
}
