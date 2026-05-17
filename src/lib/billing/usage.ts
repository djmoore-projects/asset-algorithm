import { createClient } from "@/lib/supabase/server";
import { PLAN_LIMITS, type PlanId } from "./plans";

export type UsageType = "ai_credits" | "scans" | "outreach_messages";

export async function checkUsage(userId: string, type: UsageType): Promise<{ allowed: boolean; used: number; limit: number; plan: PlanId }> {
  const supabase = await createClient();

  // Get user's plan
  const { data: sub } = await (supabase as any)
    .from("subscriptions")
    .select("plan")
    .eq("user_id", userId)
    .single();

  const plan = ((sub as any)?.plan || "free") as PlanId;
  const limit = PLAN_LIMITS[plan][type === "ai_credits" ? "ai_credits" : type === "scans" ? "scans" : "outreach_messages"];

  // Unlimited
  if (limit === -1) return { allowed: true, used: 0, limit: -1, plan };

  // Get current period usage
  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const { data: usage } = await (supabase as any)
    .from("usage")
    .select(type === "ai_credits" ? "ai_credits_used" : type === "scans" ? "scans_used" : "outreach_messages_used")
    .eq("user_id", userId)
    .gte("period_start", periodStart)
    .single();

  const used = usage ? (usage as any)[`${type}_used`] || 0 : 0;

  return { allowed: used < limit, used, limit, plan };
}

export async function incrementUsage(userId: string, type: UsageType, amount: number = 1): Promise<void> {
  const supabase = await createClient();
  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  const column = type === "ai_credits" ? "ai_credits_used" : type === "scans" ? "scans_used" : "outreach_messages_used";

  // Upsert usage record for current period
  const { data: existing } = await (supabase as any)
    .from("usage")
    .select("id, " + column)
    .eq("user_id", userId)
    .gte("period_start", periodStart.toISOString())
    .single();

  if (existing) {
    await (supabase as any)
      .from("usage")
      .update({ [column]: ((existing as any)[column] || 0) + amount })
      .eq("id", (existing as any).id);
  } else {
    await (supabase as any)
      .from("usage")
      .insert({
        user_id: userId,
        period_start: periodStart.toISOString(),
        period_end: periodEnd.toISOString(),
        [column]: amount,
      });
  }
}
