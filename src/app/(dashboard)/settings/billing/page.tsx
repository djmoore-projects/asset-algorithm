"use client";

import { useEffect, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { PLAN_LIMITS, PLAN_PRICES, type PlanId } from "@/lib/billing/plans";
import { CreditCard, Zap, Search, MessageSquare } from "lucide-react";

interface SubscriptionData {
  plan: PlanId;
  status: string;
  stripe_customer_id: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
}

interface UsageData {
  ai_credits_used: number;
  scans_used: number;
  outreach_messages_used: number;
}

export default function BillingPage() {
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    async function fetchData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: sub } = await supabase
        .from("subscriptions")
        .select("plan, status, stripe_customer_id, current_period_end, cancel_at_period_end")
        .eq("user_id", user.id)
        .single();

      if (sub) setSubscription(sub as unknown as SubscriptionData);

      const now = new Date();
      const periodStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      const { data: usageData } = await supabase
        .from("usage")
        .select("ai_credits_used, scans_used, outreach_messages_used")
        .eq("user_id", user.id)
        .gte("period_start", periodStart)
        .single();

      if (usageData) setUsage(usageData as unknown as UsageData);

      setLoading(false);
    }
    fetchData();
  }, []);

  async function handleUpgrade(priceId: string) {
    const res = await fetch("/api/billing/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ price_id: priceId }),
    });
    const { url } = await res.json();
    if (url) window.location.href = url;
  }

  async function handleManageBilling() {
    const res = await fetch("/api/billing/portal", { method: "POST" });
    const { url } = await res.json();
    if (url) window.location.href = url;
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Billing</h1>
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  const plan = subscription?.plan || "free";
  const limits = PLAN_LIMITS[plan];
  const currentUsage = usage || { ai_credits_used: 0, scans_used: 0, outreach_messages_used: 0 };

  function usagePercent(used: number, limit: number): number {
    if (limit === -1) return 0;
    return Math.min(Math.round((used / limit) * 100), 100);
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Billing</h1>
        <p className="text-sm text-muted-foreground">Manage your subscription and usage</p>
      </div>

      {/* Current Plan */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Current Plan
            </span>
            <Badge variant={plan === "free" ? "secondary" : "default"}>
              {plan.charAt(0).toUpperCase() + plan.slice(1)}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Status</span>
            <Badge variant="outline">{subscription?.status || "active"}</Badge>
          </div>
          {subscription?.current_period_end && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Current period ends</span>
              <span className="font-medium">
                {new Date(subscription.current_period_end).toLocaleDateString()}
              </span>
            </div>
          )}
          {subscription?.cancel_at_period_end && (
            <p className="text-xs text-yellow-500">Your subscription will cancel at the end of the current period.</p>
          )}
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Monthly price</span>
            <span className="font-medium">
              {PLAN_PRICES[plan].monthly === 0 ? "Free" : `$${PLAN_PRICES[plan].monthly}/mo`}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Usage */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-sm">Usage This Period</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <UsageRow
            icon={<Zap className="h-4 w-4" />}
            label="AI Credits"
            used={currentUsage.ai_credits_used}
            limit={limits.ai_credits}
          />
          <UsageRow
            icon={<Search className="h-4 w-4" />}
            label="Scans"
            used={currentUsage.scans_used}
            limit={limits.scans}
          />
          <UsageRow
            icon={<MessageSquare className="h-4 w-4" />}
            label="Outreach Messages"
            used={currentUsage.outreach_messages_used}
            limit={limits.outreach_messages}
          />
        </CardContent>
      </Card>

      {/* Actions */}
      <Card className="border-border/50">
        <CardContent className="flex flex-col gap-3 p-4">
          {plan === "free" && (
            <Button onClick={() => handleUpgrade(PLAN_PRICES.pro.stripe_monthly_id!)}>
              Upgrade to Pro — $79/mo
            </Button>
          )}
          {plan === "pro" && (
            <Button onClick={() => handleUpgrade(PLAN_PRICES.enterprise.stripe_monthly_id!)}>
              Upgrade to Enterprise — $199/mo
            </Button>
          )}
          {subscription?.stripe_customer_id && (
            <Button variant="outline" onClick={handleManageBilling}>
              Manage Billing
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function UsageRow({ icon, label, used, limit }: { icon: React.ReactNode; label: string; used: number; limit: number }) {
  const isUnlimited = limit === -1;
  const percent = isUnlimited ? 0 : Math.min(Math.round((used / limit) * 100), 100);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="flex items-center gap-2 text-muted-foreground">
          {icon}
          {label}
        </span>
        <span className="font-medium">
          {isUnlimited ? `${used} / Unlimited` : `${used} / ${limit}`}
        </span>
      </div>
      <Progress value={isUnlimited ? 0 : percent} className="h-2" />
      {!isUnlimited && percent >= 80 && (
        <p className="text-xs text-yellow-500">{percent}% used</p>
      )}
    </div>
  );
}
