import { Boxes, Building2, Receipt, Users } from "lucide-react";
import { requireBusinessContext } from "@/lib/tenancy";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function DashboardPage() {
  const context = await requireBusinessContext();
  const businessId = context.business.id;

  const [productCount, branchCount, memberCount, saleCount] = await Promise.all([
    prisma.product.count({ where: { businessId } }),
    prisma.branch.count({ where: { businessId } }),
    prisma.businessMembership.count({ where: { businessId, status: "ACTIVE" } }),
    prisma.sale.count({ where: { businessId } }),
  ]);

  const stats = [
    { label: "Products", value: productCount, icon: Boxes },
    { label: "Branches", value: branchCount, icon: Building2 },
    { label: "Team members", value: memberCount, icon: Users },
    { label: "Sales recorded", value: saleCount, icon: Receipt },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-brand-black">
          Welcome to {context.business.name}
        </h1>
        <p className="mt-1 text-sm text-brand-muted">
          Signed in as <span className="font-medium text-brand-black">{context.role.name}</span>.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="flex items-center justify-between p-5">
              <div>
                <p className="text-sm text-brand-muted">{stat.label}</p>
                <p className="mt-1 font-display text-2xl font-bold text-brand-black">
                  {stat.value}
                </p>
              </div>
              <div className="flex size-11 items-center justify-center rounded-xl bg-brand-purple-lightest text-brand-purple">
                <stat.icon className="size-5" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CardTitle>Your workspace is live</CardTitle>
            <Badge variant="purple">Phase 1</Badge>
          </div>
          <CardDescription>
            Authentication, multi-tenancy, and your business record are wired up end-to-end. POS,
            inventory, sales, and reporting come online in the next build phases — use the sidebar
            to see what&apos;s scheduled for each module.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
