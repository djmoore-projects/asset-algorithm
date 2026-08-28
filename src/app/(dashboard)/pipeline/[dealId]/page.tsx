import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { formatCurrency, formatCompactCurrency, DEAL_STAGES, PRIORITY_CONFIG } from "@/lib/utils/constants";
import type { Database } from "@/types/database";

type DealRow = Database["public"]["Tables"]["deals"]["Row"];
type CompanyRow = Database["public"]["Tables"]["companies"]["Row"];
type ContactRow = Database["public"]["Tables"]["contacts"]["Row"];
type DealDetail = DealRow & { companies: CompanyRow | null; contacts: ContactRow | null };
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  Bot,
  Building2,
  Calendar,
  DollarSign,
  FileSearch,
  Mail,
  Phone,
  Sparkles,
  TrendingUp,
  User,
} from "lucide-react";
import Link from "next/link";

export default async function DealDetailPage({
  params,
}: {
  params: Promise<{ dealId: string }>;
}) {
  const { dealId } = await params;
  const supabase = await createClient();

  const { data: dealData, error } = await supabase
    .from("deals")
    .select("*, companies(*), contacts:primary_contact_id(*)")
    .eq("id", dealId)
    .single();

  if (error || !dealData) notFound();
  const deal = dealData as unknown as DealDetail;

  const company = deal.companies as any;
  const contact = deal.contacts as any;

  const stageConfig = DEAL_STAGES.find((s) => s.value === deal.stage);
  const priorityConfig = PRIORITY_CONFIG[deal.priority as keyof typeof PRIORITY_CONFIG];

  // Fetch related data
  const [{ data: activities }, { data: meetings }, { data: analyses }] = await Promise.all([
    supabase
      .from("activities")
      .select("*")
      .eq("entity_type", "deal")
      .eq("entity_id", dealId)
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("meetings")
      .select("*, contacts(first_name, last_name)")
      .eq("deal_id", dealId)
      .order("scheduled_at", { ascending: false })
      .limit(5),
    supabase
      .from("advisory_analyses")
      .select("id, analysis_type, title, status, created_at")
      .eq("deal_id", dealId)
      .order("created_at", { ascending: false })
      .limit(5),
  ]) as any[];

  return (
    <div className="space-y-6">
      {/* Breadcrumb + Header */}
      <div>
        <Link
          href="/pipeline"
          className="mb-2 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3 w-3" />
          Back to Pipeline
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{deal.title}</h1>
            <div className="mt-1 flex items-center gap-3">
              <Badge className={stageConfig?.color}>
                {stageConfig?.label}
              </Badge>
              <Badge variant="outline" className={priorityConfig?.color}>
                {priorityConfig?.label} Priority
              </Badge>
              {deal.deal_score !== null && (
                <div className="flex items-center gap-1">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  <span className="text-sm font-medium">
                    Score: {Math.round(deal.deal_score)}
                  </span>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href={`/advisory?deal=${dealId}`}>
              <Button variant="outline" size="sm">
                <FileSearch className="mr-2 h-3.5 w-3.5" />
                Run Analysis
              </Button>
            </Link>
            <Button size="sm">
              <Bot className="mr-2 h-3.5 w-3.5" />
              Ask AI
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="space-y-6 lg:col-span-2">
          {/* Financial Summary */}
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">
                Financial Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div>
                  <p className="text-xs text-muted-foreground">Asking Price</p>
                  <p className="text-lg font-bold">
                    {formatCurrency(deal.asking_price)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Est. Value</p>
                  <p className="text-lg font-bold">
                    {formatCurrency(deal.estimated_value)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Revenue</p>
                  <p className="text-lg font-bold">
                    {formatCurrency(deal.revenue)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">EBITDA</p>
                  <p className="text-lg font-bold">
                    {formatCurrency(deal.ebitda)}
                  </p>
                </div>
              </div>
              {deal.revenue && deal.asking_price && (
                <div className="mt-4 flex items-center gap-4 rounded-lg bg-muted/50 p-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Revenue Multiple</p>
                    <p className="text-sm font-semibold">
                      {(deal.asking_price / deal.revenue).toFixed(1)}x
                    </p>
                  </div>
                  {deal.ebitda && deal.ebitda > 0 && (
                    <div>
                      <p className="text-xs text-muted-foreground">EBITDA Multiple</p>
                      <p className="text-sm font-semibold">
                        {(deal.asking_price / deal.ebitda).toFixed(1)}x
                      </p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Deal Thesis */}
          {deal.deal_thesis && (
            <Card className="border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">
                  Deal Thesis
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {deal.deal_thesis}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Notes */}
          {deal.notes && (
            <Card className="border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {deal.notes}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Activity Timeline */}
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!activities?.length ? (
                <p className="py-4 text-center text-xs text-muted-foreground">
                  No activity recorded yet
                </p>
              ) : (
                <div className="space-y-3">
                  {activities.map((activity: any) => (
                    <div
                      key={activity.id}
                      className="flex items-start gap-3 text-sm"
                    >
                      <div className="mt-0.5 h-2 w-2 rounded-full bg-muted-foreground/40" />
                      <div>
                        <p className="text-xs">{activity.description}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {new Date(activity.created_at).toLocaleDateString(
                            "en-US",
                            {
                              month: "short",
                              day: "numeric",
                              hour: "numeric",
                              minute: "2-digit",
                            }
                          )}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Company Info */}
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <Building2 className="h-4 w-4" />
                Company
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p className="font-medium">{company?.name as string || "Unknown"}</p>
              {company?.industry && (
                <p className="text-xs text-muted-foreground">
                  {company.industry as string}
                </p>
              )}
              {company?.website && (
                <a
                  href={company.website as string}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary hover:underline"
                >
                  {company.website as string}
                </a>
              )}
              <Link href={`/sourcing/${company?.id}`}>
                <Button variant="ghost" size="sm" className="mt-2 h-7 w-full text-xs">
                  View Company Details
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Contact Info */}
          {contact && (
            <Card className="border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                  <User className="h-4 w-4" />
                  Primary Contact
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p className="font-medium">
                  {contact.first_name as string} {contact.last_name as string}
                </p>
                {contact.title && (
                  <p className="text-xs text-muted-foreground">
                    {contact.title as string}
                  </p>
                )}
                <div className="flex items-center gap-4">
                  {contact.email && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Mail className="h-3 w-3" />
                      {contact.email as string}
                    </div>
                  )}
                  {contact.phone && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Phone className="h-3 w-3" />
                      {contact.phone as string}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Analyses */}
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <FileSearch className="h-4 w-4" />
                Analyses
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!analyses?.length ? (
                <div className="text-center">
                  <p className="mb-2 text-xs text-muted-foreground">
                    No analyses run yet
                  </p>
                  <Link href={`/advisory?deal=${dealId}`}>
                    <Button variant="outline" size="sm" className="text-xs">
                      Run First Analysis
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-2">
                  {analyses.map((analysis: any) => (
                    <div
                      key={analysis.id}
                      className="flex items-center justify-between rounded-lg p-2 text-xs hover:bg-muted/50"
                    >
                      <div>
                        <p className="font-medium capitalize">
                          {analysis.analysis_type}
                        </p>
                        <p className="text-muted-foreground">
                          {new Date(analysis.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <Badge
                        variant="outline"
                        className={
                          analysis.status === "completed"
                            ? "text-emerald-500"
                            : "text-primary"
                        }
                      >
                        {analysis.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Meetings */}
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <Calendar className="h-4 w-4" />
                Meetings
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!meetings?.length ? (
                <p className="py-2 text-center text-xs text-muted-foreground">
                  No meetings scheduled
                </p>
              ) : (
                <div className="space-y-2">
                  {meetings.map((meeting: any) => (
                    <Link
                      key={meeting.id}
                      href={`/meetings/${meeting.id}`}
                      className="block rounded-lg p-2 text-xs hover:bg-muted/50"
                    >
                      <p className="font-medium">{meeting.title}</p>
                      <p className="text-muted-foreground">
                        {new Date(meeting.scheduled_at).toLocaleDateString(
                          "en-US",
                          {
                            month: "short",
                            day: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                          }
                        )}
                      </p>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
