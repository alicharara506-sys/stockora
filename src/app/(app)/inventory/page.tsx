import Link from "next/link";
import { Boxes, DollarSign, AlertTriangle, PackageX } from "lucide-react";
import { requireBusinessContext } from "@/lib/tenancy";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PERMISSIONS } from "@/lib/permissions/constants";
import { AdjustStockDialog } from "@/components/inventory/adjust-stock-dialog";

const FILTERS = [
  { key: "all", label: "All" },
  { key: "low", label: "Low stock" },
  { key: "out", label: "Out of stock" },
] as const;

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<{ location?: string; filter?: string }>;
}) {
  const { location, filter } = await searchParams;
  const context = await requireBusinessContext();
  const canAdjust = context.permissions.has(PERMISSIONS.ADJUST_STOCK);

  const locations = await prisma.inventoryLocation.findMany({
    where: { businessId: context.business.id },
    include: { branch: true, warehouse: true },
    orderBy: { name: "asc" },
  });

  const balances = await prisma.inventoryBalance.findMany({
    where: {
      businessId: context.business.id,
      ...(location ? { locationId: location } : {}),
    },
    include: {
      location: true,
      variant: {
        include: {
          product: true,
          attributeValues: { include: { attributeValue: true } },
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  const rows = balances.filter((balance) => {
    if (filter === "out") return balance.quantityOnHand <= 0;
    if (filter === "low")
      return (
        balance.variant.reorderLevel > 0 &&
        balance.quantityOnHand > 0 &&
        balance.quantityOnHand <= balance.variant.reorderLevel
      );
    return true;
  });

  const totalUnits = balances.reduce((sum, b) => sum + b.quantityOnHand, 0);
  const totalValue = balances.reduce(
    (sum, b) => sum + b.quantityOnHand * Number(b.variant.costPrice),
    0,
  );
  const lowCount = balances.filter(
    (b) => b.variant.reorderLevel > 0 && b.quantityOnHand > 0 && b.quantityOnHand <= b.variant.reorderLevel,
  ).length;
  const outCount = balances.filter((b) => b.quantityOnHand <= 0).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-brand-black">Inventory</h1>
          <p className="mt-1 text-sm text-brand-muted">Stock on hand across every branch.</p>
        </div>
        <Link
          href="/inventory/history"
          className="text-sm font-medium text-brand-purple hover:underline"
        >
          View movement history →
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <SummaryCard icon={Boxes} label="Units on hand" value={totalUnits.toLocaleString()} />
        <SummaryCard icon={DollarSign} label="Stock valuation (cost)" value={`$${totalValue.toFixed(2)}`} />
        <SummaryCard
          icon={AlertTriangle}
          label="Low / out of stock"
          value={`${lowCount} low · ${outCount} out`}
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1.5">
          {FILTERS.map((f) => (
            <FilterLink key={f.key} filterKey={f.key} label={f.label} active={(filter ?? "all") === f.key} location={location} />
          ))}
        </div>
        <div className="flex flex-wrap gap-1.5">
          <LocationLink label="All branches" locationId={undefined} active={!location} filter={filter} />
          {locations.map((loc) => (
            <LocationLink
              key={loc.id}
              label={loc.name}
              locationId={loc.id}
              active={location === loc.id}
              filter={filter}
            />
          ))}
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {rows.length === 0 ? (
            <div className="flex flex-col items-center gap-3 p-12 text-center">
              <PackageX className="size-8 text-brand-muted" />
              <p className="text-sm text-brand-muted">No stock matches this filter.</p>
            </div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-brand-border text-xs uppercase tracking-wide text-brand-muted">
                  <th className="px-5 py-3 font-medium">Product</th>
                  <th className="px-5 py-3 font-medium">Variant</th>
                  <th className="px-5 py-3 font-medium">Branch</th>
                  <th className="px-5 py-3 font-medium">On hand</th>
                  <th className="px-5 py-3 font-medium">Reorder level</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  {canAdjust && <th className="px-5 py-3 font-medium"></th>}
                </tr>
              </thead>
              <tbody>
                {rows.map((balance) => {
                  const variantLabel =
                    balance.variant.attributeValues.map((av) => av.attributeValue.value).join(" / ") ||
                    "Default";
                  const isOut = balance.quantityOnHand <= 0;
                  const isLow =
                    !isOut &&
                    balance.variant.reorderLevel > 0 &&
                    balance.quantityOnHand <= balance.variant.reorderLevel;
                  return (
                    <tr key={balance.id} className="border-b border-brand-border last:border-0">
                      <td className="px-5 py-3 font-medium text-brand-black">
                        {balance.variant.product.name}
                      </td>
                      <td className="px-5 py-3 text-brand-muted">{variantLabel}</td>
                      <td className="px-5 py-3 text-brand-muted">{balance.location.name}</td>
                      <td className="px-5 py-3 text-brand-black">{balance.quantityOnHand}</td>
                      <td className="px-5 py-3 text-brand-muted">{balance.variant.reorderLevel}</td>
                      <td className="px-5 py-3">
                        {isOut ? (
                          <Badge variant="danger">Out of stock</Badge>
                        ) : isLow ? (
                          <Badge variant="warning">Low stock</Badge>
                        ) : (
                          <Badge variant="success">In stock</Badge>
                        )}
                      </td>
                      {canAdjust && (
                        <td className="px-5 py-3 text-right">
                          <AdjustStockDialog
                            locationId={balance.locationId}
                            variantId={balance.variantId}
                            variantLabel={`${balance.variant.product.name} — ${variantLabel}`}
                            currentQuantity={balance.quantityOnHand}
                          />
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Boxes;
  label: string;
  value: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between p-5">
        <div>
          <p className="text-sm text-brand-muted">{label}</p>
          <p className="mt-1 font-display text-xl font-bold text-brand-black">{value}</p>
        </div>
        <div className="flex size-11 items-center justify-center rounded-xl bg-brand-purple-lightest text-brand-purple">
          <Icon className="size-5" />
        </div>
      </CardContent>
    </Card>
  );
}

function FilterLink({
  filterKey,
  label,
  active,
  location,
}: {
  filterKey: string;
  label: string;
  active: boolean;
  location?: string;
}) {
  const params = new URLSearchParams();
  if (filterKey !== "all") params.set("filter", filterKey);
  if (location) params.set("location", location);
  const href = params.toString() ? `/inventory?${params.toString()}` : "/inventory";

  return (
    <Link
      href={href}
      className={
        active
          ? "rounded-full bg-brand-purple px-4 py-1.5 text-sm font-medium text-white"
          : "rounded-full border border-brand-border px-4 py-1.5 text-sm font-medium text-brand-black hover:bg-brand-purple-lightest"
      }
    >
      {label}
    </Link>
  );
}

function LocationLink({
  label,
  locationId,
  active,
  filter,
}: {
  label: string;
  locationId?: string;
  active: boolean;
  filter?: string;
}) {
  const params = new URLSearchParams();
  if (locationId) params.set("location", locationId);
  if (filter && filter !== "all") params.set("filter", filter);
  const href = params.toString() ? `/inventory?${params.toString()}` : "/inventory";

  return (
    <Link
      href={href}
      className={
        active
          ? "rounded-full bg-brand-black px-3 py-1.5 text-xs font-medium text-white"
          : "rounded-full border border-brand-border px-3 py-1.5 text-xs font-medium text-brand-black hover:bg-brand-purple-lightest"
      }
    >
      {label}
    </Link>
  );
}
