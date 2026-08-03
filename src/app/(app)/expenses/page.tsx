import { Wallet } from "lucide-react";
import { requireBusinessContext } from "@/lib/tenancy";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { CreateExpenseDialog } from "@/components/expenses/create-expense-dialog";

export default async function ExpensesPage() {
  const context = await requireBusinessContext();

  const [expenses, categories, branches, suppliers] = await Promise.all([
    prisma.expense.findMany({
      where: { businessId: context.business.id },
      include: { category: true, branch: true, supplier: true },
      orderBy: { date: "desc" },
      take: 100,
    }),
    prisma.expenseCategory.findMany({ where: { businessId: context.business.id }, orderBy: { name: "asc" } }),
    prisma.branch.findMany({ where: { businessId: context.business.id }, orderBy: { name: "asc" } }),
    prisma.supplier.findMany({ where: { businessId: context.business.id }, orderBy: { name: "asc" } }),
  ]);

  const total = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const byCategory = new Map<string, number>();
  for (const expense of expenses) {
    byCategory.set(expense.category.name, (byCategory.get(expense.category.name) ?? 0) + Number(expense.amount));
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-brand-black">Expenses</h1>
          <p className="mt-1 text-sm text-brand-muted">{expenses.length} expenses recorded</p>
        </div>
        <CreateExpenseDialog
          categories={categories.map((c) => ({ id: c.id, name: c.name }))}
          branches={branches.map((b) => ({ id: b.id, name: b.name }))}
          suppliers={suppliers.map((s) => ({ id: s.id, name: s.name }))}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-sm text-brand-muted">Total expenses</p>
              <p className="mt-1 font-display text-xl font-bold text-brand-black">${total.toFixed(2)}</p>
            </div>
            <div className="flex size-11 items-center justify-center rounded-xl bg-brand-purple-lightest text-brand-purple">
              <Wallet className="size-5" />
            </div>
          </CardContent>
        </Card>
        {Array.from(byCategory.entries())
          .slice(0, 3)
          .map(([name, amount]) => (
            <Card key={name}>
              <CardContent className="p-5">
                <p className="text-sm text-brand-muted">{name}</p>
                <p className="mt-1 font-display text-xl font-bold text-brand-black">${amount.toFixed(2)}</p>
              </CardContent>
            </Card>
          ))}
      </div>

      {expenses.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-12 text-center">
            <Wallet className="size-8 text-brand-muted" />
            <p className="text-sm text-brand-muted">No expenses recorded yet.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-brand-border text-xs uppercase tracking-wide text-brand-muted">
                  <th className="px-5 py-3 font-medium">Category</th>
                  <th className="px-5 py-3 font-medium">Branch</th>
                  <th className="px-5 py-3 font-medium">Description</th>
                  <th className="px-5 py-3 font-medium">Payment</th>
                  <th className="px-5 py-3 font-medium">Amount</th>
                  <th className="px-5 py-3 font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((expense) => (
                  <tr key={expense.id} className="border-b border-brand-border last:border-0">
                    <td className="px-5 py-3 font-medium text-brand-black">{expense.category.name}</td>
                    <td className="px-5 py-3 text-brand-muted">{expense.branch?.name ?? "Business-wide"}</td>
                    <td className="px-5 py-3 text-brand-muted">{expense.description ?? "—"}</td>
                    <td className="px-5 py-3 text-brand-muted">{expense.paymentMethod.replace(/_/g, " ")}</td>
                    <td className="px-5 py-3 font-medium text-brand-black">${Number(expense.amount).toFixed(2)}</td>
                    <td className="px-5 py-3 text-brand-muted">{expense.date.toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
