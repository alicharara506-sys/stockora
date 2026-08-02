import type { Metadata } from "next";
import { LegalPage } from "@/components/marketing/legal-page";

export const metadata: Metadata = { title: "Privacy Policy — Stockora" };

export default function PrivacyPolicyPage() {
  return (
    <LegalPage title="Privacy Policy" updatedAt="August 2026">
      <p>
        This Privacy Policy explains how Stockora (&quot;we&quot;, &quot;us&quot;) collects, uses,
        and protects information when you use our POS and inventory management platform.
      </p>
      <h2>Information we collect</h2>
      <p>
        Account details you provide at signup, business and transaction data you enter while
        using Stockora, and technical data such as device and log information needed to operate
        the service securely.
      </p>
      <h2>How we use it</h2>
      <p>
        To operate your account, provide support, improve the product, and meet legal and
        security obligations. We never sell customer data, and AI features only access data
        belonging to your business.
      </p>
      <h2>Data retention & security</h2>
      <p>
        Financial and transaction records are retained and never permanently deleted, in line
        with standard accounting and audit requirements. Data is encrypted in transit and at
        rest, and access is scoped per business and per role.
      </p>
      <h2>Contact</h2>
      <p>Questions about this policy can be sent to hello@stockora.com.</p>
    </LegalPage>
  );
}
