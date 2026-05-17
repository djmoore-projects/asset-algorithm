import { createClient } from "@/lib/supabase/server";
import {
  Building2,
  Kanban,
  Mail,
  Target,
  Calendar,
  Bot,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MetricCard } from "@/components/analytics/metric-card";
import { formatCompactCurrency } from "@/lib/utils/constants";
import Link from "next/link";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // Fetch dashboard metrics
  const [
    { data: deals },
    { data: companies },
    { data: contacts },
    { data: campaigns },
    { data: meetings },
    { data: recentActivities },
  ] = await Promise.all([
    supabase
      .from("deals")
      .select("id, title, stage, asking_price, deal_score, priority, companies(name), created_at")
      .eq("user_id", user.id)
      .neq("stage", "dead"),
    supabase
      .from("companies")
      .select("id", { count: "exact" })
      .eq("user_id", user.id),
    supabase
      .from("contacts")
      .select("id", { count: "exact" })
      .eq("user_id", user.id),
    supabase
      .from("outreach_campaigns")
      .select("id, name, status, stats")
      .eq("user_id", user.id)
      .eq("status", "active" as any),
    supabase
      .from("meetings")
      .select("id, title, scheduled_at, contacts(first_name, last_name), companies(name)")
      .eq("user_id", user.id)
      .gte("scheduled_at", new Date().toISOString())
      .order("scheduled_at")
      .limit(5),
    supabase
      .from("activities")
      .select("id, activity_type, description, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10),
  ]) as any[];

  const totalPipelineValue =
    deals?.reduce((sum: number, d: any) => sum + (d.asking_price || 0), 0) || 0;
  const activeDeals = deals?.length || 0;
  const totalCompanies = companies?.length || 0;
  const totalContacts = contacts?.length || 0;

  // Group deals by stage
  const dealsByStage: Record<string, number> = {};
  deals?.forEach((d: any) => {
    dealsByStage[d.stage] = (dealsByStage[d.stage] || 0) + 1;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Your deal machine at a glance
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/sourcing">
            <Button variant="outline" size="sm">
              <Target className="mr-2 h-3.5 w-3.5" />
              Source Deals
            </Button>
          </Link>
          <Link href="/pipeline">
            <Button size="sm">
              <Kanban className="mr-2 h-3.5 w-3.5" />
              View Pipeline
            </Button>
          </Link>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Pipeline Value"
          value={formatCompactCurrency(totalPipelineValue)}
          icon="DollarSign"
          iconColor="text-emerald-500"
        />
        <MetricCard
          title="Active Deals"
          value={activeDeals}
          icon="Kanban"
          iconColor="text-blue-500"
        />
        <MetricCard
          title="Companies Sourced"
          value={totalCompanies}
          icon="Building2"
          iconColor="text-violet-500"
        />
        <MetricCard
          title="Contacts"
          value={totalContacts}
          icon="Users"
          iconColor="text-amber-500"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Pipeline Summary */}
        <Card className="border-border/50 lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">
                Pipeline Overview
              </CardTitle>
              <Link href="/pipeline">
                <Button variant="ghost" size="sm" className="h-7 text-xs">
                  View All <ArrowRight className="ml-1 h-3 w-3" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {activeDeals === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Kanban className="mb-3 h-8 w-8 text-muted-foreground/50" />
                <p className="text-sm font-medium">No active deals yet</p>
                <p className="text-xs text-muted-foreground">
                  Start by sourcing companies and creating deals
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {deals?.slice(0, 6).map((deal: any) => (
                  <Link
                    key={deal.id}
                    href={`/pipeline/${deal.id}`}
                    className="flex items-center justify-between rounded-lg border border-border/40 bg-background p-3 transition-colors hover:bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{deal.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {(deal.companies as { name: string } | null)?.name || "Unknown"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px]">
                        {deal.stage.replace(/_/g, " ")}
                      </Badge>
                      {deal.asking_price && (
                        <span className="text-xs font-medium">
                          {formatCompactCurrency(deal.asking_price)}
                        </span>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right Column */}
        <div className="space-y-6">
          {/* AI Insights Card */}
          <Card className="border-border/50 bg-gradient-to-br from-violet-500/5 to-blue-500/5">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <Sparkles className="h-4 w-4 text-violet-500" />
                AI Insights
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-lg bg-background/50 p-3">
                <p className="text-xs text-muted-foreground">
                  {activeDeals > 0
                    ? `You have ${activeDeals} active deals with a total pipeline value of ${formatCompactCurrency(totalPipelineValue)}. Ask me to analyze any deal or generate outreach.`
                    : "Your pipeline is empty. Start by importing companies in Sourcing, then create outreach campaigns to build your deal flow."}
                </p>
              </div>
              <Button variant="outline" size="sm" className="w-full text-xs">
                <Bot className="mr-2 h-3.5 w-3.5" />
                Ask AI for recommendations
              </Button>
            </CardContent>
          </Card>

          {/* Upcoming Meetings */}
          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold">
                  Upcoming Meetings
                </CardTitle>
                <Link href="/meetings">
                  <Button variant="ghost" size="sm" className="h-7 text-xs">
                    View All
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {!meetings?.length ? (
                <p className="py-4 text-center text-xs text-muted-foreground">
                  No upcoming meetings
                </p>
              ) : (
                <div className="space-y-2">
                  {meetings.map((meeting: any) => (
                    <Link
                      key={meeting.id}
                      href={`/meetings/${meeting.id}`}
                      className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-muted/50"
                    >
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs font-medium">{meeting.title}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {new Date(meeting.scheduled_at).toLocaleDateString(
                            "en-US",
                            {
                              weekday: "short",
                              month: "short",
                              day: "numeric",
                              hour: "numeric",
                              minute: "2-digit",
                            }
                          )}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Active Campaigns */}
          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold">
                  Active Campaigns
                </CardTitle>
                <Link href="/outreach">
                  <Button variant="ghost" size="sm" className="h-7 text-xs">
                    View All
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {!campaigns?.length ? (
                <p className="py-4 text-center text-xs text-muted-foreground">
                  No active campaigns
                </p>
              ) : (
                <div className="space-y-2">
                  {campaigns.map((campaign: any) => {
                    const stats = campaign.stats as Record<string, number> | null;
                    return (
                      <div
                        key={campaign.id}
                        className="flex items-center justify-between rounded-lg p-2"
                      >
                        <div className="flex items-center gap-2">
                          <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-xs font-medium">
                            {campaign.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                          <span>{stats?.sent || 0} sent</span>
                          <span>{stats?.replied || 0} replied</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
