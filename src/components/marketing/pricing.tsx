import { Container } from "@/components/ui/container";
import { PricingGrid } from "@/components/marketing/pricing-grid";
import { getPublicPlans } from "@/lib/plans";

export async function Pricing() {
  const plans = await getPublicPlans();

  const serializedPlans = plans.map((plan) => ({
    key: plan.key,
    name: plan.name,
    monthlyPrice: Number(plan.monthlyPrice),
    annualPrice: Number(plan.annualPrice),
    features: Array.isArray(plan.features) ? (plan.features as string[]) : [],
  }));

  return (
    <section id="pricing" className="bg-brand-purple-lightest/40 py-20">
      <Container>
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-3xl font-bold text-brand-black">
            Simple, transparent pricing
          </h2>
          <p className="mt-4 text-brand-muted">
            Start free for 14 days. Upgrade, downgrade, or cancel anytime.
          </p>
        </div>

        <div className="mt-12">
          <PricingGrid plans={serializedPlans} />
        </div>
      </Container>
    </section>
  );
}
