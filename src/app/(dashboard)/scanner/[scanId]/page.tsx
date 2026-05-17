"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import {
  ArrowLeft,
  Download,
  Loader2,
  MapPin,
  Phone,
  Star,
  Globe,
  Sparkles,
  CheckCircle2,
  ExternalLink,
  Users,
  FileText,
  RotateCw,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { getScanResults, importScanResults } from "@/actions/scanner";
import { useRealtime } from "@/lib/hooks/use-realtime";

export default function ScanDetailPage() {
  const params = useParams();
  const scanId = params.scanId as string;
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [importing, setImporting] = useState(false);
  const [enrichingIds, setEnrichingIds] = useState<Set<string>>(new Set());

  // Bulk enrichment state
  const [enrichmentProgress, setEnrichmentProgress] = useState<{
    total: number;
    completed: number;
    active: boolean;
  } | null>(null);

  // Realtime updates during bulk enrichment
  useRealtime({
    table: "scan_results",
    event: "UPDATE",
    filter: `scan_id=eq.${scanId}`,
    enabled: !!enrichmentProgress?.active,
    onUpdate: (payload: any) => {
      const updated = payload.new;
      setResults((prev) =>
        prev.map((r) => (r.id === updated.id ? { ...r, ...updated } : r))
      );
      if (updated.enrichment_data?.bulk_enriched) {
        setEnrichmentProgress((prev) =>
          prev ? { ...prev, completed: prev.completed + 1 } : prev
        );
      }
    },
  });

  useEffect(() => {
    async function load() {
      try {
        const data = await getScanResults(scanId);
        setResults(data);
      } catch {
        toast.error("Failed to load scan results");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [scanId]);

  async function startBulkEnrichment() {
    const unenrichedCount = results.filter(
      (r) => !r.enrichment_data?.bulk_enriched && !r.enrichment_data?.website_scraped
    ).length;
    if (unenrichedCount === 0) {
      toast.info("All results are already enriched");
      return;
    }
    setEnrichmentProgress({ total: unenrichedCount, completed: 0, active: true });
    try {
      const res = await fetch("/api/scanner/bulk-enrich", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ scanId }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Bulk enrichment failed");
      } else {
        toast.success(`Enriched ${data.enriched}/${data.total} businesses`);
      }
    } catch (e: any) {
      toast.error(e.message || "Bulk enrichment failed");
    } finally {
      setEnrichmentProgress((prev) => (prev ? { ...prev, active: false } : null));
    }
  }

  async function enrichResult(resultId: string) {
    setEnrichingIds((prev) => new Set(prev).add(resultId));
    try {
      const res = await fetch("/api/scanner/enrich", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resultId }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error); return; }
      setResults((prev) =>
        prev.map((r) => (r.id === resultId ? { ...r, contact_data: data.contact_data } : r))
      );
      toast.success("Contact info extracted");
    } catch { toast.error("Enrichment failed"); }
    finally {
      setEnrichingIds((prev) => { const n = new Set(prev); n.delete(resultId); return n; });
    }
  }

  async function handleImport() {
    const ids = Array.from(selectedIds);
    if (!ids.length) return;
    setImporting(true);
    try {
      const { imported, errors } = await importScanResults(ids);
      if (imported > 0) {
        toast.success(`Imported ${imported} businesses`);
        setResults((prev) => prev.map((r) => (ids.includes(r.id) ? { ...r, imported: true } : r)));
        setSelectedIds(new Set());
      }
      errors.forEach((e) => toast.error(e));
    } catch (e: any) { toast.error(e.message); }
    finally { setImporting(false); }
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  }

  const unenrichedCount = results.filter(
    (r) => !r.enrichment_data?.bulk_enriched && !r.enrichment_data?.website_scraped
  ).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/scanner" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-3 w-3" /> Back to Scanner
          </Link>
          <h1 className="mt-2 text-2xl font-bold tracking-tight">Scan Results</h1>
          <p className="text-sm text-muted-foreground">{results.length} businesses found</p>
        </div>
        <div className="flex items-center gap-2">
          {unenrichedCount > 0 && !enrichmentProgress?.active && (
            <Button variant="outline" size="sm" onClick={startBulkEnrichment}>
              <RotateCw className="mr-2 h-4 w-4" />
              Enrich All ({unenrichedCount})
            </Button>
          )}
          {selectedIds.size > 0 && (
            <Button size="sm" onClick={handleImport} disabled={importing}>
              {importing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
              Import {selectedIds.size} Selected
            </Button>
          )}
        </div>
      </div>

      {/* Enrichment Progress */}
      {enrichmentProgress && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium flex items-center gap-2">
                {enrichmentProgress.active ? (
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                )}
                {enrichmentProgress.active ? "Enriching contacts & public records..." : "Enrichment complete"}
              </span>
              <span className="text-xs text-muted-foreground">
                {enrichmentProgress.completed}/{enrichmentProgress.total}
              </span>
            </div>
            <Progress
              value={enrichmentProgress.total > 0 ? (enrichmentProgress.completed / enrichmentProgress.total) * 100 : 0}
            />
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        {results.map((result) => {
          const bd = result.business_data || {};
          const cd = result.contact_data || {};
          const ed = result.enrichment_data || {};
          const hasContact = cd.first_name || cd.email;
          const isEnriched = ed.bulk_enriched || ed.website_scraped;
          const enrichSources: string[] = ed.enrichment_sources || [];
          const hasPublicRecords = !!ed.public_records;

          return (
            <Card key={result.id} className="border-border/40">
              <CardContent className="flex items-start gap-3 p-4">
                <div className="pt-0.5">
                  {result.imported ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  ) : (
                    <Checkbox checked={selectedIds.has(result.id)} onCheckedChange={() => toggleSelect(result.id)} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-medium">{result.business_name}</h3>
                    <div className="flex items-center gap-2 shrink-0">
                      {result.icp_score !== null && (
                        <Badge variant={result.icp_score >= 70 ? "default" : "secondary"} className="text-[10px]">
                          ICP: {Math.round(result.icp_score)}
                        </Badge>
                      )}
                      {result.imported && <Badge variant="outline" className="text-[10px] text-emerald-500">Imported</Badge>}
                    </div>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    {bd.formatted_address && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{bd.formatted_address}</span>}
                    {(cd.phone || bd.phone) && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{cd.phone || bd.phone}</span>}
                    {bd.rating && <span className="flex items-center gap-1"><Star className="h-3 w-3 fill-amber-400 text-amber-400" />{bd.rating}</span>}
                    {bd.website && <a href={bd.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-primary hover:underline"><Globe className="h-3 w-3" />Website</a>}
                    {bd.google_maps_url && <a href={bd.google_maps_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-primary hover:underline"><ExternalLink className="h-3 w-3" />Maps</a>}
                  </div>
                  {result.ai_summary && <p className="mt-2 text-xs text-muted-foreground line-clamp-2">{result.ai_summary}</p>}

                  {/* Contact info + source badges */}
                  {hasContact && (
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      {cd.first_name && (
                        <Badge variant="outline" className="text-[10px] gap-1">
                          <Users className="h-2.5 w-2.5" />
                          {cd.title || "Owner"}: {cd.first_name} {cd.last_name || ""}
                        </Badge>
                      )}
                      {cd.email && <Badge variant="outline" className="text-[10px]">{cd.email}</Badge>}
                      {cd.linkedin_url && (
                        <a href={cd.linkedin_url} target="_blank" rel="noopener noreferrer">
                          <Badge variant="outline" className="text-[10px] text-blue-400 border-blue-400/50 hover:bg-blue-400/10">LinkedIn</Badge>
                        </a>
                      )}
                      {enrichSources.includes("website") && (
                        <Badge variant="outline" className="text-[10px] text-emerald-500 border-emerald-500/30">
                          <Globe className="mr-0.5 h-2.5 w-2.5" />Website
                        </Badge>
                      )}
                      {(enrichSources.includes("public_records") || hasPublicRecords) && (
                        <Badge variant="outline" className="text-[10px] text-blue-500 border-blue-500/30">
                          <FileText className="mr-0.5 h-2.5 w-2.5" />Public Records
                        </Badge>
                      )}
                      {enrichSources.includes("google_search") && (
                        <Badge variant="outline" className="text-[10px] text-orange-500 border-orange-500/30">
                          Google Search
                        </Badge>
                      )}
                      {cd.confidence && (
                        <Badge variant="outline" className={`text-[10px] ${cd.confidence === "high" ? "text-emerald-500 border-emerald-500/30" : cd.confidence === "medium" ? "text-amber-500 border-amber-500/30" : "text-muted-foreground"}`}>
                          {cd.confidence} confidence
                        </Badge>
                      )}
                    </div>
                  )}

                  {/* Public records officers fallback */}
                  {!hasContact && hasPublicRecords && ed.public_records?.officers?.length > 0 && (
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      {ed.public_records.officers.slice(0, 2).map((o: any, i: number) => (
                        <Badge key={i} variant="outline" className="text-[10px] gap-1">
                          <FileText className="h-2.5 w-2.5" />
                          {o.position}: {o.name}
                        </Badge>
                      ))}
                      <Badge variant="outline" className="text-[10px] text-blue-500 border-blue-500/30">Public Records</Badge>
                    </div>
                  )}

                  {/* Retry enrich for failed/unenriched */}
                  {!isEnriched && !enrichmentProgress?.active && bd.website && !result.imported && (
                    <Button variant="ghost" size="sm" className="mt-2 h-6 text-[10px]" onClick={() => enrichResult(result.id)} disabled={enrichingIds.has(result.id)}>
                      {enrichingIds.has(result.id) ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Sparkles className="mr-1 h-3 w-3" />}
                      Extract Contact Info
                    </Button>
                  )}

                  {enrichmentProgress?.active && !isEnriched && (
                    <span className="mt-2 inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                      <Loader2 className="h-2.5 w-2.5 animate-spin" />
                      Pending enrichment...
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
