import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthUrl } from "@/lib/integrations/google-calendar";

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const url = getAuthUrl(user.id);
    return NextResponse.json({ url });
  } catch (error: any) {
    console.error("[Calendar.Connect]", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Failed to connect calendar" }, { status: 500 });
  }
}
