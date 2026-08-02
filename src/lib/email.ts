import "server-only";

interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
}

/**
 * Thin transport abstraction so the rest of the app never talks to a
 * specific email provider directly. Wire RESEND_API_KEY (or swap this
 * implementation for SES/Postmark/etc.) to send real mail in production —
 * until then, emails are logged so auth flows remain fully testable.
 */
export async function sendEmail({ to, subject, html }: SendEmailInput) {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    console.info(`[email:dev] to=${to} subject="${subject}"\n${html}`);
    return { delivered: false, reason: "no-provider-configured" as const };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM ?? "Stockora <no-reply@stockora.com>",
      to,
      subject,
      html,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Failed to send email: ${response.status} ${body}`);
  }

  return { delivered: true as const };
}
