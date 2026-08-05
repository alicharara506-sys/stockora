import "server-only";
import { prisma } from "@/lib/prisma";
import type { TaxRule, TaxTreatment } from "@/lib/tax/calculate";

export interface TaxContext {
  /** When false every lookup returns no rules, so totals stay untaxed. */
  enabled: boolean;
  pricesIncludeTax: boolean;
  country: string | null;
  registrationNumber: string | null;
  defaultRule: TaxRule | null;
  rulesById: Map<string, TaxRule>;
}

export const DISABLED_TAX_CONTEXT: TaxContext = {
  enabled: false,
  pricesIncludeTax: false,
  country: null,
  registrationNumber: null,
  defaultRule: null,
  rulesById: new Map(),
};

function toRule(tax: {
  id: string;
  name: string;
  rate: unknown;
  isCompound: boolean;
  treatment: TaxTreatment;
}): TaxRule {
  return {
    id: tax.id,
    name: tax.name,
    rate: Number(tax.rate),
    isCompound: tax.isCompound,
    treatment: tax.treatment,
  };
}

/**
 * Loads a business's tax configuration once per request.
 *
 * Returns the disabled context when taxation is off, so callers never have to
 * branch on the setting themselves — they just get zero rules back.
 */
export async function loadTaxContext(businessId: string): Promise<TaxContext> {
  const setting = await prisma.businessSetting.findUnique({ where: { businessId } });
  if (!setting?.taxEnabled) return DISABLED_TAX_CONTEXT;

  const taxes = await prisma.tax.findMany({
    where: { businessId, isActive: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });

  const rules = taxes.map(toRule);
  const defaultTax = taxes.find((tax) => tax.isDefault);

  return {
    enabled: true,
    pricesIncludeTax: setting.pricesIncludeTax,
    country: setting.taxCountry,
    registrationNumber: setting.taxRegistrationNumber,
    defaultRule: defaultTax ? toRule(defaultTax) : null,
    rulesById: new Map(rules.map((rule) => [rule.id, rule])),
  };
}

export interface ResolveTarget {
  /** Tax set directly on the variant — the most specific wins. */
  variantTaxId?: string | null;
  /** Tax set on the parent product. */
  productTaxId?: string | null;
}

/**
 * Picks the tax rules for one line.
 *
 * Precedence is variant -> product -> business default, so a single variant
 * can override its product without duplicating rules. A tax-exempt customer
 * overrides everything: the rule is still returned (so the invoice can show
 * *why* nothing was charged) but forced to the EXEMPT treatment.
 */
export function resolveRules(
  context: TaxContext,
  target: ResolveTarget,
  options: { customerExempt?: boolean } = {},
): TaxRule[] {
  if (!context.enabled) return [];

  const specific =
    (target.variantTaxId && context.rulesById.get(target.variantTaxId)) ||
    (target.productTaxId && context.rulesById.get(target.productTaxId)) ||
    context.defaultRule;

  if (!specific) return [];

  if (options.customerExempt) {
    return [{ ...specific, treatment: "EXEMPT" }];
  }
  return [specific];
}
