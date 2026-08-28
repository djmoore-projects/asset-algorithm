/**
 * Apollo.io integration — the discovery engine plus owner-contact lookup.
 *
 * Company discovery (searchCompanies) finds acquisition targets.
 * Contact lookup (apolloSearchContacts) finds the owner at a known company:
 * 1. Search (free, no credits) → find people at the company
 * 2. Enrich (costs credits) → get full name, email, phone
 *
 * API: https://docs.apollo.io/reference/organization-search
 * Free tier: ~100-10,000 email credits/month
 * Env var: APOLLO_API_KEY
 */

const APOLLO_BASE = "https://api.apollo.io/api/v1";

function apolloHeaders(apiKey: string) {
  return {
    "Content-Type": "application/json",
    "Cache-Control": "no-cache",
    "x-api-key": apiKey,
  };
}

export interface ScanCriteria {
  /** Business type(s). Comma-separated values become separate keyword tags. */
  query: string;
  /** Apollo location string, e.g. "Austin, Texas, United States". */
  location: string;
  max_results?: number;
  /** Apollo employee buckets, e.g. ["11,20", "21,50"]. Filters server-side. */
  employee_ranges?: string[];
  /** Applied locally — Apollo gates revenue filtering behind a paid plan. */
  min_revenue?: number;
  max_revenue?: number;
  /** Applied locally. Businesses founded on or before this year. */
  founded_before?: number;
}

export interface ApolloOrganization {
  id: string;
  name: string;
  primary_domain?: string | null;
  website_url?: string | null;
  phone?: string | null;
  primary_phone?: { number?: string; sanitized_number?: string } | null;
  linkedin_url?: string | null;
  facebook_url?: string | null;
  twitter_url?: string | null;
  logo_url?: string | null;
  founded_year?: number | null;
  organization_revenue?: number | null;
  organization_revenue_printed?: string | null;
  estimated_num_employees?: number | null;
  sic_codes?: string[] | null;
  naics_codes?: string[] | null;
  organization_headcount_six_month_growth?: number | null;
  organization_headcount_twelve_month_growth?: number | null;
  organization_headcount_twenty_four_month_growth?: number | null;
}

/** Page size and hard page ceiling for the over-fetch loop. */
const PAGE_SIZE = 25;
const MAX_PAGES = 8;

/**
 * Search Apollo for acquisition targets.
 *
 * Apollo's free plan accepts keyword, location, and employee-range filters
 * server-side but rejects revenue and founded-year filters, so those are
 * applied locally. Because local filtering discards rows after they are
 * fetched, this over-fetches pages until it has enough matches or hits
 * MAX_PAGES.
 *
 * Records missing a revenue figure are kept rather than dropped — Apollo
 * only populates revenue on roughly a quarter of small businesses, and
 * discarding the rest would throw away most of the result set.
 */
export async function searchCompanies(
  criteria: ScanCriteria
): Promise<ApolloOrganization[]> {
  const apiKey = process.env.APOLLO_API_KEY;
  if (!apiKey) throw new Error("APOLLO_API_KEY not configured");

  const keywords = criteria.query
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean);
  if (!keywords.length) return [];

  const target = Math.min(criteria.max_results || 20, 100);
  const matches: ApolloOrganization[] = [];
  const seenDomains = new Set<string>();

  for (let page = 1; page <= MAX_PAGES && matches.length < target; page++) {
    const body: Record<string, unknown> = {
      q_organization_keyword_tags: keywords,
      organization_locations: [criteria.location],
      page,
      per_page: PAGE_SIZE,
    };
    if (criteria.employee_ranges?.length) {
      body.organization_num_employees_ranges = criteria.employee_ranges;
    }

    const res = await fetch(`${APOLLO_BASE}/mixed_companies/search`, {
      method: "POST",
      headers: apolloHeaders(apiKey),
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(12000),
    });

    if (!res.ok) {
      const detail = await res.text();
      if (page > 1) break; // keep what earlier pages returned
      throw new Error(`Apollo search failed (${res.status}): ${detail.slice(0, 200)}`);
    }

    const data = await res.json();
    const orgs: ApolloOrganization[] = data?.organizations || [];
    if (!orgs.length) break;

    for (const org of orgs) {
      if (matches.length >= target) break;

      // Apollo can return the same company across pages; domain is the key.
      const domain = org.primary_domain?.toLowerCase();
      if (domain) {
        if (seenDomains.has(domain)) continue;
        seenDomains.add(domain);
      }

      if (!passesLocalFilters(org, criteria)) continue;
      matches.push(org);
    }

    const totalPages = data?.pagination?.total_pages ?? 1;
    if (page >= totalPages) break;
  }

  console.log(
    `[Apollo] Discovery: ${matches.length} matches for "${criteria.query}" in ${criteria.location}`
  );
  return matches;
}

/**
 * Revenue and founded-year filters, applied client-side because Apollo
 * restricts both to paid plans. A missing value passes the filter.
 */
function passesLocalFilters(org: ApolloOrganization, criteria: ScanCriteria): boolean {
  const revenue = org.organization_revenue;
  if (revenue) {
    if (criteria.min_revenue && revenue < criteria.min_revenue) return false;
    if (criteria.max_revenue && revenue > criteria.max_revenue) return false;
  }

  if (criteria.founded_before && org.founded_year) {
    if (org.founded_year > criteria.founded_before) return false;
  }

  return true;
}

/**
 * Flatten an Apollo organization into the business_data shape stored on
 * scan_results.
 *
 * Apollo's search endpoint returns no address, city, or state, so location
 * is carried over from the search criteria — every result matched that
 * location filter by definition.
 */
export function mapOrganizationToBusinessData(
  org: ApolloOrganization,
  searchedLocation: string
): Record<string, any> {
  const currentYear = new Date().getFullYear();
  const businessAge = org.founded_year ? currentYear - org.founded_year : null;
  const { city, state } = parseSearchedLocation(searchedLocation);

  return {
    location_city: city,
    location_state: state,
    apollo_id: org.id,
    name: org.name || "Unknown",
    website: org.website_url || (org.primary_domain ? `https://${org.primary_domain}` : null),
    domain: org.primary_domain || null,
    phone: org.primary_phone?.sanitized_number || org.phone || null,
    linkedin_url: org.linkedin_url || null,
    founded_year: org.founded_year || null,
    business_age: businessAge,
    revenue: org.organization_revenue || null,
    revenue_printed: org.organization_revenue_printed || null,
    employee_count: org.estimated_num_employees || null,
    headcount_growth_12mo: org.organization_headcount_twelve_month_growth ?? null,
    headcount_growth_24mo: org.organization_headcount_twenty_four_month_growth ?? null,
    naics_codes: org.naics_codes || [],
    sic_codes: org.sic_codes || [],
    industry: inferIndustryFromCodes(org.naics_codes, org.sic_codes),
    searched_location: searchedLocation,
    logo_url: org.logo_url || null,
    source: "apollo",
  };
}

const STATE_CODES: Record<string, string> = {
  alabama: "AL", alaska: "AK", arizona: "AZ", arkansas: "AR", california: "CA",
  colorado: "CO", connecticut: "CT", delaware: "DE", florida: "FL", georgia: "GA",
  hawaii: "HI", idaho: "ID", illinois: "IL", indiana: "IN", iowa: "IA",
  kansas: "KS", kentucky: "KY", louisiana: "LA", maine: "ME", maryland: "MD",
  massachusetts: "MA", michigan: "MI", minnesota: "MN", mississippi: "MS",
  missouri: "MO", montana: "MT", nebraska: "NE", nevada: "NV",
  "new hampshire": "NH", "new jersey": "NJ", "new mexico": "NM", "new york": "NY",
  "north carolina": "NC", "north dakota": "ND", ohio: "OH", oklahoma: "OK",
  oregon: "OR", pennsylvania: "PA", "rhode island": "RI", "south carolina": "SC",
  "south dakota": "SD", tennessee: "TN", texas: "TX", utah: "UT", vermont: "VT",
  virginia: "VA", washington: "WA", "west virginia": "WV", wisconsin: "WI",
  wyoming: "WY", "district of columbia": "DC",
};

/**
 * Split an Apollo location string into city and two-letter state code.
 *
 * Apollo's search endpoint returns no address on results, so location is
 * carried from the query that matched them. Accepts "Austin, Texas, United
 * States" and the state-only "Texas, United States".
 */
export function parseSearchedLocation(location: string): {
  city: string | null;
  state: string | null;
} {
  if (!location) return { city: null, state: null };

  const parts = location
    .split(",")
    .map((p) => p.trim())
    .filter((p) => p && !/^(united states|usa|us)$/i.test(p));

  if (!parts.length) return { city: null, state: null };

  const toCode = (v: string) =>
    STATE_CODES[v.toLowerCase()] || (/^[A-Za-z]{2}$/.test(v) ? v.toUpperCase() : null);

  // Last remaining part is the state; anything before it is the city.
  const state = toCode(parts[parts.length - 1]);
  const city = parts.length > 1 ? parts[0] : null;

  return { city, state };
}

/**
 * NAICS/SIC prefixes for the sectors search funds actually buy.
 * Longest prefix wins, so 2382 beats a bare 23.
 */
const NAICS_TO_INDUSTRY: Record<string, string> = {
  "23822": "Plumbing & HVAC",
  "23821": "Electrical Services",
  "23816": "Roofing",
  "23833": "Flooring & Tile",
  "23832": "Painting Services",
  "2382": "Specialty Trade Contractors",
  "2383": "Building Finishing Contractors",
  "236": "Construction",
  "238": "Specialty Trade Contractors",
  "23": "Construction",
  "5412": "Accounting & Tax",
  "5413": "Engineering & Architecture",
  "5415": "IT Services",
  "5416": "Consulting",
  "5411": "Legal Services",
  "5617": "Building & Landscape Services",
  "5613": "Staffing & Employment",
  "5622": "Waste Management",
  "8111": "Auto Repair",
  "8112": "Electronics Repair",
  "8123": "Laundry & Dry Cleaning",
  "8121": "Personal Care Services",
  "6212": "Dental Practice",
  "6211": "Medical Practice",
  "6216": "Home Health Care",
  "6244": "Child Care",
  "7225": "Food & Beverage",
  "4841": "Trucking & Freight",
  "4931": "Warehousing & Storage",
  "4234": "Wholesale - Equipment",
  "4441": "Retail - Building Supply",
  "5311": "Real Estate",
  "5241": "Insurance",
  "8129": "Pet & Personal Services",
  "7139": "Fitness & Recreation",
  "3231": "Printing",
  "3327": "Machine Shops",
};

export function inferIndustryFromCodes(
  naics?: string[] | null,
  sic?: string[] | null
): string | null {
  const codes = [...(naics || []), ...(sic || [])];
  if (!codes.length) return null;

  const prefixes = Object.keys(NAICS_TO_INDUSTRY).sort((a, b) => b.length - a.length);
  for (const code of codes) {
    for (const prefix of prefixes) {
      if (code.startsWith(prefix)) return NAICS_TO_INDUSTRY[prefix];
    }
  }
  return null;
}

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
