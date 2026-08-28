import { getCompany } from "@/actions/companies";
import { getContacts } from "@/actions/contacts";
import { getDeals } from "@/actions/deals";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Globe, MapPin, Users, DollarSign, TrendingUp, Brain, Target } from "lucide-react";
import Link from "next/link";
import { CreateDealButton } from "./create-deal-button";
import { StartOutreachButton } from "./start-outreach-button";

export default async function CompanyDetailPage({ params }: { params: Promise<{ companyId: string }> }) {
  const { companyId } = await params;
  const company = await getCompany(companyId);
  const { contacts } = await getContacts({ company_id: companyId });
  const deals = await getDeals({ company_id: companyId });

  const STATUS_COLORS: Record<string, string> = {
    new: "bg-primary/10 text-primary", researching: "bg-primary/10 text-primary",
    qualified: "bg-green-500/10 text-green-500", outreach: "bg-primary/10 text-primary",
    engaged: "bg-primary/10 text-primary", not_a_fit: "bg-muted text-muted-foreground",
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link href="/sourcing" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"><ArrowLeft className="h-3 w-3" /> Back to Sourcing</Link>
      <div className="flex items-start justify-between">
        <div><div className="flex items-center gap-3"><h1 className="text-2xl font-bold tracking-tight">{company.name}</h1><Badge className={STATUS_COLORS[company.status || "new"] || ""}>{company.status || "new"}</Badge></div>{company.industry && <p className="mt-1 text-muted-foreground">{company.industry}</p>}</div>
        <div className="flex items-center gap-3">
          {company.icp_score && <div className="flex items-center gap-1 text-lg font-bold"><Target className="h-5 w-5 text-primary" />{Math.round(company.icp_score)}/100</div>}
          <StartOutreachButton companyId={companyId} companyName={company.name} contacts={contacts} />
          <CreateDealButton companyId={companyId} companyName={company.name} contacts={contacts} />
        </div>
      </div>
      <div className="grid gap-6 md:grid-cols-3">
        <div className="space-y-6 md:col-span-2">
          <Card className="border-border/50"><CardHeader><CardTitle className="text-sm">Company Details</CardTitle></CardHeader><CardContent className="grid grid-cols-2 gap-4">
            {company.revenue_range && <div className="flex items-center gap-3"><DollarSign className="h-4 w-4 text-muted-foreground" /><div><p className="text-xs text-muted-foreground">Revenue</p><p className="text-sm font-medium">{company.revenue_range}</p></div></div>}
            {company.ebitda_range && <div className="flex items-center gap-3"><TrendingUp className="h-4 w-4 text-muted-foreground" /><div><p className="text-xs text-muted-foreground">EBITDA</p><p className="text-sm font-medium">{company.ebitda_range}</p></div></div>}
            {company.employee_count && <div className="flex items-center gap-3"><Users className="h-4 w-4 text-muted-foreground" /><div><p className="text-xs text-muted-foreground">Employees</p><p className="text-sm font-medium">{company.employee_count}</p></div></div>}
            {(company.location_city || company.location_state) && <div className="flex items-center gap-3"><MapPin className="h-4 w-4 text-muted-foreground" /><div><p className="text-xs text-muted-foreground">Location</p><p className="text-sm font-medium">{[company.location_city, company.location_state].filter(Boolean).join(", ")}</p></div></div>}
            {company.website && <div className="flex items-center gap-3"><Globe className="h-4 w-4 text-muted-foreground" /><div><p className="text-xs text-muted-foreground">Website</p><a href={company.website} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-primary hover:underline">{company.website}</a></div></div>}
          </CardContent></Card>
          {company.ai_summary && <Card className="border-border/50 border-primary/20"><CardHeader><CardTitle className="flex items-center gap-2 text-sm"><Brain className="h-4 w-4 text-primary" />AI Summary</CardTitle></CardHeader><CardContent><p className="whitespace-pre-wrap text-sm text-muted-foreground">{company.ai_summary}</p></CardContent></Card>}
          {company.description && <Card className="border-border/50"><CardHeader><CardTitle className="text-sm">Notes</CardTitle></CardHeader><CardContent><p className="whitespace-pre-wrap text-sm text-muted-foreground">{company.description}</p></CardContent></Card>}
        </div>
        <div className="space-y-6">
          <Card className="border-border/50"><CardHeader><CardTitle className="text-sm">Contacts ({contacts.length})</CardTitle></CardHeader><CardContent>{contacts.length === 0 ? <p className="text-sm text-muted-foreground">No contacts yet</p> : <div className="space-y-2">{contacts.map((c: any) => (<Link key={c.id} href={`/relationships/${c.id}`} className="block rounded-lg border border-border/30 p-2 hover:bg-muted/20"><p className="text-sm font-medium">{c.first_name} {c.last_name}</p><p className="text-xs text-muted-foreground">{c.title || c.role_type}</p></Link>))}</div>}</CardContent></Card>
          <Card className="border-border/50"><CardHeader><CardTitle className="text-sm">Deals ({deals.length})</CardTitle></CardHeader><CardContent>{deals.length === 0 ? <p className="text-sm text-muted-foreground">No deals yet</p> : <div className="space-y-2">{deals.map((d: any) => (<Link key={d.id} href={`/pipeline/${d.id}`} className="block rounded-lg border border-border/30 p-2 hover:bg-muted/20"><p className="text-sm font-medium">{d.title}</p><Badge variant="outline" className="mt-1 text-xs">{d.stage}</Badge></Link>))}</div>}</CardContent></Card>
        </div>
      </div>
    </div>
  );
}
