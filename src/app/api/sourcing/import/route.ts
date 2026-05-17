import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { companies } = await req.json();
    if (!Array.isArray(companies) || companies.length === 0) {
      return NextResponse.json({ error: "companies array is required" }, { status: 400 });
    }

    const results = { success: 0, errors: 0, details: [] as any[] };
    for (const company of companies) {
      try {
        const { error } = await supabase.from("companies").insert({
          user_id: user.id, name: company.name, industry: company.industry || null,
          revenue: company.revenue ? parseInt(company.revenue) : null,
          location: company.location || null, website: company.website || null,
          employee_count: company.employee_count ? parseInt(company.employee_count) : null, status: "new",
        });
        if (error) throw error;
        results.success++;
      } catch (err: any) {
        results.errors++;
        results.details.push({ name: company.name, error: err.message });
      }
    }
    return NextResponse.json(results);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
