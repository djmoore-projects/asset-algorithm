export interface PublicRecordOfficer {
  name: string;
  position: string;
  start_date: string | null;
}

export interface PublicRecordResult {
  company_name: string;
  jurisdiction: string;
  company_number: string | null;
  incorporation_date: string | null;
  company_type: string | null;
  status: string | null;
  registered_address: string | null;
  officers: PublicRecordOfficer[];
  source: "opencorporates";
  source_url: string | null;
}

const BASE_URL = "https://api.opencorporates.com/v0.4";

/**
 * Map US two-letter state code to OpenCorporates jurisdiction code.
 */
function stateToJurisdiction(stateCode: string | null): string | null {
  if (!stateCode) return null;
  return `us_${stateCode.toLowerCase()}`;
}

/**
 * Lookup a business in public records via OpenCorporates.
 * Returns officer/owner info if found. Returns null on any failure.
 */
export async function lookupPublicRecords(
  businessName: string,
  stateCode: string | null
): Promise<PublicRecordResult | null> {
  try {
    const jurisdiction = stateToJurisdiction(stateCode);

    // Build search URL
    const params = new URLSearchParams({
      q: businessName,
      ...(jurisdiction ? { jurisdiction_code: jurisdiction } : {}),
      per_page: "1",
      order: "score",
    });

    // Add optional API token for higher rate limits
    const apiToken = process.env.OPENCORPORATES_API_TOKEN;
    if (apiToken) params.set("api_token", apiToken);

    const searchUrl = `${BASE_URL}/companies/search?${params.toString()}`;

    const searchRes = await fetch(searchUrl, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(5000),
    });

    if (!searchRes.ok) return null;

    const searchData = await searchRes.json();
    const companies = searchData?.results?.companies;
    if (!companies?.length) return null;

    const company = companies[0].company;
    const companyNumber = company.company_number;
    const jurisdictionCode = company.jurisdiction_code;

    // Fetch officers
    let officers: PublicRecordOfficer[] = [];
    try {
      const officerParams = new URLSearchParams();
      if (apiToken) officerParams.set("api_token", apiToken);

      const officerUrl = `${BASE_URL}/companies/${jurisdictionCode}/${companyNumber}/officers?${officerParams.toString()}`;
      const officerRes = await fetch(officerUrl, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(5000),
      });

      if (officerRes.ok) {
        const officerData = await officerRes.json();
        const officerList = officerData?.results?.officers || [];
        officers = officerList.map((o: any) => ({
          name: o.officer?.name || "Unknown",
          position: o.officer?.position || "Officer",
          start_date: o.officer?.start_date || null,
        }));
      }
    } catch {
      // Officer lookup failed — continue with company data only
    }

    return {
      company_name: company.name || businessName,
      jurisdiction: jurisdictionCode || "",
      company_number: companyNumber || null,
      incorporation_date: company.incorporation_date || null,
      company_type: company.company_type || null,
      status: company.current_status || null,
      registered_address: company.registered_address_in_full || null,
      officers,
      source: "opencorporates",
      source_url: company.opencorporates_url || null,
    };
  } catch {
    // Any failure — return null (best-effort)
    return null;
  }
}
