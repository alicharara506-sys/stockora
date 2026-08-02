import Link from "next/link";
import { Container } from "@/components/ui/container";
import { Logo } from "@/components/ui/logo";

export function LegalPage({
  title,
  updatedAt,
  children,
}: {
  title: string;
  updatedAt: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-brand-border">
        <Container className="flex h-16 items-center">
          <Link href="/">
            <Logo />
          </Link>
        </Container>
      </header>
      <Container className="max-w-3xl py-14">
        <h1 className="font-display text-3xl font-bold text-brand-black">{title}</h1>
        <p className="mt-2 text-sm text-brand-muted">Last updated: {updatedAt}</p>
        <div className="mt-8 space-y-5 text-sm leading-relaxed text-brand-black/80 [&_h2]:mt-8 [&_h2]:font-display [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-brand-black">
          {children}
        </div>
      </Container>
    </div>
  );
}
