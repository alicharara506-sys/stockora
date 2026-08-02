import QRCode from "qrcode";
import { Container } from "@/components/ui/container";

const QR_TYPES = [
  { label: "Payment QR", body: "Receive payments instantly" },
  { label: "Product QR", body: "Link to product details" },
  { label: "Invoice QR", body: "Share invoices digitally" },
  { label: "Loyalty QR", body: "Earn & redeem points" },
  { label: "Store QR", body: "Share store info & location" },
];

const SPECIFICATION = [
  "Format: PNG / SVG",
  "Error correction: High (Level H)",
  "Size: Min. 300×300 px (print), 180×180 px (digital)",
  "Quiet zone: minimum 4 modules",
  "Colors: Black / Purple / White",
  "Logo: optional, protected clear area",
];

export async function QRSpec() {
  const qrSvg = await QRCode.toString("https://stockora.com/pay/demo", {
    type: "svg",
    errorCorrectionLevel: "H",
    margin: 4,
    color: { dark: "#0A0A0A", light: "#FFFFFF" },
  });

  return (
    <section id="qr-solutions" className="bg-brand-purple-lightest/40 py-20">
      <Container className="grid gap-12 lg:grid-cols-[1fr_1.3fr] lg:items-center">
        <div className="mx-auto flex flex-col items-center rounded-2xl border border-brand-border bg-white p-6 shadow-card-lg">
          <div
            className="size-40 [&_svg]:size-full"
            dangerouslySetInnerHTML={{ __html: qrSvg }}
          />
          <p className="mt-3 text-sm font-semibold text-brand-black">Scan to Pay</p>
        </div>

        <div>
          <h2 className="font-display text-3xl font-bold text-brand-black">
            QR code specification
          </h2>
          <p className="mt-3 max-w-lg text-brand-muted">
            Every Stockora QR code is generated server-side with signed, non-sequential tokens —
            never raw internal IDs — and scoped to what it&apos;s meant to unlock.
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {QR_TYPES.map((type) => (
              <div key={type.label} className="rounded-xl border border-brand-border bg-white p-3.5">
                <p className="text-sm font-semibold text-brand-black">{type.label}</p>
                <p className="mt-0.5 text-xs text-brand-muted">{type.body}</p>
              </div>
            ))}
          </div>

          <ul className="mt-6 grid gap-2 sm:grid-cols-2">
            {SPECIFICATION.map((spec) => (
              <li key={spec} className="text-xs text-brand-muted">
                <span className="font-medium text-brand-black">{spec.split(":")[0]}:</span>
                {spec.split(":").slice(1).join(":")}
              </li>
            ))}
          </ul>
        </div>
      </Container>
    </section>
  );
}
