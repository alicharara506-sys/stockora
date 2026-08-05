"use client";

import { useState, useTransition } from "react";
import { Download, RefreshCw, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { generatePayoutsAction, updatePayoutStatusAction } from "@/server/actions/commission";

export interface PayoutRow {
  id: string;
  userName: string;
  periodStart: string;
  periodEnd: string;
  revenue: number;
  unitsSold: number;
  commissionAmount: number;
  bonusAmount: number;
  penaltyAmount: number;
  totalPayable: number;
  status: "DRAFT" | "APPROVED" | "PAID";
}

export function PayoutsPanel({
  payouts,
  from,
  to,
  canManage,
}: {
  payouts: PayoutRow[];
  from: string;
  to: string;
  canManage: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function generate() {
    setError(null);
    setNotice(null);
    startTransition(async () => {
      const result = await generatePayoutsAction({ from, to });
      if (!result.success) {
        setError(result.error);
        return;
      }
      setNotice(
        result.skipped > 0
          ? `${result.created} payout(s) generated. ${result.skipped} left alone — already approved or paid.`
          : `${result.created} payout(s) generated for this period.`,
      );
    });
  }

  function setStatus(id: string, status: PayoutRow["status"]) {
    setError(null);
    startTransition(async () => {
      const result = await updatePayoutStatusAction(id, status);
      if (!result.success) setError(result.error);
    });
  }

  const exportHref = `/performance/export?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;

  return (
    <div className="space-y-4">
      {error && (
        <p className="rounded-xl border border-red-100 bg-red-50 px-4 py-2.5 text-sm text-brand-danger">
          {error}
        </p>
      )}
      {notice && (
        <p className="rounded-xl border border-green-100 bg-green-50 px-4 py-2.5 text-sm text-brand-success">
          {notice}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-brand-muted">
          Payouts freeze the calculation for a period, so payroll history stays fixed when rules
          change later.
        </p>
        <div className="flex gap-2">
          {payouts.length > 0 && (
            <Button size="sm" variant="outline" asChild>
              <a href={exportHref} download>
                <Download className="size-4" />
                Export CSV
              </a>
            </Button>
          )}
          {canManage && (
            <Button size="sm" onClick={generate} disabled={isPending}>
              <RefreshCw className="size-4" />
              {isPending ? "Generating…" : "Generate for this period"}
            </Button>
          )}
        </div>
      </div>

      {payouts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 p-10 text-center">
            <div className="flex size-11 items-center justify-center rounded-xl bg-brand-purple-lightest text-brand-purple">
              <Wallet className="size-5" />
            </div>
            <p className="font-display text-sm font-semibold text-brand-black">
              No payouts for this period
            </p>
            <p className="max-w-sm text-sm text-brand-muted">
              Generate them once the period is finished to lock in what each person earned.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] text-left text-sm">
                <thead className="border-b border-brand-border text-xs uppercase tracking-wide text-brand-muted">
                  <tr>
                    <th className="px-6 py-3 font-medium">Salesperson</th>
                    <th className="px-6 py-3 font-medium text-right">Revenue</th>
                    <th className="px-6 py-3 font-medium text-right">Commission</th>
                    <th className="px-6 py-3 font-medium text-right">Bonus</th>
                    <th className="px-6 py-3 font-medium text-right">Penalty</th>
                    <th className="px-6 py-3 font-medium text-right">Payable</th>
                    <th className="px-6 py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {payouts.map((p) => (
                    <tr key={p.id} className="border-b border-brand-border last:border-0">
                      <td className="px-6 py-3 font-medium text-brand-black">{p.userName}</td>
                      <td className="px-6 py-3 text-right text-brand-muted">${p.revenue.toFixed(2)}</td>
                      <td className="px-6 py-3 text-right text-brand-muted">
                        ${p.commissionAmount.toFixed(2)}
                      </td>
                      <td className="px-6 py-3 text-right text-brand-success">
                        {p.bonusAmount > 0 ? `+$${p.bonusAmount.toFixed(2)}` : "—"}
                      </td>
                      <td className="px-6 py-3 text-right text-brand-danger">
                        {p.penaltyAmount > 0 ? `−$${p.penaltyAmount.toFixed(2)}` : "—"}
                      </td>
                      <td className="px-6 py-3 text-right font-semibold text-brand-black">
                        ${p.totalPayable.toFixed(2)}
                      </td>
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={
                              p.status === "PAID" ? "success" : p.status === "APPROVED" ? "purple" : "outline"
                            }
                          >
                            {p.status}
                          </Badge>
                          {canManage && p.status === "DRAFT" && (
                            <button
                              type="button"
                              onClick={() => setStatus(p.id, "APPROVED")}
                              disabled={isPending}
                              className="text-xs font-medium text-brand-purple hover:underline disabled:opacity-50"
                            >
                              Approve
                            </button>
                          )}
                          {canManage && p.status === "APPROVED" && (
                            <button
                              type="button"
                              onClick={() => setStatus(p.id, "PAID")}
                              disabled={isPending}
                              className="text-xs font-medium text-brand-purple hover:underline disabled:opacity-50"
                            >
                              Mark paid
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
