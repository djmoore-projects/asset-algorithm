import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { z } from "zod";
import { authenticateAndLimit, validateBody, handleApiError } from "@/lib/api-utils";
import { RATE_LIMITS } from "@/lib/rate-limit";

const CheckoutSchema = z.object({
  price_id: z.string().min(1, "price_id is required"),
});

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2026-04-22.dahlia",
  });
}

export async function POST(req: NextRequest) {
  try {
    const auth = await authenticateAndLimit(req, "billing", RATE_LIMITS.general);
    if (auth.error) return auth.error;

    const body = await req.json();
    const validation = validateBody(body, CheckoutSchema);
    if (validation.error) return validation.error;

    const { price_id } = validation.data;
    const stripe = getStripe();

    // Get or create Stripe customer
    const adminSupabase = createAdminClient() as any;
    const { data: sub } = await adminSupabase
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", auth.user.id)
      .single();

    let customerId = (sub as any)?.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: auth.user.email,
        metadata: { user_id: auth.user.id },
      });
      customerId = customer.id;

      await adminSupabase
        .from("subscriptions")
        .update({ stripe_customer_id: customerId })
        .eq("user_id", auth.user.id);
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      line_items: [{ price: price_id, quantity: 1 }],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings/billing?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings/billing?canceled=true`,
      metadata: { user_id: auth.user.id },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    return handleApiError(error, "Checkout");
  }
}
