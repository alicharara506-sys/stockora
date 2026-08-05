"use client";

import { createContext, useContext, useMemo } from "react";
import { DEFAULT_LOCALE, LOCALE_META, type Locale } from "@/lib/i18n/config";
import type { Messages } from "@/lib/i18n/dictionaries";

interface I18nValue {
  locale: Locale;
  messages: Messages;
  dir: "ltr" | "rtl";
}

const I18nContext = createContext<I18nValue | null>(null);

/**
 * Makes the request's locale and catalog available to Client Components.
 *
 * The catalog is resolved on the server and passed down, so no translation
 * loading happens in the browser and there is no flash of untranslated text.
 */
export function I18nProvider({
  locale,
  messages,
  children,
}: {
  locale: Locale;
  messages: Messages;
  children: React.ReactNode;
}) {
  const value = useMemo<I18nValue>(
    () => ({ locale, messages, dir: LOCALE_META[locale].dir }),
    [locale, messages],
  );
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error("useTranslations must be used inside <I18nProvider>");
  }
  return ctx;
}

type Section = keyof Messages;

/**
 * Returns a translator scoped to one section of the catalog:
 *
 *   const t = useTranslations("pos");
 *   t("charge", { amount: "$12.00" });
 *
 * Keys are typed against the English catalog, so a typo won't compile.
 */
export function useTranslations<S extends Section>(section: S) {
  const { messages } = useI18n();
  return function translate(
    key: keyof Messages[S],
    values?: Record<string, string | number>,
  ): string {
    const template = messages[section][key] as unknown as string;
    if (typeof template !== "string") return String(key);
    if (!values) return template;
    return template.replace(/\{(\w+)\}/g, (match, name: string) =>
      name in values ? String(values[name]) : match,
    );
  };
}

export function useLocale(): Locale {
  return useI18n().locale;
}

export function useDirection(): "ltr" | "rtl" {
  return useI18n().dir;
}

/**
 * Locale-aware formatters.
 *
 * Dates, decimal separators and currency placement all differ by locale —
 * "1,234.50" in English is "1 234,50" in French — so formatting is derived
 * from the active locale rather than hardcoded to US conventions.
 */
export function useFormatters() {
  const { locale } = useI18n();
  const tag = LOCALE_META[locale]?.intlTag ?? LOCALE_META[DEFAULT_LOCALE].intlTag;

  return useMemo(
    () => ({
      number: (value: number) => new Intl.NumberFormat(tag).format(value),
      currency: (value: number, currency = "USD") =>
        new Intl.NumberFormat(tag, { style: "currency", currency }).format(value),
      date: (value: Date | string) =>
        new Intl.DateTimeFormat(tag, { dateStyle: "medium" }).format(new Date(value)),
      dateTime: (value: Date | string) =>
        new Intl.DateTimeFormat(tag, { dateStyle: "medium", timeStyle: "short" }).format(
          new Date(value),
        ),
      percent: (value: number) =>
        new Intl.NumberFormat(tag, { style: "percent", maximumFractionDigits: 1 }).format(value),
    }),
    [tag],
  );
}
