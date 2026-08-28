import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { authenticateAndLimit, validateBody, handleApiError } from "@/lib/api-utils";
import { RATE_LIMITS } from "@/lib/rate-limit";

const CompanyItem = z.object({
  name: z.string().min(1).max(200),
  industry: z.string().max(100).optional(),
  revenue: z.union([z.string(), z.number()]).optional(),
  location: z.string().max(200).optional(),
  website: z.string().max(500).optional(),
  employee_count: z.union([z.string(), z.number()]).optional(),
});

const ImportSchema = z.object({
  companies: z.array(CompanyItem).min(1).max(500),
});

export async function POST(req: NextRequest) {
  try {
    const auth = await authenticateAndLimit(req, "sourcing", RATE_LIMITS.general);
    if (auth.error) return auth.error;

    const raw = await req.json();
    const validation = validateBody(raw, ImportSchema);
    if (validation.error) return validation.error;

    const { companies } = validation.data;
    const supabase = await createClient();

    const results = { success: 0, errors: 0, details: [] as { name: string; error: string }[] };
    for (const company of companies) {
      try {
        // companies stores revenue as a text range and location split into
        // city and state. Writing bare `revenue` and `location` targeted
        // columns that do not exist, so every import row failed.
        const [city, state] = String(company.location || "")
          .split(",")
          .map((s) => s.trim());

        const { error } = await supabase.from("companies").insert({
          user_id: auth.user.id,
          name: company.name,
          industry: company.industry || null,
          revenue_range: company.revenue ? String(company.revenue) : null,
          location_city: city || null,
          location_state: state || null,
          website: company.website || null,
          employee_count: company.employee_count ? parseInt(String(company.employee_count)) : null,
          status: "new",
        });
        if (error) throw error;
        results.success++;
      } catch (err: unknown) {
        results.errors++;
        results.details.push({ name: company.name, error: "Failed to import" });
      }
    }
    return NextResponse.json(results);
  } catch (error) {
    return handleApiError(error, "Sourcing.Import");
  }
}
