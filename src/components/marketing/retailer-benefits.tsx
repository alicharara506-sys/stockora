import { Check } from "lucide-react";
import { Container } from "@/components/ui/container";

const BENEFITS = [
  "Easy to use",
  "Saves time",
  "Increases profit",
  "Access from anywhere",
  "Reduces stock loss",
  "Improves customer service",
  "Supports multiple branches",
  "Provides real-time reports",
];

export function RetailerBenefits() {
  return (
    <section className="bg-brand-black py-20">
      <Container>
        <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
          <div>
            <h2 className="font-display text-3xl font-bold text-white">
              Why retailers love Stockora
            </h2>
            <p className="mt-4 max-w-md text-white/60">
              A clean interface your whole team will love, with real gains that show up in your
              bottom line.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {BENEFITS.map((benefit) => (
              <div key={benefit} className="flex items-center gap-3 rounded-xl bg-white/5 px-4 py-3">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-purple-bright/20 text-brand-purple-bright">
                  <Check className="size-3.5" />
                </span>
                <span className="text-sm font-medium text-white">{benefit}</span>
              </div>
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
}
