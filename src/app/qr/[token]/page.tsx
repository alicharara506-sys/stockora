import Link from "next/link";
import { headers } from "next/headers";
import { AlertTriangle, Building2, Package, Receipt, Wallet } from "lucide-react";
import { resolveAndLogScan } from "@/lib/qr";
import { Card, CardContent } from "@/components/ui/card";
import { Logo } from "@/components/ui/logo";

const ERROR_COPY: Record<"not_found" | "expired" | "revoked", { title: string; body: string }> = {
  not_found: { title: "QR code not recognized", body: "This code doesn't match any Stockora QR on record." },
  expired: { title: "This QR code has expired", body: "Ask the store for a fresh code." },
  revoked: { title: "This QR code was revoked", body: "It's no longer valid. Ask the store for a new one." },
};

export default async function QrScanPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const headerList = await headers();
  const forwardedFor = headerList.get("x-forwarded-for");
  const ip = forwardedFor?.split(",")[0]?.trim() ?? null;
  const userAgent = headerList.get("user-agent");

  const resolution = await resolveAndLogScan(token, { ip, userAgent });

  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-bg px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex justify-center">
          <Logo />
        </div>
        <Card>
          <CardContent className="p-6">
            {!resolution.ok ? (
              <div className="flex flex-col items-center gap-3 text-center">
                <div className="flex size-12 items-center justify-center rounded-full bg-red-50 text-brand-danger">
                  <AlertTriangle className="size-5" />
                </div>
                <p className="font-display text-lg font-semibold text-brand-black">
                  {ERROR_COPY[resolution.reason].title}
                </p>
                <p className="text-sm text-brand-muted">{ERROR_COPY[resolution.reason].body}</p>
              </div>
            ) : (
              <QrContent qrCode={resolution.qrCode} />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function QrContent({
  qrCode,
}: {
  qrCode: { type: string; payload: unknown; scanCount: number };
}) {
  const payload = (qrCode.payload ?? {}) as Record<string, unknown>;

  if (qrCode.type === "STORE") {
    return (
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-brand-purple-lightest text-brand-purple">
          <Building2 className="size-5" />
        </div>
        <p className="font-display text-lg font-semibold text-brand-black">
          {String(payload.businessName ?? "Our store")}
        </p>
        <p className="text-sm text-brand-muted">Thanks for visiting — powered by Stockora.</p>
      </div>
    );
  }

  if (qrCode.type === "PRODUCT") {
    return (
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-brand-purple-lightest text-brand-purple">
          <Package className="size-5" />
        </div>
        <p className="font-display text-lg font-semibold text-brand-black">
          {String(payload.productName ?? "Product")}
        </p>
        <p className="text-sm text-brand-muted">SKU {String(payload.sku ?? "—")}</p>
      </div>
    );
  }

  if (qrCode.type === "PAYMENT") {
    const amount = Number(payload.amount ?? 0);
    const currency = String(payload.currency ?? "USD");
    return (
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-brand-purple-lightest text-brand-purple">
          <Wallet className="size-5" />
        </div>
        <p className="text-sm text-brand-muted">Amount due</p>
        <p className="font-display text-2xl font-bold text-brand-black">
          {currency} {amount.toFixed(2)}
        </p>
        {payload.note ? <p className="text-sm text-brand-muted">{String(payload.note)}</p> : null}
        <button
          disabled
          className="mt-2 w-full cursor-not-allowed rounded-xl bg-brand-purple/50 px-4 py-2.5 text-sm font-semibold text-white"
        >
          Payment collection is demo-only
        </button>
      </div>
    );
  }

  if (qrCode.type === "RECEIPT") {
    return (
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-brand-purple-lightest text-brand-purple">
          <Receipt className="size-5" />
        </div>
        <p className="font-display text-lg font-semibold text-brand-black">
          Sale {String(payload.saleNumber ?? "")}
        </p>
        <p className="text-sm text-brand-muted">
          Total {String(payload.currency ?? "USD")} {Number(payload.total ?? 0).toFixed(2)}
        </p>
        <p className="text-xs text-brand-muted">{payload.date ? new Date(String(payload.date)).toLocaleString() : ""}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3 text-center">
      <p className="font-display text-lg font-semibold text-brand-black">Inventory tag</p>
      <p className="text-sm text-brand-muted">
        Scan this from inside Stockora while signed in to view stock details.
      </p>
      <Link href="/inventory" className="text-sm font-medium text-brand-purple hover:underline">
        Go to inventory
      </Link>
    </div>
  );
}
