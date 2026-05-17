"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Loader2, Sparkles } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { DealSelector } from "@/components/advisory/deal-selector";

const INDUSTRY_OPTIONS = ["manufacturing","services","technology","healthcare","construction","retail","food_beverage","logistics","other"];

const DEFAULT_INPUTS = {
  revenue: "", ebitda: "", net_income: "", total_assets: "",
  industry: "manufacturing", growth_rate: "5",
  ebitda_multiple_low: "3", ebitda_multiple_high: "5",
};

function mapIndustry(industry: string | null): string {
  if (!industry) return "other";
  const lower = industry.toLowerCase();
  const match = INDUSTRY_OPTIONS.find((opt) => lower.includes(opt.replace("_", " ")) || opt.includes(lower));
  return match || "other";
}

export default function ValuationPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [selectedDealId, setSelectedDealId] = useState<string | null>(null);
  const [inputs, setInputs] = useState(DEFAULT_INPUTS);
  function update(key: string, value: string) { setInputs((p) => ({ ...p, [key]: value })); }

  function handleDealSelect(deal: any) {
    setSelectedDealId(deal.id);
    setInputs((p) => ({
      ...p,
      revenue: deal.companies?.revenue ? String(deal.companies.revenue / 100) : p.revenue,
      ebitda: deal.companies?.ebitda ? String(deal.companies.ebitda / 100) : p.ebitda,
      industry: mapIndustry(deal.companies?.industry),
    }));
  }

  function handleDealClear() {
    setSelectedDealId(null);
    setInputs(DEFAULT_INPUTS);
  }

  async function analyze() {
    if (!inputs.revenue || !inputs.ebitda) { toast.error("Revenue and EBITDA required"); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/ai/analyze", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "valuation", data: inputs }) });
      setResult(await res.json());
    } catch { toast.error("Analysis failed"); }
    setLoading(false);
  }

  const ebitda = parseFloat(inputs.ebitda) || 0;
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link href="/advisory" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"><ArrowLeft className="h-3 w-3" /> Back to Advisory</Link>
      <div><h1 className="text-2xl font-bold tracking-tight">Valuation Models</h1><p className="text-sm text-muted-foreground">Multi-method valuation with AI-powered comparable analysis</p></div>
      <DealSelector onSelect={handleDealSelect} onClear={handleDealClear} selectedDealId={selectedDealId} />
      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-6">
          <Card className="border-border/50"><CardHeader><CardTitle className="text-sm">Financial Inputs</CardTitle></CardHeader><CardContent className="space-y-4">
            <div className="space-y-2"><Label>Annual Revenue ($)</Label><Input type="number" value={inputs.revenue} onChange={(e) => update("revenue", e.target.value)} /></div>
            <div className="space-y-2"><Label>EBITDA ($)</Label><Input type="number" value={inputs.ebitda} onChange={(e) => update("ebitda", e.target.value)} /></div>
            <div className="space-y-2"><Label>Net Income ($)</Label><Input type="number" value={inputs.net_income} onChange={(e) => update("net_income", e.target.value)} /></div>
            <div className="space-y-2"><Label>Total Assets ($)</Label><Input type="number" value={inputs.total_assets} onChange={(e) => update("total_assets", e.target.value)} /></div>
            <div className="space-y-2"><Label>Growth Rate (%)</Label><Input type="number" value={inputs.growth_rate} onChange={(e) => update("growth_rate", e.target.value)} /></div>
            <div className="space-y-2"><Label>Industry</Label><Select value={inputs.industry} onValueChange={(v) => update("industry", v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{INDUSTRY_OPTIONS.map((i) => (<SelectItem key={i} value={i}>{i.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase())}</SelectItem>))}</SelectContent></Select></div>
          </CardContent></Card>
          <Button className="w-full" onClick={analyze} disabled={loading}>{loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}Run AI Valuation</Button>
        </div>
        <div className="space-y-6">
          <Card className="border-border/50"><CardHeader><CardTitle className="text-sm">Quick Estimates</CardTitle></CardHeader><CardContent className="space-y-4">
            <div><p className="text-xs text-muted-foreground">EBITDA Multiple ({inputs.ebitda_multiple_low}x - {inputs.ebitda_multiple_high}x)</p><p className="text-lg font-bold">${(ebitda * parseFloat(inputs.ebitda_multiple_low)).toLocaleString()} — ${(ebitda * parseFloat(inputs.ebitda_multiple_high)).toLocaleString()}</p></div>
            {ebitda > 0 && <div><p className="text-xs text-muted-foreground">EBITDA Margin</p><p className="text-lg font-bold">{((ebitda / (parseFloat(inputs.revenue) || 1)) * 100).toFixed(1)}%</p></div>}
          </CardContent></Card>
          {result && (<Card className="border-primary/20"><CardHeader><CardTitle className="flex items-center gap-2 text-sm"><Sparkles className="h-4 w-4 text-primary" />AI Valuation</CardTitle></CardHeader><CardContent><div className="whitespace-pre-wrap text-sm text-muted-foreground">{typeof result.analysis === "string" ? result.analysis : JSON.stringify(result, null, 2)}</div></CardContent></Card>)}
        </div>
      </div>
    </div>
  );
}
