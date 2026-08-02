import { Building2, LogOut } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
    <header className="flex h-16 items-center justify-between border-b border-brand-border bg-white px-4 sm:px-6">
      <div className="flex items-center gap-3">
        <MobileSidebar />
        <div className="flex items-center gap-2 rounded-xl border border-brand-border px-3 py-1.5 text-sm">
          <Building2 className="size-4 text-brand-purple" />
          <span className="font-medium text-brand-black">{businessName}</span>
          <span className="text-brand-muted">· {branchName}</span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {trialDaysLeft !== null && (
          <Badge variant="purple" className="hidden sm:inline-flex">
            {trialDaysLeft > 0 ? `${trialDaysLeft} days left in trial` : "Trial ended"}
          </Badge>
        )}
        <span className="hidden text-sm text-brand-muted sm:inline">{userName}</span>
        <form action={signOutAction}>
          <button
            type="submit"
            className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium text-brand-muted hover:bg-brand-purple-lightest hover:text-brand-purple"
          >
            <LogOut className="size-4" />
            <span className="hidden sm:inline">Sign out</span>
          </button>
        </form>
      </div>
    </header>
  );
}
