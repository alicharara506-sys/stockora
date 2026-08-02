import type { Metadata } from "next";
import { LegalPage } from "@/components/marketing/legal-page";

export const metadata: Metadata = { title: "Terms of Service — Stockora" };

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Service" updatedAt="August 2026">
      <p>
        These Terms govern your use of Stockora. By creating an account or using the service,
        you agree to them.
      </p>
      <h2>Subscriptions & billing</h2>
      <p>
        Paid plans renew automatically for the billing cycle you select (monthly or annual).
        Trials convert to a paid plan unless cancelled before the trial ends. You can upgrade,
        downgrade, or cancel from your billing settings at any time.
      </p>
      <h2>Acceptable use</h2>
      <p>
        You&apos;re responsible for the accuracy of the business data you enter and for keeping
        your account credentials secure. Access to another business&apos;s data on the platform is
        strictly prohibited.
      </p>
      <h2>Availability</h2>
      <p>
        We aim for high availability but do not guarantee uninterrupted service. Scheduled
        maintenance will be communicated in advance where possible.
      </p>
      <h2>Contact</h2>
      <p>Questions about these terms can be sent to hello@stockora.com.</p>
    </LegalPage>
  );
}
