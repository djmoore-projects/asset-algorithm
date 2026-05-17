import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, Users, DollarSign, Target } from "lucide-react";
import {
  PipelineChart,
  OutreachFunnel,
  CompanyStatusChart,
  DealScoreDistribution,
} from "@/components/analytics/charts";

export default async function AnalyticsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const [dealsRes, companiesRes, contactsRes, campaignsRes] = await Promise.all([
    supabase.from("deals").select("stage, asking_price, deal_score").eq("user_id", user.id),
    supabase.from("companies").select("status, icp_score").eq("user_id", user.id),
    supabase.from("contacts").select("role_type").eq("user_id", user.id),
    supabase.from("outreach_campaigns").select("status, stats").eq("user_id", user.id),
  ]);

  const deals = dealsRes.data || [];
  const companies = companiesRes.data || [];
  const contacts = contactsRes.data || [];
  const campaigns = campaignsRes.data || [];

  const totalPipelineValue = deals.reduce((sum: number, d: any) => sum + (d.asking_price || 0), 0);
  const activeDeals = deals.filter((d: any) => !["closed", "dead"].includes(d.stage)).length;
  const avgDealScore = deals.length > 0 ? Math.round(deals.reduce((sum: number, d: any) => sum + (d.deal_score || 0), 0) / deals.length) : 0;

  // Chart data: pipeline by stage
  const stageDistribution = deals.reduce((acc: Record<string, number>, d: any) => { acc[d.stage] = (acc[d.stage] || 0) + 1; return acc; }, {});
  const pipelineData = Object.entries(stageDistribution).map(([stage, count]) => ({
    stage: stage.replace(/_/g, " "),
    count: count as number,
  }));

  // Chart data: outreach funnel
  const totalSent = campaigns.reduce((sum: number, c: any) => sum + ((c.stats as any)?.sent || 0), 0);
  const totalOpened = campaigns.reduce((sum: number, c: any) => sum + ((c.stats as any)?.opened || 0), 0);
  const totalReplied = campaigns.reduce((sum: number, c: any) => sum + ((c.stats as any)?.replied || 0), 0);
  const totalMeetings = campaigns.reduce((sum: number, c: any) => sum + ((c.stats as any)?.meetings || 0), 0);
  const funnelData = [
    { name: "Sent", value: totalSent },
    { name: "Opened", value: totalOpened },
    { name: "Replied", value: totalReplied },
    { name: "Meetings", value: totalMeetings },
  ];

  // Chart data: company status
  const companyStatuses = companies.reduce((acc: Record<string, number>, c: any) => { acc[c.status || "new"] = (acc[c.status || "new"] || 0) + 1; return acc; }, {});
  const companyStatusData = Object.entries(companyStatuses).map(([status, count]) => ({
    status,
    count: count as number,
  }));

  // Chart data: deal score distribution
  const scoreBuckets = [
    { bucket: "0-20", min: 0, max: 20 },
    { bucket: "21-40", min: 21, max: 40 },
    { bucket: "41-60", min: 41, max: 60 },
    { bucket: "61-80", min: 61, max: 80 },
    { bucket: "81-100", min: 81, max: 100 },
  ];
  const scoreData = scoreBuckets.map(({ bucket, min, max }) => ({
    bucket,
    count: deals.filter((d: any) => (d.deal_score || 0) >= min && (d.deal_score || 0) <= max).length,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
        <p className="text-sm text-muted-foreground">Performance metrics across your deal funnel</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Pipeline Value</p>
              <DollarSign className="h-4 w-4 text-green-500" />
            </div>
            <p className="mt-1 text-2xl font-bold">${(totalPipelineValue / 100).toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">{activeDeals} active deals</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Companies Sourced</p>
              <Target className="h-4 w-4 text-blue-500" />
            </div>
            <p className="mt-1 text-2xl font-bold">{companies.length}</p>
            <p className="text-xs text-muted-foreground">{companies.filter((c: any) => c.status === "qualified").length} qualified</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Contacts</p>
              <Users className="h-4 w-4 text-purple-500" />
            </div>
            <p className="mt-1 text-2xl font-bold">{contacts.length}</p>
            <p className="text-xs text-muted-foreground">{contacts.filter((c: any) => c.role_type === "owner").length} owners</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Avg Deal Score</p>
              <BarChart3 className="h-4 w-4 text-orange-500" />
            </div>
            <p className="mt-1 text-2xl font-bold">{avgDealScore}/100</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-sm">Pipeline by Stage</CardTitle>
          </CardHeader>
          <CardContent>
            <PipelineChart data={pipelineData} />
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-sm">Outreach Funnel</CardTitle>
          </CardHeader>
          <CardContent>
            <OutreachFunnel data={funnelData} />
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-sm">Company Status</CardTitle>
          </CardHeader>
          <CardContent>
            <CompanyStatusChart data={companyStatusData} />
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-sm">Deal Score Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <DealScoreDistribution data={scoreData} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
