import "server-only";
import crypto from "crypto";
import QRCodeLib from "qrcode";
import { prisma } from "@/lib/prisma";
import type { QRCodeType } from "@/generated/prisma/enums";

function generateToken() {
  return crypto.randomBytes(24).toString("base64url");
}

function hashIp(ip: string | null) {
  if (!ip) return null;
  return crypto.createHash("sha256").update(ip).digest("hex");
}

export function getAppUrl() {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

export function qrTargetUrl(token: string) {
  return `${getAppUrl()}/qr/${token}`;
}

export async function renderQrSvg(url: string) {
  return QRCodeLib.toString(url, {
    type: "svg",
    errorCorrectionLevel: "H",
    margin: 4,
    color: { dark: "#0A0A0A", light: "#FFFFFF" },
  });
}

export async function createQrCode(params: {
  businessId: string;
  type: QRCodeType;
  saleId?: string;
  payload?: Record<string, unknown>;
  expiresAt?: Date | null;
}) {
  const token = generateToken();
  return prisma.qRCode.create({
    data: {
      businessId: params.businessId,
      type: params.type,
      token,
      saleId: params.saleId,
      payload: params.payload as never,
      expiresAt: params.expiresAt ?? null,
    },
  });
}

export type QrResolution =
  | { ok: true; qrCode: Awaited<ReturnType<typeof prisma.qRCode.findUnique>> & object }
  | { ok: false; reason: "not_found" | "expired" | "revoked" };

/**
 * Looks up a QR by its public token, validates it, and logs the scan
 * (success or failure) in the same pass — a QRScan row is written for every
 * attempt, including invalid/expired/revoked ones, for scan auditability.
 */
export async function resolveAndLogScan(
  token: string,
  meta: { ip: string | null; userAgent: string | null },
): Promise<QrResolution> {
  const qrCode = await prisma.qRCode.findUnique({ where: { token } });

  if (!qrCode) {
    return { ok: false, reason: "not_found" };
  }

  const isExpired = qrCode.expiresAt !== null && qrCode.expiresAt.getTime() < Date.now();
  const isRevoked = qrCode.status === "REVOKED";
  const result = isRevoked ? "REVOKED" : isExpired ? "EXPIRED" : "SUCCESS";

  await prisma.$transaction([
    prisma.qRScan.create({
      data: {
        qrCodeId: qrCode.id,
        result,
        ipHash: hashIp(meta.ip),
        userAgent: meta.userAgent,
      },
    }),
    ...(result === "SUCCESS" ? [prisma.qRCode.update({ where: { id: qrCode.id }, data: { scanCount: { increment: 1 } } })] : []),
    ...(isExpired && qrCode.status === "ACTIVE"
      ? [prisma.qRCode.update({ where: { id: qrCode.id }, data: { status: "EXPIRED" as const } })]
      : []),
  ]);

  if (isRevoked) return { ok: false, reason: "revoked" };
  if (isExpired) return { ok: false, reason: "expired" };
  return { ok: true, qrCode };
}
