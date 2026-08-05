import { MarketingHeader } from "@/components/marketing/header";
import { Hero } from "@/components/marketing/hero";
import { About } from "@/components/marketing/about";
import { CoreFeatures } from "@/components/marketing/core-features";
import { Industries } from "@/components/marketing/industries";
import { RetailerBenefits } from "@/components/marketing/retailer-benefits";
import { Pricing } from "@/components/marketing/pricing";
import { AIAssistantPreview } from "@/components/marketing/ai-assistant-preview";
import { QRSpec } from "@/components/marketing/qr-spec";
import { Devices } from "@/components/marketing/devices";
import { ComingNext } from "@/components/marketing/coming-next";
import { FinalCTA } from "@/components/marketing/final-cta";
import { MarketingFooter } from "@/components/marketing/footer";

export default function Home() {
  return (
    <div className="theme-light flex min-h-screen flex-1 flex-col bg-brand-bg text-brand-black">
      <MarketingHeader />
      <main className="flex-1">
        <Hero />
        <About />
        <CoreFeatures />
        <Industries />
        <RetailerBenefits />
        <Pricing />
        <AIAssistantPreview />
        <QRSpec />
        <Devices />
        <ComingNext />
        <FinalCTA />
      </main>
      <MarketingFooter />
    </div>
  );
}
