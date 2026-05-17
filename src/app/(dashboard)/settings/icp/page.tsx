"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Plus, X, Loader2 } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { saveICPConfig, getICPConfig } from "@/actions/profile";

export default function ICPPage() {
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState({
    industries: ["manufacturing", "business services"],
    revenue_min: "1000000", revenue_max: "10000000",
    ebitda_min: "200000", ebitda_max: "2000000",
    locations: ["TX", "FL", "GA"],
    employee_min: "10", employee_max: "100",
    keywords: ["recurring revenue", "owner-operated"],
  });
  const [newIndustry, setNewIndustry] = useState("");
  const [newLocation, setNewLocation] = useState("");
  const [newKeyword, setNewKeyword] = useState("");

  function addTo(field: "industries" | "locations" | "keywords", value: string) {
    if (!value.trim()) return;
    setConfig((p) => ({ ...p, [field]: [...p[field], value.trim()] }));
  }
  function removeFrom(field: "industries" | "locations" | "keywords", index: number) {
    setConfig((p) => ({ ...p, [field]: p[field].filter((_, i) => i !== index) }));
  }
  useEffect(() => {
    getICPConfig().then((saved) => {
      if (saved) setConfig((prev) => ({ ...prev, ...(saved as Record<string, unknown>) }));
    }).catch(() => {});
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      await saveICPConfig(config);
      toast.success("ICP configuration saved");
    } catch {
      toast.error("Failed to save ICP configuration");
    }
    setSaving(false);
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link href="/settings" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"><ArrowLeft className="h-3 w-3" /> Back to Settings</Link>
      <div><h1 className="text-2xl font-bold tracking-tight">Ideal Company Profile</h1><p className="text-sm text-muted-foreground">Define your target acquisition criteria for AI-powered lead scoring</p></div>
      <Card className="border-border/50"><CardHeader><CardTitle className="text-sm">Financial Criteria</CardTitle></CardHeader><CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4"><div className="space-y-2"><Label>Min Revenue ($)</Label><Input type="number" value={config.revenue_min} onChange={(e) => setConfig((p) => ({ ...p, revenue_min: e.target.value }))} /></div><div className="space-y-2"><Label>Max Revenue ($)</Label><Input type="number" value={config.revenue_max} onChange={(e) => setConfig((p) => ({ ...p, revenue_max: e.target.value }))} /></div></div>
        <div className="grid grid-cols-2 gap-4"><div className="space-y-2"><Label>Min EBITDA ($)</Label><Input type="number" value={config.ebitda_min} onChange={(e) => setConfig((p) => ({ ...p, ebitda_min: e.target.value }))} /></div><div className="space-y-2"><Label>Max EBITDA ($)</Label><Input type="number" value={config.ebitda_max} onChange={(e) => setConfig((p) => ({ ...p, ebitda_max: e.target.value }))} /></div></div>
        <div className="grid grid-cols-2 gap-4"><div className="space-y-2"><Label>Min Employees</Label><Input type="number" value={config.employee_min} onChange={(e) => setConfig((p) => ({ ...p, employee_min: e.target.value }))} /></div><div className="space-y-2"><Label>Max Employees</Label><Input type="number" value={config.employee_max} onChange={(e) => setConfig((p) => ({ ...p, employee_max: e.target.value }))} /></div></div>
      </CardContent></Card>
      <Card className="border-border/50"><CardHeader><CardTitle className="text-sm">Target Industries</CardTitle></CardHeader><CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2">{config.industries.map((ind, i) => <Badge key={i} variant="secondary" className="gap-1">{ind}<button onClick={() => removeFrom("industries", i)}><X className="h-3 w-3" /></button></Badge>)}</div>
        <div className="flex gap-2"><Input value={newIndustry} onChange={(e) => setNewIndustry(e.target.value)} placeholder="Add industry..." onKeyDown={(e) => { if (e.key === "Enter") { addTo("industries", newIndustry); setNewIndustry(""); } }} /><Button variant="outline" size="sm" onClick={() => { addTo("industries", newIndustry); setNewIndustry(""); }}><Plus className="h-4 w-4" /></Button></div>
      </CardContent></Card>
      <Card className="border-border/50"><CardHeader><CardTitle className="text-sm">Target Locations</CardTitle></CardHeader><CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2">{config.locations.map((loc, i) => <Badge key={i} variant="secondary" className="gap-1">{loc}<button onClick={() => removeFrom("locations", i)}><X className="h-3 w-3" /></button></Badge>)}</div>
        <div className="flex gap-2"><Input value={newLocation} onChange={(e) => setNewLocation(e.target.value)} placeholder="Add state..." onKeyDown={(e) => { if (e.key === "Enter") { addTo("locations", newLocation); setNewLocation(""); } }} /><Button variant="outline" size="sm" onClick={() => { addTo("locations", newLocation); setNewLocation(""); }}><Plus className="h-4 w-4" /></Button></div>
      </CardContent></Card>
      <Card className="border-border/50"><CardHeader><CardTitle className="text-sm">Keywords</CardTitle></CardHeader><CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2">{config.keywords.map((kw, i) => <Badge key={i} variant="default" className="gap-1">{kw}<button onClick={() => removeFrom("keywords", i)}><X className="h-3 w-3" /></button></Badge>)}</div>
        <div className="flex gap-2"><Input value={newKeyword} onChange={(e) => setNewKeyword(e.target.value)} placeholder="Add keyword..." onKeyDown={(e) => { if (e.key === "Enter") { addTo("keywords", newKeyword); setNewKeyword(""); } }} /><Button variant="outline" size="sm" onClick={() => { addTo("keywords", newKeyword); setNewKeyword(""); }}><Plus className="h-4 w-4" /></Button></div>
      </CardContent></Card>
      <Button className="w-full" onClick={handleSave} disabled={saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save ICP Configuration</Button>
    </div>
  );
}
