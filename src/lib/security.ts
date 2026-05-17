import { timingSafeEqual } from "crypto";

/**
 * Timing-safe string comparison to prevent timing attacks on secrets.
 */
export function safeCompare(a: string, b: string): boolean {
  if (!a || !b) return false;
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

/**
 * Escape HTML special characters to prevent XSS in email templates.
 */
export function escapeHtml(str: string): string {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Verify Twilio webhook signature.
 * Uses the X-Twilio-Signature header + auth token to validate requests.
 */
export async function verifyTwilioSignature(
  req: Request,
  body: Record<string, string>
): Promise<boolean> {
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!authToken) return false;

  const signature = req.headers.get("x-twilio-signature");
  if (!signature) return false;

  try {
    const twilio = await import("twilio");
    const url = new URL(req.url);
    // Twilio validates against the full URL
    const fullUrl = url.toString();
    return twilio.default.validateRequest(authToken, signature, fullUrl, body);
  } catch {
    return false;
  }
}

/**
 * Verify Resend webhook signature using svix.
 * Resend uses Svix for webhook signing.
 */
export async function verifyResendSignature(req: Request, rawBody: string): Promise<boolean> {
  const signingSecret = process.env.RESEND_WEBHOOK_SECRET;
  // Only skip verification in development; in production, reject if secret is missing
  if (!signingSecret) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[Webhook] RESEND_WEBHOOK_SECRET not configured — skipping signature verification (dev only)");
      return true;
    }
    console.error("[Webhook] RESEND_WEBHOOK_SECRET not configured — rejecting webhook in production");
    return false;
  }

  const svixId = req.headers.get("svix-id");
  const svixTimestamp = req.headers.get("svix-timestamp");
  const svixSignature = req.headers.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) return false;

  try {
    const { Webhook } = await import("svix");
    const wh = new Webhook(signingSecret);
    wh.verify(rawBody, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    });
    return true;
  } catch {
    return false;
  }
}
