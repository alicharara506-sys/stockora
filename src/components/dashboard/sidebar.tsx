"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/ui/logo";
import { APP_NAV } from "@/lib/nav";
import { useTranslations } from "@/lib/i18n/client";

export function Sidebar() {
  const pathname = usePathname();
  const t = useTranslations("nav");

  return (
    <aside className="hidden w-64 shrink-0 flex-col bg-brand-sidebar print:hidden lg:flex">
      <div className="flex h-16 items-center px-6">
        <Link href="/dashboard">
          <Logo dark markClassName="size-8" />
        </Link>
      </div>
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
        {APP_NAV.map((item) => {
          const href = `/${item.slug}`;
          const isActive = pathname === href;
          const Icon = item.icon;
          return (
            <Link
              key={item.slug}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-white/60 transition-colors hover:bg-white/5 hover:text-white",
                isActive && "bg-brand-purple text-white hover:bg-brand-purple",
              )}
            >
              <Icon className="size-5 shrink-0" />
              {t(item.labelKey)}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
