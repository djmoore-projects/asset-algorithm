"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, ClipboardCheck, CheckCircle2, Circle, AlertTriangle, MinusCircle, Loader2, Sparkles } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { DealSelector } from "@/components/advisory/deal-selector";

const CATEGORIES = ["financial", "legal", "operational", "market", "team", "technology", "environmental"];
const STATUS_ICONS: Record<string, any> = { not_started: Circle, in_progress: MinusCircle, completed: CheckCircle2, flagged: AlertTriangle, na: MinusCircle };
const RISK_COLORS: Record<string, string> = { low: "bg-green-500/10 text-green-500", medium: "bg-primary/10 text-primary", high: "bg-primary/10 text-primary", critical: "bg-red-500/10 text-red-500" };

const DEFAULT_INPUTS = { deal_name: "", industry: "", asking_price: "", ebitda: "" };

export default function DiligencePage() {
  const [items] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [selectedDealId, setSelectedDealId] = useState<string | null>(null);
  const [inputs, setInputs] = useState(DEFAULT_INPUTS);
  function update(key: string, value: string) { setInputs((p) => ({ ...p, [key]: value })); }

  function handleDealSelect(deal: any) {
    setSelectedDealId(deal.id);
    setInputs((p) => ({
      ...p,
      deal_name: deal.title || p.deal_name,
      industry: deal.companies?.industry || p.industry,
      asking_price: deal.asking_price ? String(deal.asking_price / 100) : p.asking_price,
      ebitda: deal.companies?.ebitda ? String(deal.companies.ebitda / 100) : p.ebitda,
    }));
  }

  function handleDealClear() {
    setSelectedDealId(null);
    setInputs(DEFAULT_INPUTS);
  }

  async function analyze() {
    if (!inputs.deal_name || !inputs.industry) { toast.error("Deal name and industry required"); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/ai/analyze", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "diligence", data: inputs }) });
      setResult(await res.json());
    } catch { toast.error("Analysis failed"); }
    setLoading(false);
  }

  const filteredItems = selectedCategory === "all" ? items : items.filter((i) => i.category === selectedCategory);
  const grouped = filteredItems.reduce((acc: Record<string, any[]>, item) => { (acc[item.category] = acc[item.category] || []).push(item); return acc; }, {});
  const completionRate = items.length > 0 ? Math.round((items.filter((i) => i.status === "completed" || i.status === "na").length / items.length) * 100) : 0;
  const flaggedCount = items.filter((i) => i.status === "flagged").length;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link href="/advisory" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"><ArrowLeft className="h-3 w-3" /> Back to Advisory</Link>
      <div><h1 className="text-2xl font-bold tracking-tight">Due Diligence Tracker</h1><p className="text-sm text-muted-foreground">Comprehensive diligence checklist with AI risk analysis</p></div>
      <DealSelector onSelect={handleDealSelect} onClear={handleDealClear} selectedDealId={selectedDealId} />
      <Card className="border-border/50"><CardHeader><CardTitle className="text-sm">AI Risk Analysis</CardTitle></CardHeader><CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2"><Label>Deal Name</Label><Input value={inputs.deal_name} onChange={(e) => update("deal_name", e.target.value)} placeholder="Acme Corp Acquisition" /></div>
          <div className="space-y-2"><Label>Industry</Label><Input value={inputs.industry} onChange={(e) => update("industry", e.target.value)} placeholder="Manufacturing" /></div>
          <div className="space-y-2"><Label>Asking Price ($)</Label><Input type="number" value={inputs.asking_price} onChange={(e) => update("asking_price", e.target.value)} placeholder="2,500,000" /></div>
          <div className="space-y-2"><Label>EBITDA ($)</Label><Input type="number" value={inputs.ebitda} onChange={(e) => update("ebitda", e.target.value)} placeholder="500,000" /></div>
        </div>
        <Button className="w-full" onClick={analyze} disabled={loading}>{loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}Run AI Risk Analysis</Button>
      </CardContent></Card>
      {result && (<Card className="border-primary/20"><CardHeader><CardTitle className="flex items-center gap-2 text-sm"><Sparkles className="h-4 w-4 text-primary" />AI Risk Analysis</CardTitle></CardHeader><CardContent><div className="whitespace-pre-wrap text-sm text-muted-foreground">{typeof result.analysis === "string" ? result.analysis : JSON.stringify(result, null, 2)}</div></CardContent></Card>)}
      <div className="grid grid-cols-3 gap-4">
        <Card className="border-border/50"><CardContent className="p-4 text-center"><p className="text-2xl font-bold">{items.length}</p><p className="text-xs text-muted-foreground">Total Items</p></CardContent></Card>
        <Card className="border-border/50"><CardContent className="p-4 text-center"><p className="text-2xl font-bold">{completionRate}%</p><p className="text-xs text-muted-foreground">Complete</p></CardContent></Card>
        <Card className="border-border/50"><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-red-500">{flaggedCount}</p><p className="text-xs text-muted-foreground">Flagged</p></CardContent></Card>
      </div>
      <Select value={selectedCategory} onValueChange={setSelectedCategory}><SelectTrigger className="w-[180px]"><SelectValue placeholder="Category" /></SelectTrigger><SelectContent><SelectItem value="all">All Categories</SelectItem>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</SelectItem>)}</SelectContent></Select>
      {Object.keys(grouped).length === 0 ? (
        <Card className="border-border/50"><CardContent className="flex flex-col items-center justify-center py-12 text-center"><ClipboardCheck className="h-10 w-10 text-muted-foreground/50" /><p className="mt-3 text-sm font-medium">No diligence items</p><p className="mt-1 text-xs text-muted-foreground">Select a deal and generate a diligence checklist with AI</p></CardContent></Card>
      ) : (
        <div className="space-y-6">{Object.entries(grouped).map(([category, catItems]) => (
          <Card key={category} className="border-border/50"><CardHeader><CardTitle className="text-sm capitalize">{category}</CardTitle></CardHeader><CardContent className="space-y-2">
            {catItems.map((item: any) => { const StatusIcon = STATUS_ICONS[item.status] || Circle; return (
              <div key={item.id} className="flex items-start gap-3 rounded-lg border border-border/30 p-3"><StatusIcon className={`mt-0.5 h-4 w-4 shrink-0 ${item.status === "completed" ? "text-green-500" : item.status === "flagged" ? "text-red-500" : "text-muted-foreground"}`} /><div className="min-w-0 flex-1"><p className="text-sm font-medium">{item.item}</p>{item.notes && <p className="mt-1 text-xs text-muted-foreground">{item.notes}</p>}</div><Badge className={RISK_COLORS[item.risk_level] || ""}>{item.risk_level}</Badge></div>
            ); })}
          </CardContent></Card>
        ))}</div>
      )}
    </div>
  );
}
