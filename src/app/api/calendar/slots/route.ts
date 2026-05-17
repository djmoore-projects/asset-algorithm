import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAvailableSlots, refreshTokensIfNeeded } from "@/lib/integrations/google-calendar";

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: profile } = await supabase
      .from("profiles")
      .select("google_calendar_tokens")
      .eq("id", user.id)
      .single();

    const tokens = profile?.google_calendar_tokens as { access_token: string; refresh_token?: string | null; expiry_date?: number | null } | null;

    if (!tokens?.access_token) {
      return NextResponse.json({ error: "Google Calendar not connected" }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const days = parseInt(searchParams.get("days") || "7");
    const duration = parseInt(searchParams.get("duration") || "30");

    const startDate = new Date();
    startDate.setDate(startDate.getDate() + 1); // Start from tomorrow
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + days + 1);

    // Refresh tokens if needed and save back
    const freshTokens = await refreshTokensIfNeeded(tokens);
    if (freshTokens.access_token !== tokens.access_token) {
      await supabase
        .from("profiles")
        .update({
          google_calendar_tokens: {
            ...tokens,
            ...freshTokens,
          },
        })
        .eq("id", user.id);
    }

    const slots = await getAvailableSlots(freshTokens, {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      durationMinutes: duration,
    });

    return NextResponse.json({ slots, total: slots.length });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
