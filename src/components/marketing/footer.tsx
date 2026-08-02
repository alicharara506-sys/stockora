import Link from "next/link";
import { Mail, Phone } from "lucide-react";
import { Container } from "@/components/ui/container";
import { Logo } from "@/components/ui/logo";
import { SocialIcon, type SocialPlatform } from "@/components/ui/social-icon";

const SOCIAL_PLATFORMS: SocialPlatform[] = ["facebook", "instagram", "linkedin"];

const PRODUCT_LINKS = [
  { href: "#features", label: "Features" },
  { href: "#pricing", label: "Pricing" },
  { href: "#ai-assistant", label: "AI Assistant" },
  { href: "#qr-solutions", label: "QR Solutions" },
];

const COMPANY_LINKS = [
  { href: "#contact", label: "Contact" },
  { href: "/login", label: "Login" },
  { href: "/signup", label: "Start Free Trial" },
];

const LEGAL_LINKS = [
  { href: "/legal/privacy", label: "Privacy Policy" },
  { href: "/legal/terms", label: "Terms of Service" },
];

export function MarketingFooter() {
  return (
    <footer id="contact" className="border-t border-brand-border bg-white">
      <Container className="grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <Logo showSubtitle />
          <p className="mt-4 max-w-xs text-sm text-brand-muted">
            Smart Retail POS &amp; Inventory — Sell Smarter. Manage Easier. Grow Faster.
          </p>
          <div className="mt-5 flex gap-3">
            {SOCIAL_PLATFORMS.map((platform) => (
              <span
                key={platform}
                className="flex size-9 items-center justify-center rounded-full border border-brand-border text-brand-muted"
              >
                <SocialIcon platform={platform} className="size-4" />
              </span>
            ))}
          </div>
        </div>

        <FooterColumn title="Product" links={PRODUCT_LINKS} />
        <FooterColumn title="Company" links={COMPANY_LINKS} />

        <div>
          <h3 className="font-display text-sm font-semibold text-brand-black">Contact</h3>
          <ul className="mt-4 space-y-2.5 text-sm text-brand-muted">
            <li className="flex items-center gap-2">
              <Mail className="size-4 text-brand-purple" /> hello@stockora.com
            </li>
            <li className="flex items-center gap-2">
              <Phone className="size-4 text-brand-purple" /> +961 3 000 000
            </li>
          </ul>
        </div>
      </Container>

      <div className="border-t border-brand-border">
        <Container className="flex flex-col items-center justify-between gap-3 py-6 sm:flex-row">
          <p className="text-xs text-brand-muted">
            © {new Date().getFullYear()} Stockora. All rights reserved.
          </p>
          <div className="flex gap-5">
            {LEGAL_LINKS.map((link) => (
              <Link key={link.href} href={link.href} className="text-xs text-brand-muted hover:text-brand-purple">
                {link.label}
              </Link>
            ))}
          </div>
        </Container>
      </div>
    </footer>
  );
}

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: { href: string; label: string }[];
}) {
  return (
    <div>
      <h3 className="font-display text-sm font-semibold text-brand-black">{title}</h3>
      <ul className="mt-4 space-y-2.5">
        {links.map((link) => (
          <li key={link.href}>
            <Link href={link.href} className="text-sm text-brand-muted hover:text-brand-purple">
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
