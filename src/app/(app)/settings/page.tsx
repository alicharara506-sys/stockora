import { ShieldCheck } from "lucide-react";
import { requireBusinessContext } from "@/lib/tenancy";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PERMISSION_DEFINITIONS, PERMISSIONS } from "@/lib/permissions/constants";
import { BusinessProfileForm } from "@/components/settings/business-profile-form";
import { SettingsTabs } from "@/components/settings/settings-tabs";
import { CreateRoleDialog } from "@/components/settings/create-role-dialog";
import { EditRoleDialog } from "@/components/settings/edit-role-dialog";

function groupPermissions() {
  const groups = new Map<string, { group: string; permissions: typeof PERMISSION_DEFINITIONS }>();
  for (const permission of PERMISSION_DEFINITIONS) {
    if (!groups.has(permission.group)) {
      groups.set(permission.group, { group: permission.group, permissions: [] });
    }
    groups.get(permission.group)!.permissions.push(permission);
  }
  return Array.from(groups.values());
}

export default async function SettingsPage() {
  const context = await requireBusinessContext();
  const canManage = context.permissions.has(PERMISSIONS.CHANGE_SETTINGS);
  const groups = groupPermissions();

  const roles = await prisma.role.findMany({
    where: { businessId: context.business.id },
    include: { permissions: { include: { permission: true } } },
    orderBy: [{ isSystem: "desc" }, { name: "asc" }],
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-brand-black">Settings</h1>
        <p className="mt-1 text-sm text-brand-muted">
          Business profile, roles, and permissions for {context.business.name}.
        </p>
      </div>

      <SettingsTabs
        general={
          <Card>
            <CardHeader>
              <CardTitle>Business profile</CardTitle>
              <CardDescription>Basic information about your business.</CardDescription>
            </CardHeader>
            <CardContent>
              {canManage ? (
                <BusinessProfileForm
                  name={context.business.name}
                  industry={context.business.industry}
                />
              ) : (
                <p className="text-sm text-brand-muted">
                  You don&apos;t have permission to change business settings.
                </p>
              )}
            </CardContent>
          </Card>
        }
        roles={
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <p className="text-sm text-brand-muted">
                System roles cover the standard job functions. Create a custom role for anything
                more specific.
              </p>
              {canManage && <CreateRoleDialog groups={groups} />}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {roles.map((role) => {
                const grantedKeys = role.permissions.map((rp) => rp.permission.key);
                return (
                  <Card key={role.id}>
                    <CardContent className="space-y-3 p-5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="flex size-9 items-center justify-center rounded-xl bg-brand-purple-lightest text-brand-purple">
                            <ShieldCheck className="size-4" />
                          </div>
                          <p className="font-display text-sm font-semibold text-brand-black">
                            {role.name}
                          </p>
                        </div>
                        <Badge variant={role.isSystem ? "outline" : "purple"}>
                          {role.isSystem ? "System" : "Custom"}
                        </Badge>
                      </div>
                      <p className="text-xs text-brand-muted">
                        {grantedKeys.length} of {PERMISSION_DEFINITIONS.length} permissions granted
                      </p>
                      {canManage && !role.isSystem && (
                        <EditRoleDialog
                          roleId={role.id}
                          roleName={role.name}
                          groups={groups}
                          defaultChecked={grantedKeys}
                        />
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        }
      />
    </div>
  );
}
