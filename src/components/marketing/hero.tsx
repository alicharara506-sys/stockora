import Link from "next/link";
import { Cloud, ShieldCheck, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Container } from "@/components/ui/container";
import { HeroVisual } from "@/components/marketing/hero-visual";

const VALUE_CARDS = [
  { icon: Cloud, label: "Cloud Based" },
  { icon: ShieldCheck, label: "Secure" },
  { icon: TrendingUp, label: "Built for Growth" },
];

export function Hero() {
  return (
    <section className="bg-grid-purple relative overflow-hidden bg-gradient-to-b from-brand-purple-lightest/60 to-white">
      <Container className="grid gap-12 py-16 lg:grid-cols-2 lg:items-center lg:py-24">
        <div>
          <Badge variant="purple" className="mb-6">
            14-day free trial · No credit card required
          </Badge>
          <h1 className="font-display text-4xl font-bold leading-[1.1] text-brand-black sm:text-5xl">
            Sell Smarter.
            <br />
            Manage Easier.
            <br />
            <span className="text-brand-purple-bright">Grow Faster.</span>
          </h1>
          <p className="mt-6 max-w-lg text-lg text-brand-muted">
            Stockora is the all-in-one cloud POS and inventory management platform built for
            apparel, footwear, and modern retail businesses.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link href="/signup">Start Free Trial</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <a href="#features">Watch Demo</a>
            </Button>
          </div>

          <div className="mt-10 grid grid-cols-3 gap-3">
            {VALUE_CARDS.map((card) => (
              <div
                key={card.label}
                className="flex flex-col items-center gap-2 rounded-2xl border border-brand-border bg-white/70 px-3 py-4 text-center shadow-card"
              >
                <card.icon className="size-5 text-brand-purple" />
                <span className="text-xs font-semibold text-brand-black">{card.label}</span>
              </div>
            ))}
          </div>
        </div>

        <HeroVisual />
      </Container>
    </section>
  );
}
