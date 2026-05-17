"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createDeal } from "@/actions/deals";
import { getCompanies } from "@/actions/companies";
import { getContacts } from "@/actions/contacts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Search } from "lucide-react";
import { toast } from "sonner";

interface Company {
  id: string;
  name: string;
  industry: string | null;
}

interface Contact {
  id: string;
  first_name: string;
  last_name: string;
  title: string | null;
}

export function NewDealDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Company search
  const [companySearch, setCompanySearch] = useState("");
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loadingCompanies, setLoadingCompanies] = useState(false);
  const [selectedCompanyId, setSelectedCompanyId] = useState("");
  const [selectedCompanyName, setSelectedCompanyName] = useState("");

  // Contacts for selected company
  const [contacts, setContacts] = useState<Contact[]>([]);

  // Form fields
  const [title, setTitle] = useState("");
  const [askingPrice, setAskingPrice] = useState("");
  const [estimatedValue, setEstimatedValue] = useState("");
  const [revenue, setRevenue] = useState("");
  const [ebitda, setEbitda] = useState("");
  const [priority, setPriority] = useState("medium");
  const [dealThesis, setDealThesis] = useState("");
  const [primaryContactId, setPrimaryContactId] = useState("");

  // Search companies when dialog opens or search changes
  useEffect(() => {
    if (!open) return;
    const timeout = setTimeout(async () => {
      setLoadingCompanies(true);
      try {
        const { companies: results } = await getCompanies({
          search: companySearch || undefined,
          limit: 20,
        });
        setCompanies(results);
      } catch {
        // ignore
      } finally {
        setLoadingCompanies(false);
      }
    }, 300);
    return () => clearTimeout(timeout);
  }, [open, companySearch]);

  // Load contacts when company is selected
  useEffect(() => {
    if (!selectedCompanyId) {
      setContacts([]);
      setPrimaryContactId("");
      return;
    }
    (async () => {
      try {
        const { contacts: result } = await getContacts({
          company_id: selectedCompanyId,
        });
        setContacts(result);
      } catch {
        setContacts([]);
      }
    })();
  }, [selectedCompanyId]);

  function handleSelectCompany(company: Company) {
    setSelectedCompanyId(company.id);
    setSelectedCompanyName(company.name);
    setTitle(`${company.name} Acquisition`);
  }

  function resetForm() {
    setCompanySearch("");
    setSelectedCompanyId("");
    setSelectedCompanyName("");
    setTitle("");
    setAskingPrice("");
    setEstimatedValue("");
    setRevenue("");
    setEbitda("");
    setPriority("medium");
    setDealThesis("");
    setPrimaryContactId("");
    setContacts([]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedCompanyId) {
      toast.error("Please select a company");
      return;
    }
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }

    setSubmitting(true);
    try {
      const toCents = (val: string) => {
        const num = parseFloat(val);
        return isNaN(num) ? null : Math.round(num * 100);
      };

      await createDeal({
        company_id: selectedCompanyId,
        title: title.trim(),
        asking_price: toCents(askingPrice),
        estimated_value: toCents(estimatedValue),
        revenue: toCents(revenue),
        ebitda: toCents(ebitda),
        priority,
        deal_thesis: dealThesis.trim() || null,
        primary_contact_id: primaryContactId || null,
        stage: "lead",
      });

      toast.success("Deal created successfully");
      setOpen(false);
      resetForm();
      router.refresh();
    } catch (err) {
      toast.error("Failed to create deal");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) resetForm();
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="mr-2 h-3.5 w-3.5" />
          New Deal
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Deal</DialogTitle>
          <DialogDescription>
            Select a company and fill in the deal details.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Company Selection */}
          {!selectedCompanyId ? (
            <div className="space-y-2">
              <Label>Company</Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  value={companySearch}
                  onChange={(e) => setCompanySearch(e.target.value)}
                  placeholder="Search companies..."
                  className="pl-9"
                />
              </div>
              <div className="max-h-40 overflow-y-auto rounded-md border border-border/50">
                {loadingCompanies ? (
                  <p className="p-3 text-center text-xs text-muted-foreground">
                    Loading...
                  </p>
                ) : companies.length === 0 ? (
                  <p className="p-3 text-center text-xs text-muted-foreground">
                    No companies found
                  </p>
                ) : (
                  companies.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => handleSelectCompany(c)}
                      className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-muted/50 transition-colors"
                    >
                      <span className="font-medium">{c.name}</span>
                      {c.industry && (
                        <span className="text-xs text-muted-foreground">
                          {c.industry}
                        </span>
                      )}
                    </button>
                  ))
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <Label>Company</Label>
              <div className="flex items-center justify-between rounded-md border border-border/50 px-3 py-2">
                <span className="text-sm font-medium">
                  {selectedCompanyName}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedCompanyId("");
                    setSelectedCompanyName("");
                    setTitle("");
                    setContacts([]);
                    setPrimaryContactId("");
                  }}
                >
                  Change
                </Button>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="new-deal-title">Title</Label>
            <Input
              id="new-deal-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Deal title"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="new-asking-price">Asking Price ($)</Label>
              <Input
                id="new-asking-price"
                type="number"
                step="0.01"
                min="0"
                value={askingPrice}
                onChange={(e) => setAskingPrice(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-estimated-value">Estimated Value ($)</Label>
              <Input
                id="new-estimated-value"
                type="number"
                step="0.01"
                min="0"
                value={estimatedValue}
                onChange={(e) => setEstimatedValue(e.target.value)}
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="new-revenue">Revenue ($)</Label>
              <Input
                id="new-revenue"
                type="number"
                step="0.01"
                min="0"
                value={revenue}
                onChange={(e) => setRevenue(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-ebitda">EBITDA ($)</Label>
              <Input
                id="new-ebitda"
                type="number"
                step="0.01"
                min="0"
                value={ebitda}
                onChange={(e) => setEbitda(e.target.value)}
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="new-priority">Priority</Label>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger id="new-priority">
                <SelectValue placeholder="Select priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="new-deal-thesis">Deal Thesis</Label>
            <Textarea
              id="new-deal-thesis"
              value={dealThesis}
              onChange={(e) => setDealThesis(e.target.value)}
              placeholder="Why is this a good acquisition target?"
              rows={3}
            />
          </div>

          {contacts.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="new-primary-contact">Primary Contact</Label>
              <Select
                value={primaryContactId}
                onValueChange={setPrimaryContactId}
              >
                <SelectTrigger id="new-primary-contact">
                  <SelectValue placeholder="Select a contact" />
                </SelectTrigger>
                <SelectContent>
                  {contacts.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.first_name} {c.last_name}
                      {c.title ? ` - ${c.title}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting || !selectedCompanyId}>
              {submitting ? "Creating..." : "Create Deal"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
