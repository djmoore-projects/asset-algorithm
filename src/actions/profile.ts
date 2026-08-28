"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { getSendBudget } from "@/lib/outreach/governor";

export async function getICPConfig() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data, error } = await supabase
    .from("profiles")
    .select("icp_config")
    .eq("id", user.id)
    .single();

  if (error) throw error;
  return data?.icp_config || null;
}

export async function saveICPConfig(config: Record<string, any>) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { error } = await supabase
    .from("profiles")
    .update({ icp_config: config })
    .eq("id", user.id);

  if (error) throw error;
  revalidatePath("/settings/icp");
  revalidatePath("/scanner");
}

/** Today's sending budget, warmup state, and the current suppression list. */
export async function getOutreachSettings() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const budget = await getSendBudget(supabase, user.id);

  const { data: suppressed } = await supabase
    .from("contacts")
    .select("id, first_name, last_name, email, suppression_reason, unsubscribed_at")
    .eq("user_id", user.id)
    .not("unsubscribed_at", "is", null)
    .order("unsubscribed_at", { ascending: false })
    .limit(50);

  const { count: suppressedTotal } = await supabase
    .from("contacts")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .not("unsubscribed_at", "is", null);

  return {
    budget,
    suppressed: (suppressed || []) as unknown as {
      id: string;
      first_name: string | null;
      last_name: string | null;
      email: string | null;
      suppression_reason: string | null;
      unsubscribed_at: string;
    }[],
    suppressedTotal: suppressedTotal ?? 0,
  };
}

export async function saveDailySendCap(cap: number) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  // A cap of zero pauses automated sending outright, which is a legitimate
  // kill switch. The upper bound keeps a typo from torching the domain.
  const safeCap = Math.max(0, Math.min(500, Math.floor(cap)));

  const { error } = await supabase
    .from("profiles")
    .update({ daily_send_cap: safeCap })
    .eq("id", user.id);

  if (error) throw error;
  revalidatePath("/settings/outreach");
  return safeCap;
}

/** Manually suppress a contact — the operator-side equivalent of opting out. */
export async function suppressContactManually(contactId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { error } = await supabase
    .from("contacts")
    .update({
      unsubscribed_at: new Date().toISOString(),
      suppression_reason: "manual",
    })
    .eq("id", contactId)
    .eq("user_id", user.id);

  if (error) throw error;
  revalidatePath("/settings/outreach");
}

/**
 * Lift a suppression. Only ever appropriate when the contact asked to be
 * re-added or the address was suppressed by a bounce that has since been fixed.
 */
export async function unsuppressContact(contactId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { error } = await supabase
    .from("contacts")
    .update({ unsubscribed_at: null, suppression_reason: null })
    .eq("id", contactId)
    .eq("user_id", user.id);

  if (error) throw error;
  revalidatePath("/settings/outreach");
}
