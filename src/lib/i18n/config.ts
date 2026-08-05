/**
 * Supported locales.
 *
 * The locale lives in a cookie rather than a URL segment. The alternative —
 * nesting all 41 routes under `app/[lang]/` — would rewrite every route file
 * and every internal href for an application that sits almost entirely behind
 * a login and is not indexed. If public marketing pages later need per-locale
 * URLs for SEO, that can be added for those routes alone without disturbing
 * the authenticated app.
 */
export const LOCALES = ["en", "ar", "fr", "es"] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";

export const LOCALE_COOKIE = "stockora-locale";

export interface LocaleMeta {
  code: Locale;
  /** Shown in the switcher, in the language itself — a French speaker looks
   * for "Français", not "French". */
  nativeName: string;
  englishName: string;
  dir: "ltr" | "rtl";
  /** BCP 47 tag used for Intl date, number and currency formatting. */
  intlTag: string;
}

export const LOCALE_META: Record<Locale, LocaleMeta> = {
  en: { code: "en", nativeName: "English", englishName: "English", dir: "ltr", intlTag: "en-US" },
  ar: { code: "ar", nativeName: "العربية", englishName: "Arabic", dir: "rtl", intlTag: "ar" },
  fr: { code: "fr", nativeName: "Français", englishName: "French", dir: "ltr", intlTag: "fr-FR" },
  es: { code: "es", nativeName: "Español", englishName: "Spanish", dir: "ltr", intlTag: "es-ES" },
};

export function isLocale(value: string | undefined | null): value is Locale {
  return !!value && (LOCALES as readonly string[]).includes(value);
}

export function localeDir(locale: Locale): "ltr" | "rtl" {
  return LOCALE_META[locale].dir;
}

/**
 * Picks the best supported locale from an Accept-Language header.
 *
 * Matches on the base language ("fr-CA" -> "fr") because the catalogs are not
 * region-specific, and respects q-weights so a browser listing
 * "fr;q=0.9, en;q=1.0" gets English.
 */
export function matchLocale(acceptLanguage: string | null | undefined): Locale {
  if (!acceptLanguage) return DEFAULT_LOCALE;

  const ranked = acceptLanguage
    .split(",")
    .map((part) => {
      const [tag, ...params] = part.trim().split(";");
      const q = params.find((p) => p.trim().startsWith("q="));
      const quality = q ? Number.parseFloat(q.split("=")[1]) : 1;
      return { tag: tag.trim().toLowerCase(), quality: Number.isNaN(quality) ? 0 : quality };
    })
    .filter((entry) => entry.tag.length > 0)
    .sort((a, b) => b.quality - a.quality);

  for (const { tag } of ranked) {
    const base = tag.split("-")[0];
    if (isLocale(base)) return base;
  }
  return DEFAULT_LOCALE;
}
