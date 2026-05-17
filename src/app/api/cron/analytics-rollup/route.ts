import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { safeCompare } from "@/lib/security";

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization") || "";
    const expected = `Bearer ${process.env.CRON_SECRET || ""}`;
    if (!process.env.CRON_SECRET || !safeCompare(authHeader, expected)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createAdminClient();
    const today = new Date().toISOString().split("T")[0];
    const { data: profiles } = await supabase.from("profiles").select("id");
    if (!profiles) return NextResponse.json({ processed: 0 });

    let processed = 0;
    for (const profile of profiles) {
      const userId = profile.id;
      const [dealsRes, companiesRes, contactsRes, campaignsRes, meetingsRes] = await Promise.all([
        supabase.from("deals").select("stage, asking_price").eq("user_id", userId),
        supabase.from("companies").select("status").eq("user_id", userId),
        supabase.from("contacts").select("id").eq("user_id", userId),
        supabase.from("outreach_campaigns").select("status, stats").eq("user_id", userId),
        supabase.from("meetings").select("status").eq("user_id", userId),
      ]);

      const deals = dealsRes.data || [];
      const metrics = {
        total_deals: deals.length,
        active_deals: deals.filter((d: any) => !["closed", "dead"].includes(d.stage)).length,
        pipeline_value: deals.reduce((sum: number, d: any) => sum + (d.asking_price || 0), 0),
        total_companies: (companiesRes.data || []).length,
        total_contacts: (contactsRes.data || []).length,
        active_campaigns: (campaignsRes.data || []).filter((c: any) => c.status === "active").length,
        total_meetings: (meetingsRes.data || []).length,
      };

      await supabase.from("analytics_snapshots").upsert({ user_id: userId, snapshot_date: today, metrics }, { onConflict: "user_id,snapshot_date" });
      processed++;
    }
    return NextResponse.json({ processed, date: today });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
