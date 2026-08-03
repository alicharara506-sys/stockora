import { Building2 } from "lucide-react";
import { requireBusinessContext } from "@/lib/tenancy";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CreateBranchDialog } from "@/components/branches/create-branch-dialog";
import { ToggleBranchButton } from "@/components/branches/toggle-branch-button";
import { PERMISSIONS } from "@/lib/permissions/constants";

export default async function BranchesPage() {
  const context = await requireBusinessContext();

  const branches = await prisma.branch.findMany({
    where: { businessId: context.business.id },
    orderBy: [{ isMainBranch: "desc" }, { createdAt: "asc" }],
  });

  const canManage = context.permissions.has(PERMISSIONS.CHANGE_SETTINGS);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-brand-black">Branches</h1>
          <p className="mt-1 text-sm text-brand-muted">
            Manage the physical locations that sell and stock your products.
          </p>
        </div>
        {canManage && <CreateBranchDialog />}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {branches.map((branch) => (
          <Card key={branch.id}>
            <CardContent className="space-y-3 p-5">
              <div className="flex items-start justify-between">
                <div className="flex size-10 items-center justify-center rounded-xl bg-brand-purple-lightest text-brand-purple">
                  <Building2 className="size-5" />
                </div>
                <div className="flex gap-1.5">
                  {branch.isMainBranch && <Badge variant="purple">Main</Badge>}
                  <Badge variant={branch.isActive ? "success" : "outline"}>
                    {branch.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </div>
              <div>
                <p className="font-display text-base font-semibold text-brand-black">
                  {branch.name}
                </p>
                <p className="text-xs text-brand-muted">Code: {branch.code}</p>
              </div>
              {(branch.address || branch.phone || branch.email) && (
                <div className="space-y-0.5 text-xs text-brand-muted">
                  {branch.address && <p>{branch.address}</p>}
                  {branch.phone && <p>{branch.phone}</p>}
                  {branch.email && <p>{branch.email}</p>}
                </div>
              )}
              {canManage && (
                <div className="flex justify-end pt-1">
                  <ToggleBranchButton
                    branchId={branch.id}
                    isActive={branch.isActive}
                    disabled={branch.isMainBranch}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
