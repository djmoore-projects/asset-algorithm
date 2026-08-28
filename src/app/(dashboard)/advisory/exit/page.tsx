"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Loader2, Sparkles, TrendingUp, Calendar, DollarSign } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { DealSelector } from "@/components/advisory/deal-selector";

const EXIT_TYPES = [
  { value: "strategic_sale", label: "Strategic Sale" }, { value: "financial_buyer", label: "Financial Buyer (PE)" },
  { value: "management_buyout", label: "Management Buyout" }, { value: "esop", label: "ESOP" },
  { value: "recapitalization", label: "Recapitalization" },
];

const DEFAULT_INPUTS = {
  current_ebitda: "", projected_ebitda: "", purchase_price: "",
  hold_period: "5", exit_type: "strategic_sale",
};

export default function ExitPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [selectedDealId, setSelectedDealId] = useState<string | null>(null);
  const [inputs, setInputs] = useState(DEFAULT_INPUTS);
  function update(key: string, value: string) { setInputs((p) => ({ ...p, [key]: value })); }

  function handleDealSelect(deal: any) {
    setSelectedDealId(deal.id);
    setInputs((p) => ({
      ...p,
      purchase_price: deal.asking_price ? String(deal.asking_price / 100) : p.purchase_price,
      current_ebitda: deal.companies?.ebitda ? String(deal.companies.ebitda / 100) : p.current_ebitda,
    }));
  }

  function handleDealClear() {
    setSelectedDealId(null);
    setInputs(DEFAULT_INPUTS);
  }

  async function analyze() {
    if (!inputs.current_ebitda) { toast.error("Current EBITDA required"); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/ai/analyze", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "exit", data: inputs }) });
      setResult(await res.json());
    } catch { toast.error("Analysis failed"); }
    setLoading(false);
  }

  const currentEbitda = parseFloat(inputs.current_ebitda) || 0;
  const projectedEbitda = parseFloat(inputs.projected_ebitda) || currentEbitda;
  const purchasePrice = parseFloat(inputs.purchase_price) || 0;
  const exitMultiple = 5;
  const projectedExitValue = projectedEbitda * exitMultiple;
  const moic = purchasePrice > 0 ? projectedExitValue / purchasePrice : 0;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link href="/advisory" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"><ArrowLeft className="h-3 w-3" /> Back to Advisory</Link>
      <div><h1 className="text-2xl font-bold tracking-tight">Exit Strategy</h1><p className="text-sm text-muted-foreground">Exit timing, buyer universe, and return modeling</p></div>
      <DealSelector onSelect={handleDealSelect} onClear={handleDealClear} selectedDealId={selectedDealId} />
      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-6">
          <Card className="border-border/50"><CardHeader><CardTitle className="text-sm">Current State</CardTitle></CardHeader><CardContent className="space-y-4">
            <div className="space-y-2"><Label>Current EBITDA ($)</Label><Input type="number" value={inputs.current_ebitda} onChange={(e) => update("current_ebitda", e.target.value)} /></div>
            <div className="space-y-2"><Label>Original Purchase Price ($)</Label><Input type="number" value={inputs.purchase_price} onChange={(e) => update("purchase_price", e.target.value)} /></div>
          </CardContent></Card>
          <Card className="border-border/50"><CardHeader><CardTitle className="text-sm">Exit Projections</CardTitle></CardHeader><CardContent className="space-y-4">
            <div className="space-y-2"><Label>Projected EBITDA at Exit ($)</Label><Input type="number" value={inputs.projected_ebitda} onChange={(e) => update("projected_ebitda", e.target.value)} /></div>
            <div className="space-y-2"><Label>Hold Period (years)</Label><Input type="number" value={inputs.hold_period} onChange={(e) => update("hold_period", e.target.value)} /></div>
            <div className="space-y-2"><Label>Exit Type</Label><Select value={inputs.exit_type} onValueChange={(v) => update("exit_type", v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{EXIT_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent></Select></div>
          </CardContent></Card>
          <Button className="w-full" onClick={analyze} disabled={loading}>{loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}Run AI Exit Analysis</Button>
        </div>
        <div className="space-y-6">
          <div className="grid grid-cols-3 gap-4">
            <Card className="border-border/50"><CardContent className="p-4 text-center"><DollarSign className="mx-auto h-5 w-5 text-green-500" /><p className="mt-1 text-lg font-bold">${(projectedExitValue / 1e6).toFixed(1)}M</p><p className="text-xs text-muted-foreground">Est. Exit Value</p></CardContent></Card>
            <Card className="border-border/50"><CardContent className="p-4 text-center"><TrendingUp className="mx-auto h-5 w-5 text-primary" /><p className="mt-1 text-lg font-bold">{moic.toFixed(1)}x</p><p className="text-xs text-muted-foreground">MOIC</p></CardContent></Card>
            <Card className="border-border/50"><CardContent className="p-4 text-center"><Calendar className="mx-auto h-5 w-5 text-primary" /><p className="mt-1 text-lg font-bold">{inputs.hold_period}yr</p><p className="text-xs text-muted-foreground">Hold Period</p></CardContent></Card>
          </div>
          {result && (<Card className="border-primary/20"><CardHeader><CardTitle className="flex items-center gap-2 text-sm"><Sparkles className="h-4 w-4 text-primary" />AI Exit Analysis</CardTitle></CardHeader><CardContent><div className="whitespace-pre-wrap text-sm text-muted-foreground">{typeof result.analysis === "string" ? result.analysis : JSON.stringify(result, null, 2)}</div></CardContent></Card>)}
        </div>
      </div>
    </div>
  );
}
