/**
 * Send governor — the daily ceiling on automated outbound.
 *
 * Sending reputation attaches to the domain, not to a campaign, so the budget
 * is per user and every campaign draws from the same pool. A new sender that
 * opens at full volume gets filtered, so the effective cap ramps from a small
 * floor up to the configured ceiling over the warmup window.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

/** Where a brand-new sender starts, in messages per day. */
export const WARMUP_FLOOR = 10;
/** Additional messages permitted per day of warmup. */
export const WARMUP_STEP = 5;
/** Ceiling on how much one cron run may send, regardless of remaining budget. */
export const MAX_PER_RUN = 40;

export interface SendBudget {
  /** Messages still permitted today. */
  remaining: number;
  /** Today's effective ceiling after the warmup ramp. */
  effectiveCap: number;
  /** The user's configured ceiling, before ramping. */
  configuredCap: number;
  /** Messages already sent today. */
  sentToday: number;
  /** True while the ramp is still below the configured cap. */
  warmingUp: boolean;
}

/**
 * Today's ceiling for a sender. Ramps linearly from WARMUP_FLOOR toward the
 * configured cap; a sender with no warmup anchor is treated as fully warmed,
 * so existing users are not throttled retroactively.
 */
export function effectiveDailyCap(
  configuredCap: number,
  warmupStartedAt: string | null | undefined,
  now: Date = new Date()
): number {
  if (!warmupStartedAt) return configuredCap;

  const started = new Date(warmupStartedAt).getTime();
  if (Number.isNaN(started)) return configuredCap;

  const daysElapsed = Math.max(0, Math.floor((now.getTime() - started) / 86_400_000));
  const ramped = WARMUP_FLOOR + daysElapsed * WARMUP_STEP;

  return Math.max(0, Math.min(configuredCap, ramped));
}

/**
 * How much of today's budget a sender has left.
 *
 * Counts messages actually dispatched today. Failed sends are excluded — a
 * message that never left should not consume budget — but every delivered,
 * opened, or replied message still counts, since it did leave.
 */
export async function getSendBudget(
  supabase: SupabaseClient<any, any, any>,
  userId: string,
  now: Date = new Date()
): Promise<SendBudget> {
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);

  const { data: profile } = await supabase
    .from("profiles")
    .select("daily_send_cap, warmup_started_at")
    .eq("id", userId)
    .single();

  const configuredCap = (profile as { daily_send_cap?: number } | null)?.daily_send_cap ?? 50;
  const warmupStartedAt = (profile as { warmup_started_at?: string | null } | null)?.warmup_started_at;

  const effectiveCap = effectiveDailyCap(configuredCap, warmupStartedAt, now);

  const { count } = await supabase
    .from("outreach_messages")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .neq("status", "failed")
    .gte("sent_at", startOfDay.toISOString());

  const sentToday = count ?? 0;

  return {
    remaining: Math.max(0, Math.min(effectiveCap - sentToday, MAX_PER_RUN)),
    effectiveCap,
    configuredCap,
    sentToday,
    warmingUp: effectiveCap < configuredCap,
  };
}

/**
 * Stamp the warmup anchor the first time a user sends anything automated.
 * No-ops once set, so the ramp measures from the true first send.
 */
export async function ensureWarmupStarted(
  supabase: SupabaseClient<any, any, any>,
  userId: string
): Promise<void> {
  await supabase
    .from("profiles")
    .update({ warmup_started_at: new Date().toISOString() })
    .eq("id", userId)
    .is("warmup_started_at", null);
}
