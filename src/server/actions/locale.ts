"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { LOCALE_COOKIE, isLocale } from "@/lib/i18n/config";

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

/**
 * Stores the chosen language.
 *
 * Not httpOnly: the value is a display preference with no security meaning,
 * and keeping it readable lets client code react without another round trip.
 */
export async function setLocaleAction(locale: string): Promise<{ success: boolean }> {
  if (!isLocale(locale)) return { success: false };

  (await cookies()).set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: ONE_YEAR_SECONDS,
    sameSite: "lax",
  });

  // Every rendered string depends on the locale, so the whole tree is stale.
  revalidatePath("/", "layout");
  return { success: true };
}
