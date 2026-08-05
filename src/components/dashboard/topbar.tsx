import { Building2, LogOut } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { MobileSidebar } from "@/components/dashboard/mobile-sidebar";
import { signOutAction } from "@/server/actions/session";

export function Topbar({
  businessName,
  branchName,
  trialDaysLeft,
  userName,
}: {
  businessName: string;
  branchName: string;
  trialDaysLeft: number | null;
  userName: string;
}) {
  return (
    <header className="flex h-16 items-center justify-between border-b border-brand-border bg-brand-surface px-4 print:hidden sm:px-6">
      <div className="flex min-w-0 items-center gap-2 sm:gap-3">
        <MobileSidebar />
        <div className="flex min-w-0 items-center gap-2 rounded-xl border border-brand-border px-3 py-1.5 text-sm">
          <Building2 className="size-4 shrink-0 text-brand-accent" />
          <span className="truncate font-medium text-brand-black">{businessName}</span>
          <span className="hidden truncate text-brand-muted sm:inline">· {branchName}</span>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
        {trialDaysLeft !== null && (
          <Badge variant="purple" className="hidden sm:inline-flex">
            {trialDaysLeft > 0 ? `${trialDaysLeft} days left in trial` : "Trial ended"}
          </Badge>
        )}
        <ThemeToggle />
        <span className="hidden text-sm text-brand-muted sm:inline">{userName}</span>
        <form action={signOutAction}>
          <button
            type="submit"
            className="flex cursor-pointer items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium text-brand-muted transition-colors hover:bg-brand-purple-lightest hover:text-brand-accent"
          >
            <LogOut className="size-4" />
            <span className="hidden sm:inline">Sign out</span>
          </button>
        </form>
      </div>
    </header>
  );
}
