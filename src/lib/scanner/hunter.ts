/**
 * Hunter.io integration for finding business emails by domain.
 *
 * API: https://api.hunter.io/v2/domain-search
 * Free tier: 25 searches/month
 * Env var: HUNTER_API_KEY
 */

export interface HunterContact {
  email: string;
  first_name: string | null;
  last_name: string | null;
  position: string | null;
  linkedin: string | null;
  phone_number: string | null;
  confidence: number;
  type: "personal" | "generic";
}

export interface HunterResult {
  domain: string;
  organization: string | null;
  pattern: string | null;
  contacts: HunterContact[];
  source: "hunter";
}

/**
 * Search Hunter.io for email addresses associated with a domain.
 * Prioritizes personal emails (owner/founder) over generic ones.
 * Returns null if no API key or on failure.
 */
export async function hunterDomainSearch(
  domain: string
): Promise<HunterResult | null> {
  const apiKey = process.env.HUNTER_API_KEY;
  if (!apiKey) return null;

  try {
    // Clean domain — strip protocol and path
    const cleanDomain = domain
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .replace(/\/.*$/, "")
      .trim();

    if (!cleanDomain) return null;

    const params = new URLSearchParams({
      domain: cleanDomain,
      api_key: apiKey,
      limit: "5",
      type: "personal", // prioritize personal emails (not info@, contact@)
    });

    const res = await fetch(
      `https://api.hunter.io/v2/domain-search?${params.toString()}`,
      {
        signal: AbortSignal.timeout(8000),
        headers: { Accept: "application/json" },
      }
    );

    if (!res.ok) {
      // If personal returns nothing, try without type filter
      if (res.status === 200) return null;
      console.log(`[Hunter] API error ${res.status} for ${cleanDomain}`);
      return null;
    }

    const data = await res.json();
    const emails = data?.data?.emails || [];

    if (emails.length === 0) {
      // Retry without the personal filter — get generic emails at least
      const retryParams = new URLSearchParams({
        domain: cleanDomain,
        api_key: apiKey,
        limit: "5",
      });

      const retryRes = await fetch(
        `https://api.hunter.io/v2/domain-search?${retryParams.toString()}`,
        {
          signal: AbortSignal.timeout(8000),
          headers: { Accept: "application/json" },
        }
      );

      if (retryRes.ok) {
        const retryData = await retryRes.json();
        const retryEmails = retryData?.data?.emails || [];

        return {
          domain: cleanDomain,
          organization: retryData?.data?.organization || null,
          pattern: retryData?.data?.pattern || null,
          contacts: retryEmails.map(mapHunterEmail),
          source: "hunter",
        };
      }

      return null;
    }

    return {
      domain: cleanDomain,
      organization: data?.data?.organization || null,
      pattern: data?.data?.pattern || null,
      contacts: emails.map(mapHunterEmail),
      source: "hunter",
    };
  } catch (err: any) {
    console.log(`[Hunter] Error for domain: ${err.message}`);
    return null;
  }
}

function mapHunterEmail(email: any): HunterContact {
  return {
    email: email.value || "",
    first_name: email.first_name || null,
    last_name: email.last_name || null,
    position: email.position || null,
    linkedin: email.linkedin || null,
    phone_number: email.phone_number || null,
    confidence: email.confidence || 0,
    type: email.type || "generic",
  };
}
