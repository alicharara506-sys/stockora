import type { TaxTreatment } from "@/lib/tax/calculate";

/** What tax regime a country runs. NONE means no general sales tax exists
 * there — distinct from a business defining a bespoke CUSTOM rule. */
export type CountryTaxSystem = "VAT" | "GST" | "SALES_TAX" | "CONSUMPTION_TAX" | "NONE";

/** The systems a stored tax rule can use — mirrors the Prisma TaxSystem enum. */
export type TaxRuleSystem = "VAT" | "GST" | "SALES_TAX" | "CONSUMPTION_TAX" | "CUSTOM";

export interface CountryTaxPreset {
  code: string;
  name: string;
  system: CountryTaxSystem;
  /** Standard headline rate as a percentage. */
  standardRate: number;
  /** Whether consumer-facing prices in this market conventionally include tax. */
  pricesIncludeTax: boolean;
  note?: string;
}

/**
 * Reference tax presets, used only to prefill the form when an admin picks a
 * country — never applied automatically.
 *
 * These are the standard headline rates for general goods. They are a starting
 * point, NOT tax advice: rates change, reduced/zero rates apply to specific
 * goods (food, books, medicine), and sub-national taxes may stack on top. The
 * admin confirms or edits the rate before anything is charged, and the UI says
 * so. Verify against the current local tax authority before going live.
 */
export const COUNTRY_TAX_PRESETS: CountryTaxPreset[] = [
  // --- Middle East & North Africa ---
  { code: "LB", name: "Lebanon", system: "VAT", standardRate: 11, pricesIncludeTax: true },
  { code: "AE", name: "United Arab Emirates", system: "VAT", standardRate: 5, pricesIncludeTax: true },
  { code: "SA", name: "Saudi Arabia", system: "VAT", standardRate: 15, pricesIncludeTax: true },
  { code: "BH", name: "Bahrain", system: "VAT", standardRate: 10, pricesIncludeTax: true },
  { code: "OM", name: "Oman", system: "VAT", standardRate: 5, pricesIncludeTax: true },
  { code: "QA", name: "Qatar", system: "NONE", standardRate: 0, pricesIncludeTax: true, note: "No general VAT in force." },
  { code: "KW", name: "Kuwait", system: "NONE", standardRate: 0, pricesIncludeTax: true, note: "No general VAT in force." },
  { code: "EG", name: "Egypt", system: "VAT", standardRate: 14, pricesIncludeTax: true },
  { code: "JO", name: "Jordan", system: "GST", standardRate: 16, pricesIncludeTax: true },
  { code: "MA", name: "Morocco", system: "VAT", standardRate: 20, pricesIncludeTax: true },
  { code: "TN", name: "Tunisia", system: "VAT", standardRate: 19, pricesIncludeTax: true },
  { code: "TR", name: "Türkiye", system: "VAT", standardRate: 20, pricesIncludeTax: true },

  // --- Europe ---
  { code: "GB", name: "United Kingdom", system: "VAT", standardRate: 20, pricesIncludeTax: true },
  { code: "IE", name: "Ireland", system: "VAT", standardRate: 23, pricesIncludeTax: true },
  { code: "FR", name: "France", system: "VAT", standardRate: 20, pricesIncludeTax: true },
  { code: "DE", name: "Germany", system: "VAT", standardRate: 19, pricesIncludeTax: true },
  { code: "ES", name: "Spain", system: "VAT", standardRate: 21, pricesIncludeTax: true },
  { code: "IT", name: "Italy", system: "VAT", standardRate: 22, pricesIncludeTax: true },
  { code: "NL", name: "Netherlands", system: "VAT", standardRate: 21, pricesIncludeTax: true },
  { code: "BE", name: "Belgium", system: "VAT", standardRate: 21, pricesIncludeTax: true },
  { code: "PT", name: "Portugal", system: "VAT", standardRate: 23, pricesIncludeTax: true },
  { code: "GR", name: "Greece", system: "VAT", standardRate: 24, pricesIncludeTax: true },
  { code: "PL", name: "Poland", system: "VAT", standardRate: 23, pricesIncludeTax: true },
  { code: "SE", name: "Sweden", system: "VAT", standardRate: 25, pricesIncludeTax: true },
  { code: "DK", name: "Denmark", system: "VAT", standardRate: 25, pricesIncludeTax: true },
  { code: "NO", name: "Norway", system: "VAT", standardRate: 25, pricesIncludeTax: true },
  { code: "CH", name: "Switzerland", system: "VAT", standardRate: 8.1, pricesIncludeTax: true },

  // --- Americas ---
  {
    code: "US",
    name: "United States",
    system: "SALES_TAX",
    standardRate: 0,
    pricesIncludeTax: false,
    note: "Sales tax is set by state and locality — add a rule per rate you collect.",
  },
  {
    code: "CA",
    name: "Canada",
    system: "GST",
    standardRate: 5,
    pricesIncludeTax: false,
    note: "Federal GST. Provincial PST/HST may stack — add it as a compound rule.",
  },
  { code: "MX", name: "Mexico", system: "VAT", standardRate: 16, pricesIncludeTax: true },
  { code: "BR", name: "Brazil", system: "VAT", standardRate: 17, pricesIncludeTax: true, note: "ICMS varies by state; confirm your rate." },

  // --- Asia & Pacific ---
  { code: "AU", name: "Australia", system: "GST", standardRate: 10, pricesIncludeTax: true },
  { code: "NZ", name: "New Zealand", system: "GST", standardRate: 15, pricesIncludeTax: true },
  { code: "IN", name: "India", system: "GST", standardRate: 18, pricesIncludeTax: true, note: "GST slabs vary by product (5/12/18/28%)." },
  { code: "SG", name: "Singapore", system: "GST", standardRate: 9, pricesIncludeTax: true },
  { code: "JP", name: "Japan", system: "CONSUMPTION_TAX", standardRate: 10, pricesIncludeTax: true },

  // --- Africa ---
  { code: "ZA", name: "South Africa", system: "VAT", standardRate: 15, pricesIncludeTax: true },
  { code: "NG", name: "Nigeria", system: "VAT", standardRate: 7.5, pricesIncludeTax: true },
  { code: "KE", name: "Kenya", system: "VAT", standardRate: 16, pricesIncludeTax: true },
];

export function findCountryPreset(code: string): CountryTaxPreset | undefined {
  return COUNTRY_TAX_PRESETS.find((preset) => preset.code === code);
}

export const TAX_TREATMENT_LABELS: Record<TaxTreatment, string> = {
  STANDARD: "Standard rated",
  ZERO_RATED: "Zero rated",
  EXEMPT: "Exempt",
  REVERSE_CHARGE: "Reverse charge",
};

/** Labels for a country's regime, including "no tax at all". */
export const COUNTRY_SYSTEM_LABELS: Record<CountryTaxSystem, string> = {
  VAT: "VAT",
  GST: "GST",
  SALES_TAX: "Sales tax",
  CONSUMPTION_TAX: "Consumption tax",
  NONE: "No general tax",
};

/** Labels for a stored rule's system, including business-defined CUSTOM. */
export const TAX_SYSTEM_LABELS: Record<TaxRuleSystem, string> = {
  VAT: "VAT",
  GST: "GST",
  SALES_TAX: "Sales tax",
  CONSUMPTION_TAX: "Consumption tax",
  CUSTOM: "Custom",
};
