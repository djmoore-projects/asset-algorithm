"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Loader2, Sparkles } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { DealSelector } from "@/components/advisory/deal-selector";

const DEFAULT_INPUTS = {
  purchase_price: "", ebitda: "", revenue: "", down_payment_pct: "10",
  sba_loan_pct: "75", seller_note_pct: "15", sba_rate: "11.5",
  sba_term: "10", seller_rate: "6", seller_term: "5",
};

export default function FinancingPage() {
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
      ebitda: deal.companies?.ebitda ? String(deal.companies.ebitda / 100) : p.ebitda,
      revenue: deal.companies?.revenue ? String(deal.companies.revenue / 100) : p.revenue,
    }));
  }

  function handleDealClear() {
    setSelectedDealId(null);
    setInputs(DEFAULT_INPUTS);
  }

  async function analyze() {
    if (!inputs.purchase_price || !inputs.ebitda) { toast.error("Purchase price and EBITDA required"); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/ai/analyze", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "financing", data: inputs }) });
      setResult(await res.json());
    } catch { toast.error("Analysis failed"); }
    setLoading(false);
  }

  const pp = parseFloat(inputs.purchase_price) || 0;
  const dp = pp * (parseFloat(inputs.down_payment_pct) / 100);
  const sba = pp * (parseFloat(inputs.sba_loan_pct) / 100);
  const seller = pp * (parseFloat(inputs.seller_note_pct) / 100);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link href="/advisory" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"><ArrowLeft className="h-3 w-3" /> Back to Advisory</Link>
      <div><h1 className="text-2xl font-bold tracking-tight">Financing Analyzer</h1><p className="text-sm text-muted-foreground">Model SBA 7(a), seller financing, and equity structures</p></div>
      <DealSelector onSelect={handleDealSelect} onClear={handleDealClear} selectedDealId={selectedDealId} />
      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-6">
          <Card className="border-border/50"><CardHeader><CardTitle className="text-sm">Deal Metrics</CardTitle></CardHeader><CardContent className="space-y-4">
            <div className="space-y-2"><Label>Purchase Price ($)</Label><Input type="number" value={inputs.purchase_price} onChange={(e) => update("purchase_price", e.target.value)} placeholder="2,500,000" /></div>
            <div className="space-y-2"><Label>Annual EBITDA ($)</Label><Input type="number" value={inputs.ebitda} onChange={(e) => update("ebitda", e.target.value)} placeholder="500,000" /></div>
            <div className="space-y-2"><Label>Annual Revenue ($)</Label><Input type="number" value={inputs.revenue} onChange={(e) => update("revenue", e.target.value)} placeholder="3,000,000" /></div>
          </CardContent></Card>
          <Card className="border-border/50"><CardHeader><CardTitle className="text-sm">Capital Structure (%)</CardTitle></CardHeader><CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2"><Label>Down Payment</Label><Input type="number" value={inputs.down_payment_pct} onChange={(e) => update("down_payment_pct", e.target.value)} /></div>
              <div className="space-y-2"><Label>SBA Loan</Label><Input type="number" value={inputs.sba_loan_pct} onChange={(e) => update("sba_loan_pct", e.target.value)} /></div>
              <div className="space-y-2"><Label>Seller Note</Label><Input type="number" value={inputs.seller_note_pct} onChange={(e) => update("seller_note_pct", e.target.value)} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>SBA Rate (%)</Label><Input type="number" value={inputs.sba_rate} onChange={(e) => update("sba_rate", e.target.value)} /></div>
              <div className="space-y-2"><Label>SBA Term (yrs)</Label><Input type="number" value={inputs.sba_term} onChange={(e) => update("sba_term", e.target.value)} /></div>
              <div className="space-y-2"><Label>Seller Rate (%)</Label><Input type="number" value={inputs.seller_rate} onChange={(e) => update("seller_rate", e.target.value)} /></div>
              <div className="space-y-2"><Label>Seller Term (yrs)</Label><Input type="number" value={inputs.seller_term} onChange={(e) => update("seller_term", e.target.value)} /></div>
            </div>
          </CardContent></Card>
          <Button className="w-full" onClick={analyze} disabled={loading}>{loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}Run AI Financing Analysis</Button>
        </div>
        <div className="space-y-6">
          <Card className="border-border/50"><CardHeader><CardTitle className="text-sm">Capital Stack Preview</CardTitle></CardHeader><CardContent className="space-y-3">
            {[{ label: "Equity / Down Payment", amount: dp, color: "bg-green-500", pct: inputs.down_payment_pct }, { label: "SBA 7(a) Loan", amount: sba, color: "bg-blue-500", pct: inputs.sba_loan_pct }, { label: "Seller Note", amount: seller, color: "bg-yellow-500", pct: inputs.seller_note_pct }].map((item) => (
              <div key={item.label}><div className="flex items-center justify-between text-sm"><span>{item.label}</span><span className="font-medium">${item.amount.toLocaleString()}</span></div><div className="mt-1 h-2 overflow-hidden rounded-full bg-muted"><div className={`h-full rounded-full ${item.color}`} style={{ width: `${item.pct}%` }} /></div></div>
            ))}
            <div className="border-t pt-2"><div className="flex items-center justify-between text-sm font-medium"><span>Total</span><span>${pp.toLocaleString()}</span></div>{parseFloat(inputs.ebitda) > 0 && <p className="text-xs text-muted-foreground">{(pp / parseFloat(inputs.ebitda)).toFixed(1)}x EBITDA Multiple</p>}</div>
          </CardContent></Card>
          {result && (<Card className="border-primary/20"><CardHeader><CardTitle className="flex items-center gap-2 text-sm"><Sparkles className="h-4 w-4 text-primary" />AI Analysis</CardTitle></CardHeader><CardContent><div className="whitespace-pre-wrap text-sm text-muted-foreground">{typeof result.analysis === "string" ? result.analysis : JSON.stringify(result, null, 2)}</div></CardContent></Card>)}
        </div>
      </div>
    </div>
  );
}
