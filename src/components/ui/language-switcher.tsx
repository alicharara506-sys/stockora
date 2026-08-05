"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import * as Popover from "@radix-ui/react-popover";
import { Check, Globe } from "lucide-react";
import { LOCALES, LOCALE_META } from "@/lib/i18n/config";
import { useLocale, useTranslations } from "@/lib/i18n/client";
import { setLocaleAction } from "@/server/actions/locale";

export function LanguageSwitcher() {
  const locale = useLocale();
  const t = useTranslations("language");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function choose(next: string) {
    // Closed before the transition starts: the tree-wide refresh below
    // re-renders this component, and an uncontrolled popover would be left
    // open over the new page.
    setOpen(false);
    startTransition(async () => {
      await setLocaleAction(next);
      // The server holds the locale, so a refresh re-renders every string —
      // including the direction flip when switching to or from Arabic.
      router.refresh();
    });
  }

  return (
    // Controlled so the menu can be dismissed programmatically on selection.
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          aria-label={t("change")}
          title={t("change")}
          // Deliberately not disabled while pending: the transition spans a
          // full tree refresh, and disabling here left the control stuck and
          // unusable for any switch after the first.
          className="flex size-8 cursor-pointer items-center justify-center rounded-full text-brand-muted transition-colors hover:bg-brand-purple-lightest hover:text-brand-accent"
        >
          <Globe className="size-4" />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={8}
          className="z-50 w-44 rounded-xl border border-brand-border bg-brand-surface p-1 shadow-card-lg"
        >
          {LOCALES.map((code) => {
            const meta = LOCALE_META[code];
            const active = code === locale;
            return (
              <button
                key={code}
                type="button"
                onClick={() => choose(code)}
                disabled={isPending}
                lang={code}
                dir={meta.dir}
                className={
                  active
                    ? "flex w-full cursor-pointer items-center justify-between rounded-lg bg-brand-purple-lightest px-3 py-2 text-sm font-medium text-brand-accent"
                    : "flex w-full cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-sm font-medium text-brand-black transition-colors hover:bg-brand-purple-lightest"
                }
              >
                <span>{meta.nativeName}</span>
                {active && <Check className="size-3.5" />}
              </button>
            );
          })}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
