"use client";

import { PLAN_LIMITS, PLAN_PRICES } from "@/lib/billing/plans";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check } from "lucide-react";

const PLANS = [
  {
    id: "free" as const,
    name: "Free",
    description: "Get started with core features",
    cta: "Get Started",
    popular: false,
  },
  {
    id: "pro" as const,
    name: "Pro",
    description: "For active acquirers and deal teams",
    cta: "Subscribe",
    popular: true,
  },
  {
    id: "enterprise" as const,
    name: "Enterprise",
    description: "For firms managing multiple acquisitions",
    cta: "Contact Us",
    popular: false,
  },
];

function getFeatures(planId: "free" | "pro" | "enterprise"): string[] {
  const limits = PLAN_LIMITS[planId];
  const features: string[] = [];

  features.push(limits.ai_credits === -1 ? "Unlimited AI credits" : `${limits.ai_credits} AI credits/month`);
  features.push(limits.scans === -1 ? "Unlimited scans" : `${limits.scans} scans/month`);
  features.push(limits.outreach_messages === -1 ? "Unlimited outreach messages" : `${limits.outreach_messages} outreach messages/month`);
  features.push(`${limits.advisory_modules.length} advisory module${limits.advisory_modules.length > 1 ? "s" : ""}`);

  if (limits.multi_channel_outreach) features.push("Multi-channel outreach");
  if (limits.priority_support) features.push("Priority support");

  return features;
}

export default function PricingPage() {
  async function handleSubscribe(planId: "free" | "pro" | "enterprise") {
    if (planId === "free") {
      window.location.href = "/auth/signup";
      return;
    }
    if (planId === "enterprise") {
      window.location.href = "mailto:sales@aismartr.com";
      return;
    }
    // For pro, redirect to checkout
    const priceId = PLAN_PRICES[planId].stripe_monthly_id;
    const res = await fetch("/api/billing/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ price_id: priceId }),
    });
    const { url } = await res.json();
    if (url) window.location.href = url;
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-16">
      <div className="mb-12 text-center">
        <h1 className="text-4xl font-bold tracking-tight">Simple, transparent pricing</h1>
        <p className="mt-3 text-lg text-muted-foreground">
          Choose the plan that fits your acquisition strategy
        </p>
      </div>

      <div className="grid w-full max-w-5xl gap-6 md:grid-cols-3">
        {PLANS.map((plan) => {
          const price = PLAN_PRICES[plan.id];
          const features = getFeatures(plan.id);

          return (
            <Card
              key={plan.id}
              className={`relative border-border/50 ${plan.popular ? "border-primary ring-1 ring-primary" : ""}`}
            >
              {plan.popular && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
                  Most Popular
                </Badge>
              )}
              <CardHeader className="text-center">
                <CardTitle className="text-lg">{plan.name}</CardTitle>
                <p className="text-sm text-muted-foreground">{plan.description}</p>
                <div className="mt-4">
                  <span className="text-4xl font-bold">
                    {price.monthly === 0 ? "$0" : `$${price.monthly}`}
                  </span>
                  <span className="text-sm text-muted-foreground">/month</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2.5">
                  {features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  className="w-full"
                  variant={plan.popular ? "default" : "outline"}
                  onClick={() => handleSubscribe(plan.id)}
                >
                  {plan.cta}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
