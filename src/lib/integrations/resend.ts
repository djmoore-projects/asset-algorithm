import { Resend } from "resend";

let resendClient: Resend | null = null;

export function getResendClient(): Resend {
  if (!resendClient) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) throw new Error("RESEND_API_KEY is not configured");
    resendClient = new Resend(apiKey);
  }
  return resendClient;
}

export async function sendEmail({
  to, subject, html, text, from, replyTo,
}: {
  to: string | string[]; subject: string; html?: string; text?: string; from?: string; replyTo?: string;
}) {
  const client = getResendClient();
  const fromAddress = from || process.env.RESEND_FROM_EMAIL || "outreach@aismartr.com";
  const { data, error } = await client.emails.send({
    from: fromAddress, to: Array.isArray(to) ? to : [to], subject,
    html: html || undefined, text: text || undefined, replyTo: replyTo || undefined,
  } as any);
  if (error) throw new Error(`Resend error: ${error.message}`);
  return data;
}
