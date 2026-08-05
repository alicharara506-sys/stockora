import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { matchLocale, isLocale, localeDir, LOCALES, LOCALE_META } from "@/lib/i18n/config";
import en from "@/messages/en.json";
import ar from "@/messages/ar.json";
import fr from "@/messages/fr.json";
import es from "@/messages/es.json";

const catalogs: Record<string, unknown> = { ar, fr, es };

/** Flattens to dotted paths so a nested key can be compared across catalogs. */
function keyPaths(value: unknown, prefix = ""): string[] {
  if (typeof value !== "object" || value === null) return [prefix];
  return Object.entries(value as Record<string, unknown>).flatMap(([key, child]) =>
    keyPaths(child, prefix ? `${prefix}.${key}` : key),
  );
}

describe("message catalogs", () => {
  const englishKeys = keyPaths(en).sort();

  for (const [locale, catalog] of Object.entries(catalogs)) {
    test(`${locale} has every English key`, () => {
      const missing = englishKeys.filter((k) => !keyPaths(catalog).includes(k));
      assert.deepEqual(missing, [], `${locale} is missing: ${missing.join(", ")}`);
    });

    test(`${locale} has no keys English lacks`, () => {
      // An extra key is dead weight that silently never renders.
      const extra = keyPaths(catalog).filter((k) => !englishKeys.includes(k));
      assert.deepEqual(extra, [], `${locale} has stray keys: ${extra.join(", ")}`);
    });

    test(`${locale} leaves no value empty`, () => {
      const flatten = (obj: unknown, prefix = ""): [string, unknown][] =>
        typeof obj === "object" && obj !== null
          ? Object.entries(obj as Record<string, unknown>).flatMap(([k, v]) =>
              flatten(v, prefix ? `${prefix}.${k}` : k),
            )
          : [[prefix, obj]];

      const empty = flatten(catalog)
        .filter(([, v]) => typeof v === "string" && v.trim() === "")
        .map(([k]) => k);
      assert.deepEqual(empty, [], `${locale} has empty strings at: ${empty.join(", ")}`);
    });

    test(`${locale} preserves every {placeholder}`, () => {
      // A dropped placeholder renders "Welcome to" with no business name;
      // an invented one renders a literal "{foo}" to the user.
      const placeholders = (s: string) => (s.match(/\{(\w+)\}/g) ?? []).sort();
      const walk = (a: unknown, b: unknown, path = "") => {
        if (typeof a === "string") {
          assert.deepEqual(
            placeholders(b as string),
            placeholders(a),
            `${locale} placeholder mismatch at ${path}`,
          );
          return;
        }
        if (typeof a === "object" && a !== null) {
          for (const [k, v] of Object.entries(a as Record<string, unknown>)) {
            walk(v, (b as Record<string, unknown>)?.[k], path ? `${path}.${k}` : k);
          }
        }
      };
      walk(en, catalog);
    });
  }
});

describe("locale config", () => {
  test("every locale has metadata", () => {
    for (const locale of LOCALES) {
      assert.ok(LOCALE_META[locale], `${locale} has no metadata`);
      assert.ok(LOCALE_META[locale].nativeName.length > 0);
    }
  });

  test("Arabic is right-to-left and the rest are not", () => {
    assert.equal(localeDir("ar"), "rtl");
    for (const locale of LOCALES.filter((l) => l !== "ar")) {
      assert.equal(localeDir(locale), "ltr");
    }
  });

  test("isLocale accepts supported codes and rejects others", () => {
    assert.ok(isLocale("fr"));
    assert.equal(isLocale("de"), false);
    assert.equal(isLocale(""), false);
    assert.equal(isLocale(undefined), false);
  });
});

describe("matchLocale", () => {
  test("matches a plain language tag", () => {
    assert.equal(matchLocale("fr"), "fr");
  });

  test("matches a regional tag on its base language", () => {
    assert.equal(matchLocale("fr-CA,fr;q=0.9"), "fr");
    assert.equal(matchLocale("ar-LB"), "ar");
  });

  test("respects q-weights rather than order", () => {
    // English is weighted higher despite appearing second.
    assert.equal(matchLocale("fr;q=0.5, en;q=1.0"), "en");
  });

  test("skips unsupported languages to the first supported one", () => {
    assert.equal(matchLocale("de-DE,de;q=0.9,es;q=0.8"), "es");
  });

  test("falls back to English when nothing matches or the header is absent", () => {
    assert.equal(matchLocale("de,ja,zh"), "en");
    assert.equal(matchLocale(null), "en");
    assert.equal(matchLocale(""), "en");
  });
});
