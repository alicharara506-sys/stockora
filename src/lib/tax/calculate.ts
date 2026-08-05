import { toCents, toMajor, roundHalfAwayFromZero } from "@/lib/money";

/**
 * How a tax behaves for the party being charged.
 *
 * STANDARD       — charged normally at its rate.
 * ZERO_RATED     — in scope but charged at 0% (e.g. exported goods). Still
 *                  reported, unlike EXEMPT, which is out of scope entirely.
 * EXEMPT         — no tax, and out of scope for tax reporting.
 * REVERSE_CHARGE — the buyer self-accounts for the tax, so the seller charges
 *                  nothing. Recorded so it can be disclosed on the invoice.
 */
export type TaxTreatment = "STANDARD" | "ZERO_RATED" | "EXEMPT" | "REVERSE_CHARGE";

export interface TaxRule {
  id: string;
  name: string;
  /** Percentage, e.g. 11 for 11%. */
  rate: number;
  /** A compound tax applies on top of the net *plus* the taxes before it,
   * rather than on the net alone (e.g. Canadian PST stacked on GST). */
  isCompound: boolean;
  treatment: TaxTreatment;
}

export interface TaxLineBreakdown {
  taxId: string;
  name: string;
  rate: number;
  treatment: TaxTreatment;
  /** Tax charged, in major units. Zero for non-STANDARD treatments. */
  amount: number;
}

export interface LineTaxResult {
  /** Amount excluding tax. */
  net: number;
  /** Total tax charged. */
  tax: number;
  /** Amount including tax — what the customer pays for this line. */
  gross: number;
  breakdown: TaxLineBreakdown[];
}

/** Only STANDARD taxes are actually charged; the rest resolve to 0% but are
 * still carried through the breakdown so invoices and reports can disclose
 * them (an exempt line must be visibly exempt, not silently absent). */
function effectiveRate(rule: TaxRule): number {
  return rule.treatment === "STANDARD" ? rule.rate : 0;
}

/**
 * Computes each tax's multiplier relative to the net amount.
 *
 * Simple taxes apply to the net. Compound taxes apply to the net plus every
 * tax accumulated before them, so order is significant — rules are applied in
 * the order given, which the caller sorts (non-compound first).
 *
 * Returns the per-rule multipliers and their sum, so `gross = net * (1 + sum)`.
 */
function taxMultipliers(rules: TaxRule[]): { multipliers: number[]; total: number } {
  let accumulated = 0;
  const multipliers = rules.map((rule) => {
    const rate = effectiveRate(rule) / 100;
    const multiplier = rule.isCompound ? (1 + accumulated) * rate : rate;
    accumulated += multiplier;
    return multiplier;
  });
  return { multipliers, total: accumulated };
}

/** Non-compound taxes must resolve before compound ones stack on top. */
export function orderRules(rules: TaxRule[]): TaxRule[] {
  return [...rules].sort((a, b) => Number(a.isCompound) - Number(b.isCompound));
}

/**
 * Calculates tax for a single line.
 *
 * @param amount        Line amount after discount, in major units. Interpreted
 *                      as tax-inclusive or tax-exclusive per `pricesIncludeTax`.
 * @param rules         Taxes that apply to this line.
 * @param pricesIncludeTax Whether `amount` already contains the tax.
 *
 * With tax disabled (no rules), this returns the amount untouched with zero
 * tax — so a business that never enables tax sees identical behavior.
 */
export function calculateLineTax(
  amount: number,
  rules: TaxRule[],
  pricesIncludeTax: boolean,
): LineTaxResult {
  const ordered = orderRules(rules);
  const amountCents = toCents(amount);

  if (ordered.length === 0) {
    return { net: toMajor(amountCents), tax: 0, gross: toMajor(amountCents), breakdown: [] };
  }

  const { multipliers, total } = taxMultipliers(ordered);

  // Inclusive: the given amount is the gross, so divide the tax back out.
  // Exclusive: the given amount is the net, so add tax on top.
  const netCents = pricesIncludeTax
    ? roundHalfAwayFromZero(amountCents / (1 + total))
    : amountCents;

  const breakdown: TaxLineBreakdown[] = ordered.map((rule, index) => ({
    taxId: rule.id,
    name: rule.name,
    rate: rule.rate,
    treatment: rule.treatment,
    amount: toMajor(roundHalfAwayFromZero(netCents * multipliers[index])),
  }));

  // Derive total tax from the gross/net difference rather than summing the
  // rounded parts, so the line always reconciles: net + tax === gross.
  const grossCents = pricesIncludeTax
    ? amountCents
    : netCents + roundHalfAwayFromZero(netCents * total);

  return {
    net: toMajor(netCents),
    tax: toMajor(grossCents - netCents),
    gross: toMajor(grossCents),
    breakdown,
  };
}

export interface CartLineInput {
  /** Stable identifier echoed back on the result, e.g. a variant id. */
  key: string;
  unitPrice: number;
  quantity: number;
  /** Discount already applied to this line, in major units. */
  discountAmount?: number;
  rules: TaxRule[];
}

export interface CartLineResult extends LineTaxResult {
  key: string;
}

export interface CartTaxResult {
  lines: CartLineResult[];
  /** Sum of line nets — the tax-exclusive subtotal. */
  subtotal: number;
  taxTotal: number;
  /** What the customer pays. */
  total: number;
  /** Tax grouped by rule, for receipts and tax reports. */
  summary: { taxId: string; name: string; rate: number; treatment: TaxTreatment; amount: number }[];
}

/**
 * Calculates tax across a whole cart, returning per-line detail plus totals
 * and a per-rule summary suitable for a receipt footer or a VAT return.
 */
export function calculateCartTax(lines: CartLineInput[], pricesIncludeTax: boolean): CartTaxResult {
  const results: CartLineResult[] = lines.map((line) => {
    const lineAmount = line.unitPrice * line.quantity - (line.discountAmount ?? 0);
    return { key: line.key, ...calculateLineTax(lineAmount, line.rules, pricesIncludeTax) };
  });

  const subtotalCents = results.reduce((sum, line) => sum + toCents(line.net), 0);
  const taxCents = results.reduce((sum, line) => sum + toCents(line.tax), 0);

  const summaryByTax = new Map<string, CartTaxResult["summary"][number]>();
  for (const line of results) {
    for (const entry of line.breakdown) {
      const existing = summaryByTax.get(entry.taxId);
      if (existing) {
        existing.amount = toMajor(toCents(existing.amount) + toCents(entry.amount));
      } else {
        summaryByTax.set(entry.taxId, {
          taxId: entry.taxId,
          name: entry.name,
          rate: entry.rate,
          treatment: entry.treatment,
          amount: entry.amount,
        });
      }
    }
  }

  return {
    lines: results,
    subtotal: toMajor(subtotalCents),
    taxTotal: toMajor(taxCents),
    total: toMajor(subtotalCents + taxCents),
    summary: Array.from(summaryByTax.values()),
  };
}
