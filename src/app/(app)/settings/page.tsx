import { ShieldCheck } from "lucide-react";
import { requireBusinessContext } from "@/lib/tenancy";
import { prisma } from "@/lib/prisma";
import { getUsageStatus } from "@/lib/ai/usage";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PERMISSION_DEFINITIONS, PERMISSIONS } from "@/lib/permissions/constants";
import { BusinessProfileForm } from "@/components/settings/business-profile-form";
import { SettingsTabs } from "@/components/settings/settings-tabs";
import { CreateRoleDialog } from "@/components/settings/create-role-dialog";
import { EditRoleDialog } from "@/components/settings/edit-role-dialog";
import { PlanPicker } from "@/components/settings/plan-picker";
import { CancelSubscriptionButton } from "@/components/settings/cancel-subscription-button";
import { CategoryManager } from "@/components/settings/catalog/category-manager";
import { SizeChartManager } from "@/components/settings/catalog/size-chart-manager";
import { AttributeManager } from "@/components/settings/catalog/attribute-manager";
import { TaxManager } from "@/components/settings/tax/tax-manager";
import { CheckoutPolicyForm } from "@/components/settings/checkout-policy-form";

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
  const canManageBilling = context.permissions.has(PERMISSIONS.MANAGE_SUBSCRIPTIONS);
  const canManageCatalog = context.permissions.has(PERMISSIONS.MANAGE_PRODUCTS);
  const groups = groupPermissions();

  const [roles, subscription, plans, invoices, branchCount, userCount, aiUsage, categories, sizeCharts, attributes] =
    await Promise.all([
      prisma.role.findMany({
        where: { businessId: context.business.id },
        include: { permissions: { include: { permission: true } } },
        orderBy: [{ isSystem: "desc" }, { name: "asc" }],
      }),
      prisma.subscription.findUnique({ where: { businessId: context.business.id }, include: { plan: true } }),
      prisma.plan.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }),
      prisma.invoice.findMany({
        where: { businessId: context.business.id },
        orderBy: { issuedAt: "desc" },
        take: 12,
      }),
      prisma.branch.count({ where: { businessId: context.business.id } }),
      prisma.businessMembership.count({ where: { businessId: context.business.id, status: "ACTIVE" } }),
      getUsageStatus(context.business.id, context.userId),
      prisma.category.findMany({
        where: { businessId: context.business.id },
        include: { _count: { select: { products: true } } },
        orderBy: { name: "asc" },
      }),
      prisma.sizeChart.findMany({
        where: { businessId: context.business.id },
        include: { values: { orderBy: { sortOrder: "asc" } } },
        orderBy: { name: "asc" },
      }),
      prisma.attribute.findMany({
        where: { businessId: context.business.id },
        include: { values: { orderBy: { value: "asc" } } },
        orderBy: { name: "asc" },
      }),
    ]);

  const [businessSetting, taxRules] = await Promise.all([
    prisma.businessSetting.findUnique({ where: { businessId: context.business.id } }),
    prisma.tax.findMany({
      where: { businessId: context.business.id },
      include: { _count: { select: { products: true, variants: true } } },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
  ]);

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
          <div className="space-y-6">
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

            <Card>
              <CardHeader>
                <CardTitle>Checkout</CardTitle>
                <CardDescription>
                  Whether cashiers must capture customer details to finalize a sale.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {canManage ? (
                  <CheckoutPolicyForm
                    policy={{
                      requireCustomerAtCheckout: businessSetting?.requireCustomerAtCheckout ?? false,
                      requireCustomerPhone: businessSetting?.requireCustomerPhone ?? true,
                      requireCustomerEmail: businessSetting?.requireCustomerEmail ?? false,
                    }}
                  />
                ) : (
                  <p className="text-sm text-brand-muted">
                    You don&apos;t have permission to change business settings.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
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
                          <div className="flex size-9 items-center justify-center rounded-xl bg-brand-purple-lightest text-brand-accent">
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
        catalog={
          canManageCatalog ? (
            <div className="space-y-8">
              <div>
                <h2 className="font-display text-base font-semibold text-brand-black">Categories</h2>
                <p className="mt-1 text-sm text-brand-muted">
                  Organize products into categories and give each one its own size system.
                </p>
                <div className="mt-4">
                  <CategoryManager
                    categories={categories.map((c) => ({
                      id: c.id,
                      name: c.name,
                      parentId: c.parentId,
                      sizeChartId: c.sizeChartId,
                      productCount: c._count.products,
                    }))}
                    sizeCharts={sizeCharts.map((s) => ({ id: s.id, name: s.name }))}
                  />
                </div>
              </div>

              <div>
                <h2 className="font-display text-base font-semibold text-brand-black">Size charts</h2>
                <p className="mt-1 text-sm text-brand-muted">
                  Define the size systems used across your catalog — assign them to categories above.
                </p>
                <div className="mt-4">
                  <SizeChartManager
                    sizeCharts={sizeCharts.map((s) => ({
                      id: s.id,
                      name: s.name,
                      values: s.values.map((v) => ({ id: v.id, value: v.value })),
                    }))}
                  />
                </div>
              </div>

              <div>
                <h2 className="font-display text-base font-semibold text-brand-black">Attributes</h2>
                <p className="mt-1 text-sm text-brand-muted">
                  Color, material, and other variant attributes used when generating product variants.
                </p>
                <div className="mt-4">
                  <AttributeManager
                    attributes={attributes.map((a) => ({
                      id: a.id,
                      name: a.name,
                      values: a.values.map((v) => ({ id: v.id, value: v.value, colorHex: v.colorHex })),
                    }))}
                  />
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-brand-muted">You don&apos;t have permission to manage the catalog.</p>
          )
        }
        tax={
          canManage ? (
            <TaxManager
              settings={{
                taxEnabled: businessSetting?.taxEnabled ?? false,
                pricesIncludeTax: businessSetting?.pricesIncludeTax ?? false,
                taxCountry: businessSetting?.taxCountry ?? null,
                taxRegistrationNumber: businessSetting?.taxRegistrationNumber ?? null,
              }}
              rules={taxRules.map((rule) => ({
                id: rule.id,
                name: rule.name,
                rate: Number(rule.rate),
                system: rule.system,
                treatment: rule.treatment,
                isCompound: rule.isCompound,
                country: rule.country,
                isDefault: rule.isDefault,
                isActive: rule.isActive,
                usageCount: rule._count.products + rule._count.variants,
              }))}
            />
          ) : (
            <p className="text-sm text-brand-muted">
              You don&apos;t have permission to change tax settings.
            </p>
          )
        }
        billing={
          <div className="space-y-6">
            {subscription && (
              <Card>
                <CardContent className="flex flex-wrap items-center justify-between gap-4 p-5">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-display text-lg font-semibold text-brand-black">
                        {subscription.plan.name} plan
                      </p>
                      <Badge variant={subscription.status === "ACTIVE" ? "success" : "purple"}>
                        {subscription.status === "TRIALING" ? "Trial" : subscription.status}
                      </Badge>
                      {subscription.cancelAtPeriodEnd && <Badge variant="warning">Cancels at period end</Badge>}
                    </div>
                    <p className="mt-1 text-sm text-brand-muted">
                      {branchCount} of {subscription.plan.maxBranches < 0 ? "unlimited" : subscription.plan.maxBranches}{" "}
                      branches · {userCount} of{" "}
                      {subscription.plan.maxUsers < 0 ? "unlimited" : subscription.plan.maxUsers} users ·{" "}
                      {aiUsage.used} of {aiUsage.limit} AI messages this month
                    </p>
                  </div>
                  {canManageBilling && !subscription.cancelAtPeriodEnd && <CancelSubscriptionButton />}
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle>Plans</CardTitle>
                <CardDescription>
                  {canManageBilling
                    ? "Switch plans anytime — billing runs in manual mode, so changes apply immediately."
                    : "Only the workspace owner or admin can change plans."}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {canManageBilling ? (
                  <PlanPicker
                    plans={plans.map((p) => ({
                      key: p.key,
                      name: p.name,
                      monthlyPrice: Number(p.monthlyPrice),
                      annualPrice: Number(p.annualPrice),
                      maxBranches: p.maxBranches,
                      maxUsers: p.maxUsers,
                      aiMessageLimit: p.aiMessageLimit,
                      features: p.features as string[],
                    }))}
                    currentPlanKey={subscription?.plan.key ?? null}
                    currentBillingCycle={subscription?.billingCycle ?? "MONTHLY"}
                  />
                ) : (
                  <p className="text-sm text-brand-muted">You don&apos;t have permission to manage billing.</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Invoices</CardTitle>
                <CardDescription>Billing history for {context.business.name}.</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {invoices.length === 0 ? (
                  <p className="px-6 pb-6 text-sm text-brand-muted">No invoices yet.</p>
                ) : (
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-brand-border text-xs uppercase tracking-wide text-brand-muted">
                        <th className="px-6 py-3 font-medium">Date</th>
                        <th className="px-6 py-3 font-medium">Amount</th>
                        <th className="px-6 py-3 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoices.map((invoice) => (
                        <tr key={invoice.id} className="border-b border-brand-border last:border-0">
                          <td className="px-6 py-3 text-brand-muted">{invoice.issuedAt.toLocaleDateString()}</td>
                          <td className="px-6 py-3 font-medium text-brand-black">
                            ${Number(invoice.amount).toFixed(2)}
                          </td>
                          <td className="px-6 py-3">
                            <Badge variant={invoice.status === "PAID" ? "success" : "warning"}>
                              {invoice.status}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </CardContent>
            </Card>
          </div>
        }
      />
    </div>
  );
}
