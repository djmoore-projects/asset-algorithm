"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Settings, BarChart3, Users, Clock, Loader2, Sparkles } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { DealSelector } from "@/components/advisory/deal-selector";

const PHASES = [
  { title: "Day 1-30: Stabilize", icon: Settings, color: "text-blue-500", items: ["Announce ownership transition to all employees", "Meet with every key employee 1-on-1", "Secure all critical vendor relationships", "Audit existing contracts and obligations", "Establish new banking and accounting", "Implement financial reporting cadence", "Review and secure IT systems access"] },
  { title: "Day 31-60: Optimize", icon: BarChart3, color: "text-green-500", items: ["Identify quick-win operational improvements", "Implement KPI tracking dashboard", "Review and renegotiate supplier contracts", "Assess technology stack and identify gaps", "Begin customer satisfaction assessment", "Document all standard operating procedures"] },
  { title: "Day 61-100: Accelerate", icon: Users, color: "text-purple-500", items: ["Launch growth initiatives identified in diligence", "Hire for critical gaps in team", "Implement new systems and processes", "Begin cross-selling or upselling programs", "Establish board or advisory board cadence", "Set 12-month strategic plan with milestones"] },
];

const DEFAULT_INPUTS = { business_name: "", industry: "", employee_count: "", annual_revenue: "" };

export default function IntegrationPage() {
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
      employee_count: deal.companies?.employee_count ? String(deal.companies.employee_count) : p.employee_count,
      annual_revenue: deal.companies?.revenue ? String(deal.companies.revenue / 100) : p.annual_revenue,
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
      const res = await fetch("/api/ai/analyze", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "integration", data: inputs }) });
      setResult(await res.json());
    } catch { toast.error("Analysis failed"); }
    setLoading(false);
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link href="/advisory" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"><ArrowLeft className="h-3 w-3" /> Back to Advisory</Link>
      <div><h1 className="text-2xl font-bold tracking-tight">Integration Planning</h1><p className="text-sm text-muted-foreground">Day 1-100 post-acquisition playbook</p></div>
      <DealSelector onSelect={handleDealSelect} onClear={handleDealClear} selectedDealId={selectedDealId} />
      <Card className="border-border/50"><CardHeader><CardTitle className="text-sm">AI Integration Plan</CardTitle></CardHeader><CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2"><Label>Business Name</Label><Input value={inputs.business_name} onChange={(e) => update("business_name", e.target.value)} placeholder="Acme Corp" /></div>
          <div className="space-y-2"><Label>Industry</Label><Input value={inputs.industry} onChange={(e) => update("industry", e.target.value)} placeholder="Manufacturing" /></div>
          <div className="space-y-2"><Label>Employee Count</Label><Input type="number" value={inputs.employee_count} onChange={(e) => update("employee_count", e.target.value)} placeholder="25" /></div>
          <div className="space-y-2"><Label>Annual Revenue ($)</Label><Input type="number" value={inputs.annual_revenue} onChange={(e) => update("annual_revenue", e.target.value)} placeholder="3,000,000" /></div>
        </div>
        <Button className="w-full" onClick={analyze} disabled={loading}>{loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}Run AI Integration Plan</Button>
      </CardContent></Card>
      {result && (<Card className="border-primary/20"><CardHeader><CardTitle className="flex items-center gap-2 text-sm"><Sparkles className="h-4 w-4 text-primary" />AI Integration Plan</CardTitle></CardHeader><CardContent><div className="whitespace-pre-wrap text-sm text-muted-foreground">{typeof result.analysis === "string" ? result.analysis : JSON.stringify(result, null, 2)}</div></CardContent></Card>)}
      <div className="space-y-6">
        {PHASES.map((phase) => { const Icon = phase.icon; return (
          <Card key={phase.title} className="border-border/50"><CardHeader><CardTitle className="flex items-center gap-2 text-base"><Icon className={`h-5 w-5 ${phase.color}`} />{phase.title}</CardTitle></CardHeader><CardContent><div className="space-y-2">{phase.items.map((item, i) => (<div key={i} className="flex items-start gap-3 rounded-lg border border-border/30 p-3"><Clock className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" /><p className="text-sm">{item}</p></div>))}</div></CardContent></Card>
        ); })}
      </div>
    </div>
  );
}
