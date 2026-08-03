import { QrCode as QrCodeIcon, ScanLine } from "lucide-react";
import { requireBusinessContext } from "@/lib/tenancy";
import { prisma } from "@/lib/prisma";
import { renderQrSvg, qrTargetUrl } from "@/lib/qr";
import { PERMISSIONS } from "@/lib/permissions/constants";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GenerateQrDialog } from "@/components/qr/generate-qr-dialog";
import { RevokeQrButton } from "@/components/qr/revoke-qr-button";

const TYPE_LABELS: Record<string, string> = {
  PAYMENT: "Payment",
  PRODUCT: "Product",
  RECEIPT: "Receipt",
  LOYALTY: "Loyalty",
  STORE: "Store",
  INVENTORY: "Inventory",
};

export default async function QrCodesPage() {
  const context = await requireBusinessContext();
  const canManage = context.permissions.has(PERMISSIONS.CHANGE_SETTINGS);

  const [qrCodes, variants] = await Promise.all([
    prisma.qRCode.findMany({
      where: { businessId: context.business.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.productVariant.findMany({
      where: { businessId: context.business.id, isActive: true },
      include: { product: true },
      take: 200,
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const hasStoreQr = qrCodes.some((qr) => qr.type === "STORE" && qr.status === "ACTIVE");
  const cards = await Promise.all(
    qrCodes.map(async (qr) => ({
      qr,
      svg: await renderQrSvg(qrTargetUrl(qr.token)),
    })),
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-brand-black">QR codes</h1>
          <p className="mt-1 text-sm text-brand-muted">
            {qrCodes.length} codes generated. Every code is a signed, non-sequential token — never
            a raw internal ID.
          </p>
        </div>
        {canManage && (
          <GenerateQrDialog
            hasStoreQr={hasStoreQr}
            variants={variants.map((v) => ({ id: v.id, label: `${v.product.name} (${v.sku})` }))}
          />
        )}
      </div>

      {cards.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-12 text-center">
            <QrCodeIcon className="size-8 text-brand-muted" />
            <p className="text-sm text-brand-muted">No QR codes generated yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {cards.map(({ qr, svg }) => (
            <Card key={qr.id}>
              <CardContent className="flex flex-col items-center gap-3 p-5 text-center">
                <div className="size-32 [&_svg]:size-full" dangerouslySetInnerHTML={{ __html: svg }} />
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{TYPE_LABELS[qr.type] ?? qr.type}</Badge>
                  <Badge variant={qr.status === "ACTIVE" ? "success" : qr.status === "EXPIRED" ? "warning" : "danger"}>
                    {qr.status}
                  </Badge>
                </div>
                <p className="flex items-center gap-1 text-xs text-brand-muted">
                  <ScanLine className="size-3" />
                  {qr.scanCount} scan{qr.scanCount === 1 ? "" : "s"}
                </p>
                <p className="text-[11px] text-brand-muted">{qr.createdAt.toLocaleDateString()}</p>
                {canManage && qr.status === "ACTIVE" && <RevokeQrButton id={qr.id} />}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
