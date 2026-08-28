/**
 * Suppression — the gate every outbound message passes through.
 *
 * A contact is suppressed when unsubscribed_at is set. Suppression is global:
 * it spans every campaign and every channel, because a person who asked to
 * stop hearing from you did not mean "stop, except by SMS."
 */

import type { SupabaseClient } from "@supabase/supabase-js";

export type SuppressionReason =
  | "unsubscribed"
  | "bounced"
  | "complained"
  | "manual";

export interface SuppressibleContact {
  unsubscribed_at?: string | null;
}

/** True when this contact must not be contacted on any channel. */
export function isSuppressed(contact: SuppressibleContact | null | undefined): boolean {
  return !!contact?.unsubscribed_at;
}

/**
 * Suppress a contact. Idempotent — re-suppressing preserves the original
 * timestamp and reason so the first opt-out stays the record of truth.
 */
export async function suppressContact(
  supabase: SupabaseClient<any, any, any>,
  contactId: string,
  reason: SuppressionReason
): Promise<void> {
  await supabase
    .from("contacts")
    .update({
      unsubscribed_at: new Date().toISOString(),
      suppression_reason: reason,
    })
    .eq("id", contactId)
    .is("unsubscribed_at", null);
}

/** Suppress by email address — the only handle a bounce webhook gives us. */
export async function suppressByEmail(
  supabase: SupabaseClient<any, any, any>,
  email: string,
  reason: SuppressionReason
): Promise<void> {
  if (!email) return;
  await supabase
    .from("contacts")
    .update({
      unsubscribed_at: new Date().toISOString(),
      suppression_reason: reason,
    })
    .ilike("email", email)
    .is("unsubscribed_at", null);
}

function appBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");
}

export function unsubscribeUrl(token: string): string {
  return `${appBaseUrl()}/unsubscribe?token=${encodeURIComponent(token)}`;
}

/**
 * Append the unsubscribe footer required by CAN-SPAM.
 *
 * Every automated email gets this. If the body already carries the token —
 * because a template author placed it deliberately — it is left alone rather
 * than duplicated.
 */
export function withUnsubscribeFooter(html: string, token: string): string {
  const url = unsubscribeUrl(token);
  if (html.includes(url)) return html;

  const footer =
    `<div style="margin-top:32px;padding-top:16px;border-top:1px solid #e5e5e5;` +
    `font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#8a8a8a;line-height:1.5">` +
    `Don't want to hear from us? <a href="${url}" style="color:#8a8a8a">Unsubscribe</a>.` +
    `</div>`;

  return `${html}${footer}`;
}

/** Plain-text variant for the text/plain part. */
export function withUnsubscribeFooterText(text: string, token: string): string {
  const url = unsubscribeUrl(token);
  if (text.includes(url)) return text;
  return `${text}\n\n---\nTo stop receiving these emails: ${url}`;
}
