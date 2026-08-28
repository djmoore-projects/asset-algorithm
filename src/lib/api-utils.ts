import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { z } from "zod";

/**
 * Standard API error response — never leaks internal details.
 */
export function apiError(message: string, status: number = 500) {
  return NextResponse.json({ error: message }, { status });
}

/**
 * Log the real error server-side and return a generic message to the client.
 */
export function handleApiError(error: unknown, context: string) {
  const msg = error instanceof Error ? error.message : String(error);
  console.error(`[${context}]`, msg);
  return apiError("An unexpected error occurred. Please try again.", 500);
}

/**
 * Authenticate + rate limit a request. Returns user or error response.
 */
export async function authenticateAndLimit(
  req: NextRequest,
  limitKey: string,
  limitConfig: typeof RATE_LIMITS[keyof typeof RATE_LIMITS] = RATE_LIMITS.general
): Promise<{ user: { id: string; email?: string }; error?: never } | { user?: never; error: NextResponse }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: apiError("Unauthorized", 401) };
  }

  const { success } = rateLimit(`${limitKey}:${user.id}`, limitConfig);
  if (!success) {
    return { error: NextResponse.json(
      { error: "Rate limit exceeded. Please try again shortly." },
      { status: 429, headers: { "Retry-After": "60" } }
    )};
  }

  return { user: { id: user.id, email: user.email } };
}

/**
 * Validate request body against a Zod schema.
 * Returns parsed data or an error response.
 */
export function validateBody<T extends z.ZodType>(
  data: unknown,
  schema: T
): { data: z.infer<T>; error?: never } | { data?: never; error: NextResponse } {
  const result = schema.safeParse(data);
  if (!result.success) {
    const issues = result.error.issues.map(i => `${i.path.join(".")}: ${i.message}`).join(", ");
    return { error: apiError(`Validation error: ${issues}`, 400) };
  }
  return { data: result.data };
}

/**
 * Validate that a URL is safe to fetch (no SSRF to internal networks).
 */
export function isSafeUrl(url: string): boolean {
  try {
    const parsed = new URL(url.startsWith("http") ? url : `https://${url}`);

    // Must be http or https
    if (!["http:", "https:"].includes(parsed.protocol)) return false;

    const hostname = parsed.hostname.toLowerCase();

    // Block localhost and loopback
    if (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1") return false;

    // Block private IP ranges
    if (hostname.startsWith("10.") || hostname.startsWith("192.168.")) return false;
    if (/^172\.(1[6-9]|2\d|3[01])\./.test(hostname)) return false;

    // Block link-local
    if (hostname.startsWith("169.254.")) return false;

    // Block cloud metadata endpoints
    if (hostname === "metadata.google.internal") return false;
    if (hostname === "169.254.169.254") return false;

    // Block internal TLDs
    if (hostname.endsWith(".internal") || hostname.endsWith(".local")) return false;

    return true;
  } catch {
    return false;
  }
}
