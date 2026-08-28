"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, TrendingUp, Users, Cog, Target, Loader2, Sparkles } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { DealSelector } from "@/components/advisory/deal-selector";

const PLAYBOOKS = [
  { icon: TrendingUp, title: "Revenue Growth", color: "text-green-500", strategies: [
    { name: "Price Optimization", desc: "Analyze pricing vs. market and implement structured increases" },
    { name: "Sales Process", desc: "Build repeatable sales motion with CRM and pipeline management" },
    { name: "Customer Expansion", desc: "Upsell, cross-sell, and increase wallet share of existing customers" },
    { name: "New Markets", desc: "Geographic expansion, adjacent verticals, or new customer segments" },
    { name: "Digital Marketing", desc: "SEO, paid ads, content marketing, and lead generation" },
  ]},
  { icon: Cog, title: "Operational Efficiency", color: "text-primary", strategies: [
    { name: "Process Automation", desc: "Identify manual processes and implement technology solutions" },
    { name: "Supply Chain", desc: "Optimize vendor relationships, negotiate better terms, consolidate" },
    { name: "Labor Optimization", desc: "Right-size team, improve training, reduce turnover" },
    { name: "Quality Systems", desc: "Implement quality management to reduce waste and rework" },
  ]},
  { icon: Users, title: "Team Building", color: "text-primary", strategies: [
    { name: "Leadership Hire", desc: "Recruit GM or COO to run day-to-day operations" },
    { name: "Incentive Alignment", desc: "Performance bonuses, equity participation, retention packages" },
    { name: "Culture Building", desc: "Establish values, communication cadence, and team rituals" },
    { name: "Training Programs", desc: "Technical skills, leadership development, cross-training" },
  ]},
  { icon: Target, title: "KPI Framework", color: "text-primary", strategies: [
    { name: "Financial KPIs", desc: "Revenue growth, gross margin, EBITDA margin, cash conversion" },
    { name: "Customer KPIs", desc: "CAC, LTV, churn rate, NPS, repeat purchase rate" },
    { name: "Operational KPIs", desc: "Utilization rate, cycle time, defect rate, on-time delivery" },
    { name: "Team KPIs", desc: "Revenue per employee, turnover rate, training hours, engagement" },
  ]},
];

const DEFAULT_INPUTS = { business_name: "", industry: "", current_revenue: "", current_ebitda: "", employee_count: "" };

export default function ScalingPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [selectedDealId, setSelectedDealId] = useState<string | null>(null);
  const [inputs, setInputs] = useState(DEFAULT_INPUTS);
  function update(key: string, value: string) { setInputs((p) => ({ ...p, [key]: value })); }

  function handleDealSelect(deal: any) {
    setSelectedDealId(deal.id);
    setInputs((p) => ({
      ...p,
      business_name: deal.companies?.name || p.business_name,
      industry: deal.companies?.industry || p.industry,
      current_revenue: deal.companies?.revenue ? String(deal.companies.revenue / 100) : p.current_revenue,
      current_ebitda: deal.companies?.ebitda ? String(deal.companies.ebitda / 100) : p.current_ebitda,
      employee_count: deal.companies?.employee_count ? String(deal.companies.employee_count) : p.employee_count,
    }));
  }

  function handleDealClear() {
    setSelectedDealId(null);
    setInputs(DEFAULT_INPUTS);
  }

  async function analyze() {
    if (!inputs.business_name || !inputs.industry) { toast.error("Business name and industry required"); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/ai/analyze", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "scaling", data: inputs }) });
      setResult(await res.json());
    } catch { toast.error("Analysis failed"); }
    setLoading(false);
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link href="/advisory" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"><ArrowLeft className="h-3 w-3" /> Back to Advisory</Link>
      <div><h1 className="text-2xl font-bold tracking-tight">Scaling Playbooks</h1><p className="text-sm text-muted-foreground">Growth strategies and operational frameworks</p></div>
      <DealSelector onSelect={handleDealSelect} onClear={handleDealClear} selectedDealId={selectedDealId} />
      <Card className="border-border/50"><CardHeader><CardTitle className="text-sm">AI Scaling Strategy</CardTitle></CardHeader><CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2"><Label>Business Name</Label><Input value={inputs.business_name} onChange={(e) => update("business_name", e.target.value)} placeholder="Acme Corp" /></div>
          <div className="space-y-2"><Label>Industry</Label><Input value={inputs.industry} onChange={(e) => update("industry", e.target.value)} placeholder="Manufacturing" /></div>
          <div className="space-y-2"><Label>Current Revenue ($)</Label><Input type="number" value={inputs.current_revenue} onChange={(e) => update("current_revenue", e.target.value)} placeholder="3,000,000" /></div>
          <div className="space-y-2"><Label>Current EBITDA ($)</Label><Input type="number" value={inputs.current_ebitda} onChange={(e) => update("current_ebitda", e.target.value)} placeholder="500,000" /></div>
          <div className="space-y-2 sm:col-span-2"><Label>Employee Count</Label><Input type="number" value={inputs.employee_count} onChange={(e) => update("employee_count", e.target.value)} placeholder="25" /></div>
        </div>
        <Button className="w-full" onClick={analyze} disabled={loading}>{loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}Run AI Scaling Strategy</Button>
      </CardContent></Card>
      {result && (<Card className="border-primary/20"><CardHeader><CardTitle className="flex items-center gap-2 text-sm"><Sparkles className="h-4 w-4 text-primary" />AI Scaling Strategy</CardTitle></CardHeader><CardContent><div className="whitespace-pre-wrap text-sm text-muted-foreground">{typeof result.analysis === "string" ? result.analysis : JSON.stringify(result, null, 2)}</div></CardContent></Card>)}
      <div className="space-y-6">
        {PLAYBOOKS.map((playbook) => { const Icon = playbook.icon; return (
          <Card key={playbook.title} className="border-border/50"><CardHeader><CardTitle className="flex items-center gap-2 text-base"><Icon className={`h-5 w-5 ${playbook.color}`} />{playbook.title}</CardTitle></CardHeader><CardContent><div className="grid gap-3 sm:grid-cols-2">{playbook.strategies.map((s) => (<div key={s.name} className="rounded-lg border border-border/30 p-3"><p className="text-sm font-medium">{s.name}</p><p className="mt-1 text-xs text-muted-foreground">{s.desc}</p></div>))}</div></CardContent></Card>
        ); })}
      </div>
    </div>
  );
}
