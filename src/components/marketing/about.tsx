import { Target, Eye, Gem } from "lucide-react";
import { Container } from "@/components/ui/container";

const PILLARS = [
  {
    icon: Target,
    title: "Our Mission",
    body: "Simplify retail operations and help businesses grow with smart technology.",
  },
  {
    icon: Eye,
    title: "Our Vision",
    body: "Become a trusted global retail-management platform.",
  },
  {
    icon: Gem,
    title: "Our Values",
    body: "Simplicity, reliability, innovation, and customer success.",
  },
];

export function About() {
  return (
    <section className="py-20">
      <Container>
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-3xl font-bold text-brand-black">About Stockora</h2>
          <p className="mt-4 text-brand-muted">
            Stockora empowers retailers with a powerful yet easy-to-use system that helps power
            their entire business, increase profits, and deliver better customer experiences.
          </p>
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-3">
          {PILLARS.map((pillar) => (
            <div
              key={pillar.title}
              className="rounded-2xl border border-brand-border bg-white p-6 text-center shadow-card"
            >
              <div className="mx-auto flex size-11 items-center justify-center rounded-xl bg-brand-purple-lightest text-brand-purple">
                <pillar.icon className="size-5" />
              </div>
              <h3 className="mt-4 font-display text-base font-semibold text-brand-black">
                {pillar.title}
              </h3>
              <p className="mt-2 text-sm text-brand-muted">{pillar.body}</p>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
