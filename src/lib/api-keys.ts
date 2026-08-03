import "server-only";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

const SALT_ROUNDS = 10;
const PREFIX_LENGTH = 14; // "sk_live_" + 6 chars, enough to narrow a lookup without leaking the key

export function generateApiKeyPlaintext() {
  return `sk_live_${crypto.randomBytes(24).toString("base64url")}`;
}

export function apiKeyPrefix(plaintext: string) {
  return plaintext.slice(0, PREFIX_LENGTH);
}

export function hashApiKey(plaintext: string) {
  return bcrypt.hash(plaintext, SALT_ROUNDS);
}

/**
 * Verifies a presented API key and returns the owning business, or null.
 * Uses the stored (non-secret) prefix to narrow candidates before running
 * the bcrypt comparison, so this stays O(keys sharing a prefix), not O(all keys).
 */
export async function verifyApiKey(plaintext: string) {
  const prefix = apiKeyPrefix(plaintext);
  const candidates = await prisma.apiKey.findMany({
    where: { keyPrefix: prefix, revokedAt: null },
  });

  for (const candidate of candidates) {
    if (await bcrypt.compare(plaintext, candidate.hashedKey)) {
      await prisma.apiKey.update({ where: { id: candidate.id }, data: { lastUsedAt: new Date() } });
      return candidate;
    }
  }
  return null;
}
