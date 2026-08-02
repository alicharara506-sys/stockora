import { Shirt, Footprints, Baby, Store, Dumbbell, Building, Layers } from "lucide-react";
import { Container } from "@/components/ui/container";

const INDUSTRIES = [
  { icon: Shirt, label: "Clothing stores" },
  { icon: Footprints, label: "Footwear stores" },
  { icon: Baby, label: "Kids & baby stores" },
  { icon: Store, label: "Boutiques" },
  { icon: Dumbbell, label: "Sports & accessories" },
  { icon: Building, label: "Department stores" },
  { icon: Layers, label: "Fashion chains" },
];

export function Industries() {
  return (
    <section id="industries" className="py-20">
      <Container>
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-3xl font-bold text-brand-black">Built for retail</h2>
          <p className="mt-4 text-brand-muted">
            Purpose-built for the businesses that live and breathe merchandise variety.
          </p>
        </div>

        <div className="mt-12 flex flex-wrap justify-center gap-4">
          {INDUSTRIES.map((industry) => (
            <div
              key={industry.label}
              className="flex items-center gap-2.5 rounded-full border border-brand-border bg-white px-5 py-3 shadow-card"
            >
              <industry.icon className="size-4 text-brand-purple" />
              <span className="text-sm font-medium text-brand-black">{industry.label}</span>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
