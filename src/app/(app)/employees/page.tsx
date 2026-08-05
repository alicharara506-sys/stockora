import { Users } from "lucide-react";
import { requireBusinessContext } from "@/lib/tenancy";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { InviteMemberDialog } from "@/components/employees/invite-member-dialog";
import { MemberRoleSelect } from "@/components/employees/member-role-select";
import { RemoveMemberButton } from "@/components/employees/remove-member-button";
import { PERMISSIONS } from "@/lib/permissions/constants";

export default async function EmployeesPage() {
  const context = await requireBusinessContext();
  const canManage = context.permissions.has(PERMISSIONS.MANAGE_EMPLOYEES);

  const [memberships, roles, invitations] = await Promise.all([
    prisma.businessMembership.findMany({
      where: { businessId: context.business.id, status: "ACTIVE" },
      include: { user: true, role: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.role.findMany({
      where: { businessId: context.business.id },
      orderBy: { name: "asc" },
    }),
    prisma.invitation.findMany({
      where: { businessId: context.business.id, acceptedAt: null, expiresAt: { gt: new Date() } },
      include: { role: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-brand-black">Employees</h1>
          <p className="mt-1 text-sm text-brand-muted">
            Manage who has access to this business and what they can do.
          </p>
        </div>
        {canManage && <InviteMemberDialog roles={roles} />}
      </div>

      <Card>
        <CardContent className="p-0">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-brand-border text-xs uppercase tracking-wide text-brand-muted">
                <th className="px-5 py-3 font-medium">Name</th>
                <th className="px-5 py-3 font-medium">Email</th>
                <th className="px-5 py-3 font-medium">Role</th>
                {canManage && <th className="px-5 py-3 font-medium"></th>}
              </tr>
            </thead>
            <tbody>
              {memberships.map((membership) => (
                <tr key={membership.id} className="border-b border-brand-border last:border-0">
                  <td className="px-5 py-3 font-medium text-brand-black">
                    {membership.user.name ?? "—"}
                  </td>
                  <td className="px-5 py-3 text-brand-muted">{membership.user.email}</td>
                  <td className="px-5 py-3">
                    {canManage ? (
                      <MemberRoleSelect
                        membershipId={membership.id}
                        roleId={membership.roleId}
                        roles={roles}
                      />
                    ) : (
                      <Badge variant="purple">{membership.role.name}</Badge>
                    )}
                  </td>
                  {canManage && (
                    <td className="px-5 py-3 text-right">
                      <RemoveMemberButton membershipId={membership.id} />
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {invitations.length > 0 && (
        <div>
          <h2 className="mb-3 font-display text-base font-semibold text-brand-black">
            Pending invitations
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {invitations.map((invitation) => (
              <Card key={invitation.id}>
                <CardContent className="flex items-center gap-3 p-4">
                  <div className="flex size-9 items-center justify-center rounded-xl bg-brand-purple-lightest text-brand-accent">
                    <Users className="size-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-brand-black">
                      {invitation.email}
                    </p>
                    <p className="text-xs text-brand-muted">Invited as {invitation.role.name}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
