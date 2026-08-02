import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";

export function FinalCTA() {
  return (
    <section className="py-20">
      <Container>
        <div className="flex flex-col items-center gap-6 rounded-3xl bg-brand-purple px-8 py-14 text-center shadow-glow-purple sm:px-16">
          <h2 className="font-display text-3xl font-bold text-white sm:text-4xl">
            Join the Future of Retail
          </h2>
          <p className="max-w-lg text-white/80">
            Choose Stockora and take your business to the next level.
          </p>
          <Button asChild size="lg" variant="dark" className="bg-white text-brand-purple hover:bg-white/90">
            <Link href="/signup" className="flex items-center gap-2">
              Get Started Today
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
      </Container>
    </section>
  );
}
