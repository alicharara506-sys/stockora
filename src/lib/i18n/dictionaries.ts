import "server-only";
import type { Locale } from "@/lib/i18n/config";
import en from "@/messages/en.json";

/**
 * English is the source of truth: every other catalog is typed against it, so
 * a missing or misspelled key fails the build rather than rendering a raw
 * key like "pos.charge" to a customer at the till.
 */
export type Messages = typeof en;

const dictionaries: Record<Locale, () => Promise<Messages>> = {
  en: async () => en,
  ar: () => import("@/messages/ar.json").then((m) => m.default),
  fr: () => import("@/messages/fr.json").then((m) => m.default),
  es: () => import("@/messages/es.json").then((m) => m.default),
};

/** Loaded per request in a Server Component; never ships to the browser. */
export async function getDictionary(locale: Locale): Promise<Messages> {
  return dictionaries[locale]();
}
