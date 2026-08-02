import { requireBusinessContext } from "@/lib/tenancy";
import { daysUntil } from "@/lib/dates/days-until";
import { prisma } from "@/lib/prisma";
import { Sidebar } from "@/components/dashboard/sidebar";
import { Topbar } from "@/components/dashboard/topbar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const context = await requireBusinessContext();
  const trialDaysLeft = daysUntil(context.business.trialEndsAt);

  const mainBranch = await prisma.branch.findFirst({
    where: { businessId: context.business.id, isMainBranch: true },
  });

  return (
    <div className="flex min-h-screen w-full bg-brand-bg">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          businessName={context.business.name}
          branchName={mainBranch?.name ?? "No branch yet"}
          trialDaysLeft={trialDaysLeft}
          userName={context.membership.role.name}
        />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
