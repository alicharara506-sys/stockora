import "server-only";
import { cookies, headers } from "next/headers";
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  isLocale,
  matchLocale,
  type Locale,
} from "@/lib/i18n/config";
import { getDictionary, type Messages } from "@/lib/i18n/dictionaries";

/**
 * Resolves the active locale for this request.
 *
 * An explicit choice in the cookie always wins; otherwise the browser's
 * Accept-Language header decides, so a first-time Arabic or French visitor
 * lands in their own language without having to find the switcher.
 */
export async function getLocale(): Promise<Locale> {
  const stored = (await cookies()).get(LOCALE_COOKIE)?.value;
  if (isLocale(stored)) return stored;

  const accept = (await headers()).get("accept-language");
  return matchLocale(accept) ?? DEFAULT_LOCALE;
}

export async function getMessages(): Promise<{ locale: Locale; messages: Messages }> {
  const locale = await getLocale();
  return { locale, messages: await getDictionary(locale) };
}

/**
 * Substitutes {placeholders} in a message.
 *
 * Values are interpolated as plain text, never parsed as markup, so a
 * business name containing a bracket or angle bracket can't alter the output.
 */
export function interpolate(template: string, values?: Record<string, string | number>): string {
  if (!values) return template;
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in values ? String(values[key]) : match,
  );
}
