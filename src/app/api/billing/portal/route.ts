import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { authenticateAndLimit, handleApiError, apiError } from "@/lib/api-utils";
import { RATE_LIMITS } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2026-04-22.dahlia",
  });
}

export async function POST(req: NextRequest) {
  try {
    const auth = await authenticateAndLimit(req, "billing", RATE_LIMITS.general);
    if (auth.error) return auth.error;

    const supabase = await createClient();
    const { data: sub } = await (supabase as any)
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", auth.user.id)
      .single();

    if (!(sub as any)?.stripe_customer_id) {
      return apiError("No billing account found", 400);
    }

    const stripe = getStripe();
    const session = await stripe.billingPortal.sessions.create({
      customer: (sub as any).stripe_customer_id,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings/billing`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    return handleApiError(error, "Portal");
  }
}
