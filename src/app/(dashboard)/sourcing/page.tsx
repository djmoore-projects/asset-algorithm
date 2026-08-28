"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  CheckSquare,
  Download,
  Filter,
  Loader2,
  Plus,
  Search,
  Sparkles,
  Target,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/shared/empty-state";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { useCompanies, useDeleteCompany } from "@/lib/hooks/use-companies";
import { scoreCompanyICP, scoreCompaniesInBulk } from "@/actions/scoring";
import Link from "next/link";

type Company = any;

export default function SourcingPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [scoringId, setScoringId] = useState<string | null>(null);
  const [scoringAll, setScoringAll] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [singleDeleteTarget, setSingleDeleteTarget] = useState<Company | null>(null);
  const router = useRouter();

  const { data, isLoading: loading, refetch: fetchCompanies } = useCompanies({ search, status: statusFilter as any });
  const companies: Company[] = data?.companies || [];
  const deleteCompanyMutation = useDeleteCompany();

  async function handleAddCompany(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from("companies").insert({
      user_id: user.id,
      name: formData.get("name") as string,
      industry: formData.get("industry") as string || null,
      website: formData.get("website") as string || null,
      location_city: formData.get("city") as string || null,
      location_state: formData.get("state") as string || null,
      description: formData.get("description") as string || null,
      revenue_range: formData.get("revenue_range") as string || null,
    });

    if (error) {
      toast.error("Failed to add company");
    } else {
      toast.success("Company added");
      setShowAddDialog(false);
      fetchCompanies();
    }
  }

  async function handleScoreCompany(e: React.MouseEvent, companyId: string) {
    e.preventDefault();
    e.stopPropagation();
    setScoringId(companyId);
    try {
      const result = await scoreCompanyICP(companyId);
      if (result) {
        fetchCompanies();
        toast.success(`ICP Score: ${result.score}/100`);
      } else {
        toast.error("Could not score — check ICP config and API key");
      }
    } catch {
      toast.error("Failed to score company");
    } finally {
      setScoringId(null);
    }
  }

  async function handleScoreAll() {
    const unscored = companies.filter((c) => c.icp_score === null || c.icp_score === undefined);
    if (unscored.length === 0) {
      toast.info("All companies already scored");
      return;
    }
    setScoringAll(true);
    try {
      const results = await scoreCompaniesInBulk(unscored.map((c) => c.id));
      const scored = results.filter((r: any) => r.score !== undefined).length;
      fetchCompanies();
      toast.success(`Scored ${scored} of ${unscored.length} companies`);
    } catch {
      toast.error("Bulk scoring failed");
    } finally {
      setScoringAll(false);
    }
  }

  // Selection handlers
  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selectedIds.size === companies.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(companies.map((c) => c.id)));
    }
  }

  function exitSelectionMode() {
    setSelectionMode(false);
    setSelectedIds(new Set());
  }

  async function handleConfirmBulkDelete() {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    setDeleting(true);
    try {
      const results = await Promise.allSettled(ids.map((id) => deleteCompanyMutation.mutateAsync(id)));
      const failed = results.filter((r) => r.status === "rejected").length;

      if (failed > 0) {
        toast.error(`Failed to delete ${failed} company(ies)`);
      } else {
        toast.success(`Deleted ${ids.length} company(ies)`);
      }
    } catch {
      toast.error("Failed to delete companies");
    } finally {
      setDeleting(false);
      setShowBulkDeleteDialog(false);
      exitSelectionMode();
    }
  }

  async function handleConfirmSingleDelete() {
    if (!singleDeleteTarget) return;
    const target = singleDeleteTarget;
    setSingleDeleteTarget(null);
    try {
      await deleteCompanyMutation.mutateAsync(target.id);
      toast.success(`Deleted "${target.name}"`);
    } catch {
      toast.error("Failed to delete company");
    }
  }

  const statusColors: Record<string, string> = {
    new: "bg-muted text-muted-foreground",
    researching: "bg-primary/10 text-primary",
    qualified: "bg-emerald-500/10 text-emerald-500",
    contacted: "bg-primary/10 text-primary",
    disqualified: "bg-red-500/10 text-red-500",
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Deal Sourcing</h1>
          <p className="text-sm text-muted-foreground">
            {companies.length} companies in your pipeline
          </p>
        </div>
        <div className="flex items-center gap-2">
          {selectionMode ? (
            <>
              <div className="flex items-center gap-2 mr-2">
                <Checkbox
                  checked={companies.length > 0 && selectedIds.size === companies.length}
                  onCheckedChange={toggleSelectAll}
                />
                <span className="text-sm text-muted-foreground">Select All</span>
              </div>
              <Button variant="outline" size="sm" onClick={exitSelectionMode}>
                <X className="mr-2 h-3.5 w-3.5" />
                Cancel
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectionMode(true)}
                disabled={companies.length === 0}
              >
                <CheckSquare className="mr-2 h-3.5 w-3.5" />
                Select
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleScoreAll}
                disabled={scoringAll || companies.length === 0}
              >
                {scoringAll ? (
                  <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Sparkles className="mr-2 h-3.5 w-3.5" />
                )}
                Score All
              </Button>
              <Link href="/sourcing/import">
                <Button variant="outline" size="sm">
                  <Upload className="mr-2 h-3.5 w-3.5" />
                  Import CSV
                </Button>
              </Link>
            </>
          )}
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-2 h-3.5 w-3.5" />
                Add Company
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Company</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAddCompany} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Company Name *</Label>
                  <Input id="name" name="name" required placeholder="Acme Corp" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="industry">Industry</Label>
                    <Input id="industry" name="industry" placeholder="Manufacturing" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="revenue_range">Revenue Range</Label>
                    <Select name="revenue_range">
                      <SelectTrigger>
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="<$500K">{"<$500K"}</SelectItem>
                        <SelectItem value="$500K-$1M">$500K-$1M</SelectItem>
                        <SelectItem value="$1M-$3M">$1M-$3M</SelectItem>
                        <SelectItem value="$3M-$5M">$3M-$5M</SelectItem>
                        <SelectItem value="$5M-$10M">$5M-$10M</SelectItem>
                        <SelectItem value="$10M+">$10M+</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="city">City</Label>
                    <Input id="city" name="city" placeholder="Austin" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="state">State</Label>
                    <Input id="state" name="state" placeholder="TX" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="website">Website</Label>
                  <Input id="website" name="website" placeholder="https://example.com" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea id="description" name="description" placeholder="Brief description of the business..." />
                </div>
                <Button type="submit" className="w-full">Add Company</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search companies..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="new">New</SelectItem>
            <SelectItem value="researching">Researching</SelectItem>
            <SelectItem value="qualified">Qualified</SelectItem>
            <SelectItem value="contacted">Contacted</SelectItem>
            <SelectItem value="disqualified">Disqualified</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Company List */}
      {companies.length === 0 && !loading ? (
        <EmptyState
          icon={Target}
          title="No companies yet"
          description="Start building your sourcing pipeline by adding companies manually or importing a CSV."
          action={{ label: "Add Company", onClick: () => setShowAddDialog(true) }}
        />
      ) : (
        <div className="space-y-2">
          {companies.map((company) => (
            <div
              key={company.id}
              className={`group/row flex items-center justify-between rounded-xl border border-border/50 bg-card p-4 transition-colors hover:bg-muted/30 ${
                selectedIds.has(company.id) ? "ring-2 ring-primary border-primary" : ""
              }`}
            >
              {selectionMode && (
                <div className="mr-4 shrink-0">
                  <Checkbox
                    checked={selectedIds.has(company.id)}
                    onCheckedChange={() => toggleSelect(company.id)}
                  />
                </div>
              )}
              <Link
                href={`/sourcing/${company.id}`}
                className="flex flex-1 items-center justify-between"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                    <Building2 className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-medium">{company.name}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {company.industry && <span>{company.industry}</span>}
                      {company.location_city && (
                        <span>
                          {company.location_city}
                          {company.location_state && `, ${company.location_state}`}
                        </span>
                      )}
                      {company.revenue_range && (
                        <span>Rev: {company.revenue_range}</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    disabled={scoringId === company.id}
                    onClick={(e) => handleScoreCompany(e, company.id)}
                    title="Score ICP"
                  >
                    {scoringId === company.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="h-3.5 w-3.5 text-primary" />
                    )}
                  </Button>
                  {company.icp_score !== null && company.icp_score !== undefined && (
                    <div className="flex items-center gap-1">
                      <Sparkles className="h-3 w-3 text-primary" />
                      <span className="text-xs font-medium">
                        {Math.round(company.icp_score)}
                      </span>
                    </div>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 opacity-0 group-hover/row:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setSingleDeleteTarget(company);
                    }}
                    title="Delete company"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                  <Badge
                    variant="secondary"
                    className={statusColors[company.status] || ""}
                  >
                    {company.status}
                  </Badge>
                </div>
              </Link>
            </div>
          ))}
        </div>
      )}

      {/* Floating action bar for bulk selection */}
      {selectionMode && selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2">
          <div className="flex items-center gap-3 rounded-xl border bg-card px-4 py-3 shadow-lg">
            <span className="text-sm font-medium">
              {selectedIds.size} selected
            </span>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setShowBulkDeleteDialog(true)}
            >
              <Trash2 className="mr-2 h-3.5 w-3.5" />
              Delete Selected
            </Button>
          </div>
        </div>
      )}

      {/* Bulk delete confirmation dialog */}
      <Dialog open={showBulkDeleteDialog} onOpenChange={setShowBulkDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {selectedIds.size} Company{selectedIds.size !== 1 ? "ies" : "y"}</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {selectedIds.size} company{selectedIds.size !== 1 ? "ies" : "y"}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowBulkDeleteDialog(false)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmBulkDelete}
              disabled={deleting}
            >
              {deleting ? "Deleting..." : `Delete ${selectedIds.size} Company${selectedIds.size !== 1 ? "ies" : "y"}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Single delete confirmation dialog */}
      <Dialog open={!!singleDeleteTarget} onOpenChange={(open) => { if (!open) setSingleDeleteTarget(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Company</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &ldquo;{singleDeleteTarget?.name}&rdquo;? This will also remove associated deals and contacts. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSingleDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleConfirmSingleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
