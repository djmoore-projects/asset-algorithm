import { getOutreachSettings } from "@/actions/profile";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Gauge, ShieldBan, TrendingUp } from "lucide-react";
import { SendCapForm, UnsuppressButton } from "./controls";

export const dynamic = "force-dynamic";

const REASON_LABEL: Record<string, string> = {
  unsubscribed: "Unsubscribed",
  bounced: "Bounced",
  complained: "Marked as spam",
  manual: "Removed by you",
};

export default async function OutreachSettingsPage() {
  const { budget, suppressed, suppressedTotal } = await getOutreachSettings();
  const usedPct = budget.effectiveCap > 0
    ? Math.min(100, (budget.sentToday / budget.effectiveCap) * 100)
    : 0;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Outreach Safety</h1>
        <p className="text-sm text-muted-foreground">
          Daily sending limits and the contacts no campaign may reach
        </p>
      </div>

      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Gauge className="h-4 w-4" />
            Daily send budget
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-baseline justify-between">
              <span className="text-sm text-muted-foreground">Sent today</span>
              <span className="text-sm font-medium tabular-nums">
                {budget.sentToday} / {budget.effectiveCap}
              </span>
            </div>
            <Progress value={usedPct} />
          </div>

          {budget.warmingUp && (
            <div className="flex items-start gap-3 rounded-md border border-amber-500/40 bg-amber-500/5 p-3">
              <TrendingUp className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
              <div className="space-y-1">
                <p className="text-sm font-medium">Warming up</p>
                <p className="text-xs text-muted-foreground">
                  Today&apos;s limit is {budget.effectiveCap}, rising toward your cap of{" "}
                  {budget.configuredCap}. New senders that open at full volume get
                  filtered, so the limit ramps over the first days of sending.
                </p>
              </div>
            </div>
          )}

          <SendCapForm current={budget.configuredCap} />

          <p className="text-xs text-muted-foreground">
            The limit is shared across every campaign, because sending reputation
            belongs to your domain rather than to any one campaign. Set it to 0 to
            pause all automated sending.
          </p>
        </CardContent>
      </Card>

      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <ShieldBan className="h-4 w-4" />
            Suppression list
            {suppressedTotal > 0 && (
              <Badge variant="outline" className="ml-1">{suppressedTotal}</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {suppressed.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nobody has opted out yet. Anyone who unsubscribes or hard-bounces lands
              here and is blocked on every channel automatically.
            </p>
          ) : (
            <div className="divide-y divide-border/50">
              {suppressed.map((c) => (
                <div key={c.id} className="flex items-center justify-between gap-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {[c.first_name, c.last_name].filter(Boolean).join(" ") || c.email || "Unknown"}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {c.email || "no email"} &middot;{" "}
                      {REASON_LABEL[c.suppression_reason || ""] || "Suppressed"} on{" "}
                      {new Date(c.unsubscribed_at).toLocaleDateString()}
                    </p>
                  </div>
                  <UnsuppressButton contactId={c.id} />
                </div>
              ))}
              {suppressedTotal > suppressed.length && (
                <p className="pt-3 text-xs text-muted-foreground">
                  Showing the {suppressed.length} most recent of {suppressedTotal}.
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
