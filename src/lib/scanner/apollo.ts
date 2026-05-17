/**
 * Apollo.io integration for finding business owner contacts.
 *
 * Two-step flow:
 * 1. Search (free, no credits) → find people at the company
 * 2. Enrich (costs credits) → get full name, email, phone
 *
 * API: https://docs.apollo.io/reference/people-api-search
 * Free tier: ~100-10,000 email credits/month
 * Env var: APOLLO_API_KEY
 */

export interface ApolloContact {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  title: string | null;
  linkedin_url: string | null;
  confidence: "high" | "medium" | "low";
}

export interface ApolloResult {
  contacts: ApolloContact[];
  organization_name: string | null;
  source: "apollo";
}

/**
 * Search Apollo.io for business owner/decision-maker contacts.
 * Searches by company name, targeting owner/executive titles.
 * Returns null if no API key or on failure.
 */
export async function apolloSearchContacts(
  businessName: string,
  location: string | null
): Promise<ApolloResult | null> {
  const apiKey = process.env.APOLLO_API_KEY;
  if (!apiKey) return null;

  try {
    // Step 1: Search for people at this company (free, no credits)
    const searchBody: any = {
      q_organization_name: businessName,
      person_titles: ["owner", "founder", "ceo", "president", "principal", "managing partner", "general manager"],
      per_page: 3,
    };

    if (location) {
      searchBody.person_locations = [location];
    }

    const searchRes = await fetch(
      "https://api.apollo.io/api/v1/mixed_people/api_search",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-cache",
          "x-api-key": apiKey,
        },
        body: JSON.stringify(searchBody),
        signal: AbortSignal.timeout(10000),
      }
    );

    if (!searchRes.ok) {
      console.log(`[Apollo] Search error ${searchRes.status} for ${businessName}`);
      return null;
    }

    const searchData = await searchRes.json();
    const people = searchData?.people || [];

    if (people.length === 0) {
      // Try broader search without title filter
      const broadSearch: any = {
        q_organization_name: businessName,
        per_page: 3,
      };
      if (location) {
        broadSearch.person_locations = [location];
      }

      const broadRes = await fetch(
        "https://api.apollo.io/api/v1/mixed_people/api_search",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "no-cache",
            "x-api-key": apiKey,
          },
          body: JSON.stringify(broadSearch),
          signal: AbortSignal.timeout(10000),
        }
      );

      if (!broadRes.ok) return null;
      const broadData = await broadRes.json();
      const broadPeople = broadData?.people || [];

      if (broadPeople.length === 0) return null;

      // Enrich the first person found
      return await enrichPeople(broadPeople.slice(0, 2), apiKey, broadData?.people?.[0]?.organization?.name);
    }

    // Step 2: Enrich top results to get full contact details (costs credits)
    return await enrichPeople(people.slice(0, 2), apiKey, people[0]?.organization?.name);
  } catch (err: any) {
    console.log(`[Apollo] Error for ${businessName}: ${err.message}`);
    return null;
  }
}

/**
 * Enrich people from search results to get full contact info.
 * Each enrichment costs 1 credit.
 */
async function enrichPeople(
  people: any[],
  apiKey: string,
  orgName: string | null
): Promise<ApolloResult> {
  const contacts: ApolloContact[] = [];

  for (const person of people) {
    const personId = person.id;
    if (!personId) continue;

    try {
      const enrichRes = await fetch(
        "https://api.apollo.io/api/v1/people/match",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "no-cache",
            "x-api-key": apiKey,
          },
          body: JSON.stringify({
            id: personId,
            reveal_personal_emails: true,
            reveal_phone_number: true,
          }),
          signal: AbortSignal.timeout(8000),
        }
      );

      if (!enrichRes.ok) {
        console.log(`[Apollo] Enrich error ${enrichRes.status} for person ${personId}`);
        // Still capture what we have from search
        contacts.push({
          id: personId,
          first_name: person.first_name || null,
          last_name: null, // obfuscated in search results
          email: null,
          phone: null,
          title: person.title || null,
          linkedin_url: person.linkedin_url || null,
          confidence: "low",
        });
        continue;
      }

      const enrichData = await enrichRes.json();
      const p = enrichData?.person || {};

      // Extract phone number from phone_numbers array
      let phone: string | null = null;
      if (p.phone_numbers?.length > 0) {
        const directPhone = p.phone_numbers.find((ph: any) => ph.type === "mobile" || ph.type === "direct");
        phone = directPhone?.sanitized_number || p.phone_numbers[0]?.sanitized_number || null;
      }

      contacts.push({
        id: personId,
        first_name: p.first_name || person.first_name || null,
        last_name: p.last_name || null,
        email: p.email || null,
        phone,
        title: p.title || person.title || null,
        linkedin_url: p.linkedin_url || person.linkedin_url || null,
        confidence: p.email ? "high" : "medium",
      });

      console.log(
        `[Apollo] Enriched: ${p.first_name} ${p.last_name} | ${p.email || "no email"} | ${p.title || "no title"}`
      );
    } catch (err: any) {
      console.log(`[Apollo] Enrich failed for person ${personId}: ${err.message}`);
      // Capture partial data from search
      contacts.push({
        id: personId,
        first_name: person.first_name || null,
        last_name: null,
        email: null,
        phone: null,
        title: person.title || null,
        linkedin_url: person.linkedin_url || null,
        confidence: "low",
      });
    }
  }

  return {
    contacts,
    organization_name: orgName || null,
    source: "apollo",
  };
}
