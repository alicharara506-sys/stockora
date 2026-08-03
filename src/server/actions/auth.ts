"use server";

import crypto from "node:crypto";
import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { signIn } from "@/auth";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth/password";
import { sendEmail } from "@/lib/email";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  forgotPasswordSchema,
  resetPasswordSchema,
  signUpSchema,
} from "@/lib/validation/auth";

const VERIFICATION_TTL_MS = 1000 * 60 * 60 * 24; // 24h
const RESET_TTL_MS = 1000 * 60 * 30; // 30m

export type ActionResult = { success: true; message?: string } | { success: false; error: string };

export async function signUpAction(input: unknown): Promise<ActionResult> {
  const parsed = signUpSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const email = parsed.data.email.toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { success: false, error: "An account with this email already exists." };
  }

  const passwordHash = await hashPassword(parsed.data.password);
  await prisma.user.create({
    data: { name: parsed.data.name, email, passwordHash },
  });

  const token = crypto.randomBytes(32).toString("hex");
  await prisma.verificationToken.create({
    data: { identifier: email, token, expires: new Date(Date.now() + VERIFICATION_TTL_MS) },
  });

  await sendEmail({
    to: email,
    subject: "Verify your Stockora account",
    html: `<p>Welcome to Stockora. Verify your email by visiting:</p>
      <p><a href="${appUrl()}/verify-email?token=${token}&email=${encodeURIComponent(email)}">Verify email</a></p>`,
  });

  return { success: true };
}

export async function requestPasswordResetAction(input: unknown): Promise<ActionResult> {
  const parsed = forgotPasswordSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const email = parsed.data.email.toLowerCase();
  const user = await prisma.user.findUnique({ where: { email } });

  // Always respond with the same message so the flow can't be used to
  // enumerate which emails have an account.
  if (user) {
    const token = crypto.randomBytes(32).toString("hex");
    await prisma.passwordResetToken.create({
      data: { userId: user.id, token, expiresAt: new Date(Date.now() + RESET_TTL_MS) },
    });
    await sendEmail({
      to: email,
      subject: "Reset your Stockora password",
      html: `<p>Reset your password by visiting:</p>
        <p><a href="${appUrl()}/reset-password?token=${token}">Reset password</a></p>
        <p>This link expires in 30 minutes.</p>`,
    });
  }

  return { success: true, message: "If that email has an account, a reset link is on its way." };
}

export async function resetPasswordAction(input: unknown): Promise<ActionResult> {
  const parsed = resetPasswordSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const resetToken = await prisma.passwordResetToken.findUnique({
    where: { token: parsed.data.token },
  });

  if (!resetToken || resetToken.usedAt || resetToken.expiresAt < new Date()) {
    return { success: false, error: "This reset link is invalid or has expired." };
  }

  const passwordHash = await hashPassword(parsed.data.password);
  await prisma.$transaction([
    prisma.user.update({ where: { id: resetToken.userId }, data: { passwordHash } }),
    prisma.passwordResetToken.update({
      where: { id: resetToken.id },
      data: { usedAt: new Date() },
    }),
  ]);

  return { success: true };
}

export async function verifyEmailAction(email: string, token: string): Promise<ActionResult> {
  const verification = await prisma.verificationToken.findUnique({
    where: { identifier_token: { identifier: email.toLowerCase(), token } },
  });

  if (!verification || verification.expires < new Date()) {
    return { success: false, error: "This verification link is invalid or has expired." };
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { email: email.toLowerCase() },
      data: { emailVerified: new Date() },
    }),
    prisma.verificationToken.delete({
      where: { identifier_token: { identifier: email.toLowerCase(), token } },
    }),
  ]);

  return { success: true };
}

function appUrl() {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

export async function authenticateAction(formData: FormData) {
  const callbackUrl = (formData.get("callbackUrl") as string) || "/dashboard";
  const email = String(formData.get("email") ?? "").toLowerCase();

  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const { allowed } = checkRateLimit(`login:${ip}:${email}`, 8, 15 * 60 * 1000);
  if (!allowed) {
    redirect(`/login?error=RateLimited&callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }

  try {
    await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirectTo: callbackUrl,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      redirect(`/login?error=CredentialsSignin&callbackUrl=${encodeURIComponent(callbackUrl)}`);
    }
    throw error;
  }
}
