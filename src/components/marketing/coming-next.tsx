import { Rocket } from "lucide-react";
import { Container } from "@/components/ui/container";

const COMING_NEXT = [
  "AI-powered insights",
  "Mobile wallet integration",
  "Advanced loyalty program",
  "Marketplace",
  "Open API",
  "Voice search in POS",
];

export function ComingNext() {
  return (
    <section className="bg-brand-purple-lightest/40 py-20">
      <Container className="grid gap-10 lg:grid-cols-2 lg:items-center">
        <div className="flex items-center gap-4">
          <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-brand-purple text-white">
            <Rocket className="size-6" />
          </div>
          <div>
            <h2 className="font-display text-2xl font-bold text-brand-black">What&apos;s coming next</h2>
            <p className="mt-1 text-sm text-brand-muted">On the Stockora roadmap</p>
          </div>
        </div>
        <ul className="grid grid-cols-2 gap-3">
          {COMING_NEXT.map((item) => (
            <li
              key={item}
              className="rounded-xl border border-brand-border bg-white px-4 py-2.5 text-sm font-medium text-brand-black"
            >
              {item}
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
