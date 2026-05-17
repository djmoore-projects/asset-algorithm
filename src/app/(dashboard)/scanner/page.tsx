"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Radar,
  Search,
  Loader2,
  Download,
  Globe,
  Phone,
  Star,
  MapPin,
  ExternalLink,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Users,
  FileText,
  RotateCw,
} from "lucide-react";
import { toast } from "sonner";
import { getScans, importScanResults, deleteScan } from "@/actions/scanner";
import { getICPConfig } from "@/actions/profile";
import { useRealtime } from "@/lib/hooks/use-realtime";

interface ScanResult {
  id: string;
  business_name: string;
  business_data: any;
  contact_data: any;
  enrichment_data: any;
  icp_score: number | null;
  ai_summary: string | null;
  imported: boolean;
  created_at: string;
}

interface Scan {
  id: string;
  name: string;
  criteria: any;
  status: string;
  results_count: number;
  imported_count: number;
  created_at: string;
}

export default function ScannerPage() {
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState("");
  const [maxResults, setMaxResults] = useState("20");
  const [minRating, setMinRating] = useState("0");
  const [scanning, setScanning] = useState(false);
  const [results, setResults] = useState<ScanResult[]>([]);
  const [currentScanId, setCurrentScanId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [importing, setImporting] = useState(false);
  const [enrichingIds, setEnrichingIds] = useState<Set<string>>(new Set());
  const [scanHistory, setScanHistory] = useState<Scan[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [apiStatus, setApiStatus] = useState<{
    google_places_configured: boolean;
    anthropic_configured: boolean;
    hunter_configured: boolean;
    apollo_configured: boolean;
    public_records_available: boolean;
  } | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Bulk enrichment state
  const [enrichmentProgress, setEnrichmentProgress] = useState<{
    total: number;
    completed: number;
    active: boolean;
    scanId: string;
  } | null>(null);

  // Realtime: listen for scan_results updates during bulk enrichment
  useRealtime({
    table: "scan_results",
    event: "UPDATE",
    filter: currentScanId ? `scan_id=eq.${currentScanId}` : undefined,
    enabled: !!enrichmentProgress?.active && !!currentScanId,
    onUpdate: (payload: any) => {
      const updated = payload.new;
      // Update the result in the results array
      setResults((prev) =>
        prev.map((r) => (r.id === updated.id ? { ...r, ...updated } : r))
      );
      // Update progress counter if this result was just enriched
      if (updated.enrichment_data?.bulk_enriched) {
        setEnrichmentProgress((prev) =>
          prev ? { ...prev, completed: prev.completed + 1 } : prev
        );
      }
    },
  });

  // Check API status on mount
  useEffect(() => {
    fetch("/api/scanner/status")
      .then((r) => r.json())
      .then(setApiStatus)
      .catch(() => {});
    loadHistory();
  }, []);

  const loadHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const scans = await getScans();
      setScanHistory(scans as unknown as Scan[]);
    } catch {}
    setLoadingHistory(false);
  }, []);

  async function loadFromICP() {
    try {
      const raw = await getICPConfig();
      const config = raw as { industries?: string[]; locations?: string[]; [key: string]: unknown } | null;
      if (config) {
        if (config.industries?.length) setQuery(config.industries[0]);
        if (config.locations?.length) setLocation(config.locations[0]);
        toast.success("Loaded criteria from ICP settings");
      } else {
        toast.error("No ICP config found. Set it up in Settings → ICP.");
      }
    } catch {
      toast.error("Could not load ICP config");
    }
  }

  async function startBulkEnrichment(scanId: string, total: number) {
    setEnrichmentProgress({ total, completed: 0, active: true, scanId });
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
        setEnrichmentProgress((prev) =>
          prev ? { ...prev, active: false } : null
        );
      } else {
        const msg =
          data.status === "partially_enriched"
            ? `Enriched ${data.enriched}/${data.total} (timed out — click Enrich All to continue)`
            : `Enriched ${data.enriched} businesses with contacts & public records`;
        toast.success(msg);
        setEnrichmentProgress((prev) =>
          prev ? { ...prev, active: false, completed: data.enriched ?? prev.total } : null
        );
        loadHistory();
      }
    } catch (e: any) {
      toast.error(e.message || "Bulk enrichment failed");
      setEnrichmentProgress((prev) =>
        prev ? { ...prev, active: false } : null
      );
    }
  }

  async function startScan() {
    if (!query.trim() || !location.trim()) {
      toast.error("Enter a business type and location");
      return;
    }
    setScanning(true);
    setResults([]);
    setSelectedIds(new Set());
    setCurrentScanId(null);
    setEnrichmentProgress(null);

    try {
      const res = await fetch("/api/scanner/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: query.trim(),
          location: location.trim(),
          max_results: parseInt(maxResults),
          min_rating: parseFloat(minRating) || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (data.setup_required) {
          toast.error("Google Places API key not configured. Add GOOGLE_PLACES_API_KEY to your .env.local file.");
        } else {
          toast.error(data.error || "Scan failed");
        }
        return;
      }

      setResults(data.results || []);
      setCurrentScanId(data.scan_id);
      toast.success(`Found ${data.total} businesses — enriching contacts...`);
      loadHistory();

      // Auto-trigger bulk enrichment
      if (data.total > 0 && data.scan_id) {
        startBulkEnrichment(data.scan_id, data.total);
      }
    } catch (e: any) {
      toast.error(e.message || "Scan failed");
    } finally {
      setScanning(false);
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
      if (!res.ok) {
        toast.error(data.error || "Enrichment failed");
        return;
      }
      setResults((prev) =>
        prev.map((r) =>
          r.id === resultId ? { ...r, contact_data: data.contact_data } : r
        )
      );
      toast.success("Contact info extracted");
    } catch {
      toast.error("Enrichment failed");
    } finally {
      setEnrichingIds((prev) => {
        const next = new Set(prev);
        next.delete(resultId);
        return next;
      });
    }
  }

  async function handleImport() {
    const ids = Array.from(selectedIds);
    if (!ids.length) {
      toast.error("Select businesses to import");
      return;
    }
    setImporting(true);
    try {
      const { imported, errors } = await importScanResults(ids);
      if (imported > 0) {
        toast.success(`Imported ${imported} businesses into Sourcing`);
        setResults((prev) =>
          prev.map((r) => (ids.includes(r.id) ? { ...r, imported: true } : r))
        );
        setSelectedIds(new Set());
        loadHistory();
      }
      if (errors.length) {
        errors.forEach((e) => toast.error(e));
      }
    } catch (e: any) {
      toast.error(e.message || "Import failed");
    } finally {
      setImporting(false);
    }
  }

  async function loadScanResults(scanId: string) {
    setScanning(true);
    try {
      const { getScanResults } = await import("@/actions/scanner");
      const data = await getScanResults(scanId);
      setResults(data);
      setCurrentScanId(scanId);
      setSelectedIds(new Set());
      setEnrichmentProgress(null);
      toast.success(`Loaded ${data.length} results`);
    } catch {
      toast.error("Failed to load scan results");
    } finally {
      setScanning(false);
    }
  }

  async function handleDeleteScan(scanId: string) {
    try {
      await deleteScan(scanId);
      setScanHistory((prev) => prev.filter((s) => s.id !== scanId));
      if (currentScanId === scanId) {
        setResults([]);
        setCurrentScanId(null);
        setEnrichmentProgress(null);
      }
      toast.success("Scan deleted");
    } catch {
      toast.error("Failed to delete scan");
    }
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    const importable = results.filter((r) => !r.imported);
    if (selectedIds.size === importable.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(importable.map((r) => r.id)));
    }
  }

  const importableCount = results.filter((r) => !r.imported).length;
  const unenrichedCount = results.filter(
    (r) => !r.enrichment_data?.bulk_enriched && !r.enrichment_data?.website_scraped
  ).length;

  // Show setup required message
  if (apiStatus && !apiStatus.google_places_configured) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Business Scanner</h1>
          <p className="text-sm text-muted-foreground">
            Discover acquisition targets automatically
          </p>
        </div>
        <Card className="border-amber-500/50 bg-amber-500/5">
          <CardContent className="flex items-start gap-4 p-6">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
            <div className="space-y-3">
              <h3 className="font-semibold">Google Places API Key Required</h3>
              <p className="text-sm text-muted-foreground">
                The scanner uses Google Places API to find businesses. Set up your API key to get started:
              </p>
              <ol className="list-decimal space-y-1 pl-4 text-sm text-muted-foreground">
                <li>Go to <span className="font-mono text-xs">console.cloud.google.com</span></li>
                <li>Create a project (or select existing)</li>
                <li>Enable the <strong>Places API (New)</strong></li>
                <li>Create an API key under Credentials</li>
                <li>Add <span className="font-mono text-xs">GOOGLE_PLACES_API_KEY=your_key</span> to your <span className="font-mono text-xs">.env.local</span> file</li>
                <li>Restart the dev server</li>
              </ol>
              <p className="text-xs text-muted-foreground">
                Google provides $200/month free credit (~5,000 searches).
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Business Scanner</h1>
          <p className="text-sm text-muted-foreground">
            Find acquisition targets using Google Places, Hunter.io & Apollo.io
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {!apiStatus?.hunter_configured && !apiStatus?.apollo_configured && (
            <Badge variant="outline" className="gap-1 text-amber-500 border-amber-500/50">
              <AlertCircle className="h-3 w-3" />
              Add HUNTER_API_KEY + APOLLO_API_KEY for contacts
            </Badge>
          )}
          {!apiStatus?.anthropic_configured && (
            <Badge variant="outline" className="gap-1 text-amber-500 border-amber-500/50">
              <AlertCircle className="h-3 w-3" />
              Add ANTHROPIC_API_KEY for AI scoring
            </Badge>
          )}
        </div>
      </div>

      {/* Scan Configuration */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <Radar className="h-4 w-4 text-primary" />
            Scan Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Business Type / Industry</Label>
              <Input
                placeholder="e.g., plumbing contractors, HVAC companies, dental practices"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && startScan()}
              />
            </div>
            <div className="space-y-2">
              <Label>Location</Label>
              <Input
                placeholder="e.g., Austin TX, Tampa FL, Denver CO"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && startScan()}
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label>Max Results</Label>
              <Select value={maxResults} onValueChange={setMaxResults}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20 (default)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Min Rating</Label>
              <Select value={minRating} onValueChange={setMinRating}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Any</SelectItem>
                  <SelectItem value="3">3.0+</SelectItem>
                  <SelectItem value="3.5">3.5+</SelectItem>
                  <SelectItem value="4">4.0+</SelectItem>
                  <SelectItem value="4.5">4.5+</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end gap-2">
              <Button variant="outline" size="sm" onClick={loadFromICP} className="text-xs">
                <Sparkles className="mr-1 h-3 w-3" />
                Load from ICP
              </Button>
            </div>
          </div>
          <Button onClick={startScan} disabled={scanning} className="w-full sm:w-auto">
            {scanning ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Search className="mr-2 h-4 w-4" />
            )}
            {scanning ? "Scanning..." : "Start Scan"}
          </Button>
        </CardContent>
      </Card>

      {/* Enrichment Progress Bar */}
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
                {enrichmentProgress.active
                  ? "Enriching contacts & public records..."
                  : "Enrichment complete"}
              </span>
              <span className="text-xs text-muted-foreground">
                {enrichmentProgress.completed}/{enrichmentProgress.total} businesses
              </span>
            </div>
            <Progress
              value={
                enrichmentProgress.total > 0
                  ? (enrichmentProgress.completed / enrichmentProgress.total) * 100
                  : 0
              }
            />
            {enrichmentProgress.active && (
              <p className="mt-2 text-[10px] text-muted-foreground">
                Scraping websites, checking public records (OpenCorporates), and using AI to extract owner info...
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {results.length > 0 && (
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">
                Scan Results ({results.length})
              </CardTitle>
              <div className="flex items-center gap-2">
                {/* Enrich All button for results that weren't auto-enriched */}
                {unenrichedCount > 0 && !enrichmentProgress?.active && currentScanId && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => startBulkEnrichment(currentScanId!, unenrichedCount)}
                    className="h-7 text-xs"
                  >
                    <RotateCw className="mr-1 h-3 w-3" />
                    Enrich {unenrichedCount} Remaining
                  </Button>
                )}
                {selectedIds.size > 0 && (
                  <Button
                    size="sm"
                    onClick={handleImport}
                    disabled={importing}
                    className="h-7 text-xs"
                  >
                    {importing ? (
                      <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                    ) : (
                      <Download className="mr-1 h-3 w-3" />
                    )}
                    Import {selectedIds.size} Selected
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Select all row */}
            <div className="mb-3 flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2">
              <Checkbox
                checked={importableCount > 0 && selectedIds.size === importableCount}
                onCheckedChange={toggleSelectAll}
              />
              <span className="text-xs text-muted-foreground">
                Select all ({importableCount} importable)
              </span>
            </div>

            <div className="space-y-2">
              {results.map((result) => {
                const bd = result.business_data || {};
                const cd = result.contact_data || {};
                const ed = result.enrichment_data || {};
                const hasContactInfo = cd.first_name || cd.email;
                const isEnriched = ed.bulk_enriched || ed.website_scraped;
                const enrichSources: string[] = ed.enrichment_sources || [];
                const hasPublicRecords = !!ed.public_records;

                return (
                  <div
                    key={result.id}
                    className="flex items-start gap-3 rounded-lg border border-border/40 bg-background p-3 transition-colors hover:bg-muted/30"
                  >
                    <div className="pt-0.5">
                      {result.imported ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      ) : (
                        <Checkbox
                          checked={selectedIds.has(result.id)}
                          onCheckedChange={() => toggleSelect(result.id)}
                        />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="text-sm font-medium">{result.business_name}</h3>
                          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                            {bd.formatted_address && (
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {bd.formatted_address}
                              </span>
                            )}
                            {(cd.phone || bd.phone) && (
                              <span className="flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                {cd.phone || bd.phone}
                              </span>
                            )}
                            {bd.rating && (
                              <span className="flex items-center gap-1">
                                <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                                {bd.rating} ({bd.review_count || 0})
                              </span>
                            )}
                            {bd.website && (
                              <a
                                href={bd.website}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 text-primary hover:underline"
                              >
                                <Globe className="h-3 w-3" />
                                Website
                              </a>
                            )}
                            {bd.google_maps_url && (
                              <a
                                href={bd.google_maps_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 text-primary hover:underline"
                              >
                                <ExternalLink className="h-3 w-3" />
                                Maps
                              </a>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {result.icp_score !== null && (
                            <Badge
                              variant={result.icp_score >= 70 ? "default" : result.icp_score >= 40 ? "secondary" : "outline"}
                              className="text-[10px]"
                            >
                              ICP: {Math.round(result.icp_score)}
                            </Badge>
                          )}
                          {result.imported && (
                            <Badge variant="outline" className="text-[10px] text-emerald-500 border-emerald-500/50">
                              Imported
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* AI Summary */}
                      {result.ai_summary && (
                        <p className="mt-2 text-xs text-muted-foreground line-clamp-2">
                          {result.ai_summary}
                        </p>
                      )}

                      {/* Contact info + source badges */}
                      {hasContactInfo && (
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          {cd.first_name && (
                            <Badge variant="outline" className="text-[10px] gap-1">
                              <Users className="h-2.5 w-2.5" />
                              {cd.title || "Owner"}: {cd.first_name} {cd.last_name || ""}
                            </Badge>
                          )}
                          {cd.email && (
                            <Badge variant="outline" className="text-[10px]">
                              {cd.email}
                            </Badge>
                          )}
                          {cd.linkedin_url && (
                            <a href={cd.linkedin_url} target="_blank" rel="noopener noreferrer">
                              <Badge variant="outline" className="text-[10px] text-blue-400 border-blue-400/50 hover:bg-blue-400/10">
                                LinkedIn
                              </Badge>
                            </a>
                          )}
                          {/* Source badges */}
                          {enrichSources.includes("hunter") && (
                            <Badge variant="outline" className="text-[10px] text-orange-500 border-orange-500/30">
                              Hunter.io
                            </Badge>
                          )}
                          {enrichSources.includes("apollo") && (
                            <Badge variant="outline" className="text-[10px] text-purple-500 border-purple-500/30">
                              Apollo
                            </Badge>
                          )}
                          {enrichSources.includes("website") && (
                            <Badge variant="outline" className="text-[10px] text-emerald-500 border-emerald-500/30">
                              <Globe className="mr-0.5 h-2.5 w-2.5" />
                              Website
                            </Badge>
                          )}
                          {(enrichSources.includes("public_records") || hasPublicRecords) && (
                            <Badge variant="outline" className="text-[10px] text-blue-500 border-blue-500/30">
                              <FileText className="mr-0.5 h-2.5 w-2.5" />
                              Public Records
                            </Badge>
                          )}
                          {enrichSources.includes("google_search") && (
                            <Badge variant="outline" className="text-[10px] text-yellow-500 border-yellow-500/30">
                              <Search className="mr-0.5 h-2.5 w-2.5" />
                              Google Search
                            </Badge>
                          )}
                          {cd.confidence && (
                            <Badge
                              variant="outline"
                              className={`text-[10px] ${
                                cd.confidence === "high"
                                  ? "text-emerald-500 border-emerald-500/30"
                                  : cd.confidence === "medium"
                                  ? "text-amber-500 border-amber-500/30"
                                  : "text-muted-foreground"
                              }`}
                            >
                              {cd.confidence} confidence
                            </Badge>
                          )}
                        </div>
                      )}

                      {/* Public records officers (if no contact extracted but officers found) */}
                      {!hasContactInfo && hasPublicRecords && ed.public_records?.officers?.length > 0 && (
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          {ed.public_records.officers.slice(0, 2).map((o: any, i: number) => (
                            <Badge key={i} variant="outline" className="text-[10px] gap-1">
                              <FileText className="h-2.5 w-2.5" />
                              {o.position}: {o.name}
                            </Badge>
                          ))}
                          <Badge variant="outline" className="text-[10px] text-blue-500 border-blue-500/30">
                            Public Records
                          </Badge>
                        </div>
                      )}

                      {/* Enrich button — show as retry for failed/unenriched results */}
                      {!isEnriched && !enrichmentProgress?.active && bd.website && !result.imported && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="mt-2 h-6 text-[10px]"
                          onClick={() => enrichResult(result.id)}
                          disabled={enrichingIds.has(result.id)}
                        >
                          {enrichingIds.has(result.id) ? (
                            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                          ) : (
                            <Sparkles className="mr-1 h-3 w-3" />
                          )}
                          Extract Contact Info
                        </Button>
                      )}

                      {/* Enriching indicator for this specific result during bulk enrichment */}
                      {enrichmentProgress?.active && !isEnriched && (
                        <span className="mt-2 inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                          <Loader2 className="h-2.5 w-2.5 animate-spin" />
                          Pending enrichment...
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Scan History */}
      <Card className="border-border/50">
        <CardHeader
          className="cursor-pointer pb-3"
          onClick={() => setShowHistory(!showHistory)}
        >
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold">
              Scan History ({scanHistory.length})
            </CardTitle>
            {showHistory ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
        </CardHeader>
        {showHistory && (
          <CardContent>
            {scanHistory.length === 0 ? (
              <p className="py-4 text-center text-xs text-muted-foreground">
                No previous scans
              </p>
            ) : (
              <div className="space-y-2">
                {scanHistory.map((scan) => (
                  <div
                    key={scan.id}
                    className="flex items-center justify-between rounded-lg border border-border/40 bg-background p-3"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{scan.name}</p>
                      <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                        <span>{new Date(scan.created_at).toLocaleDateString()}</span>
                        <span>{scan.results_count} results</span>
                        <span>{scan.imported_count} imported</span>
                        <Badge
                          variant={
                            scan.status === "completed"
                              ? "secondary"
                              : scan.status === "enriching"
                              ? "default"
                              : scan.status === "partially_enriched"
                              ? "outline"
                              : scan.status === "failed"
                              ? "destructive"
                              : "outline"
                          }
                          className="text-[10px]"
                        >
                          {scan.status === "partially_enriched" ? "partial" : scan.status}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => loadScanResults(scan.id)}
                      >
                        Load
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => handleDeleteScan(scan.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        )}
      </Card>
    </div>
  );
}
