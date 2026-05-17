/**
 * Simple in-memory rate limiter using token bucket algorithm.
 * Provides per-user throttling within a single serverless instance lifetime.
 * For production at scale, replace with Upstash Redis-based rate limiting.
 */

interface RateLimitConfig {
  maxRequests: number;  // max requests per window
  windowMs: number;     // time window in milliseconds
}

interface RateLimitEntry {
  tokens: number;
  lastRefill: number;
}

const buckets = new Map<string, RateLimitEntry>();

// Clean up stale entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of buckets) {
    if (now - entry.lastRefill > 600_000) buckets.delete(key);
  }
}, 300_000);

export function rateLimit(key: string, config: RateLimitConfig): { success: boolean; remaining: number } {
  const now = Date.now();
  const entry = buckets.get(key);

  if (!entry) {
    buckets.set(key, { tokens: config.maxRequests - 1, lastRefill: now });
    return { success: true, remaining: config.maxRequests - 1 };
  }

  // Refill tokens based on elapsed time
  const elapsed = now - entry.lastRefill;
  const refillRate = config.maxRequests / config.windowMs;
  const refill = Math.floor(elapsed * refillRate);

  if (refill > 0) {
    entry.tokens = Math.min(config.maxRequests, entry.tokens + refill);
    entry.lastRefill = now;
  }

  if (entry.tokens > 0) {
    entry.tokens--;
    return { success: true, remaining: entry.tokens };
  }

  return { success: false, remaining: 0 };
}

// Preset configurations for different route types
export const RATE_LIMITS = {
  ai: { maxRequests: 20, windowMs: 60_000 },        // 20 AI calls/min
  outreach: { maxRequests: 30, windowMs: 60_000 },   // 30 outreach actions/min
  scanner: { maxRequests: 5, windowMs: 60_000 },     // 5 scans/min
  general: { maxRequests: 60, windowMs: 60_000 },    // 60 general API calls/min
} as const;
