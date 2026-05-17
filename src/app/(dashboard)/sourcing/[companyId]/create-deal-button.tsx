"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createDeal } from "@/actions/deals";
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
import { Plus } from "lucide-react";
import { toast } from "sonner";

interface Contact {
  id: string;
  first_name: string;
  last_name: string;
  title: string | null;
}

interface CreateDealButtonProps {
  companyId: string;
  companyName: string;
  contacts: Contact[];
}

export function CreateDealButton({
  companyId,
  companyName,
  contacts,
}: CreateDealButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [title, setTitle] = useState(`${companyName} Acquisition`);
  const [askingPrice, setAskingPrice] = useState("");
  const [estimatedValue, setEstimatedValue] = useState("");
  const [revenue, setRevenue] = useState("");
  const [ebitda, setEbitda] = useState("");
  const [priority, setPriority] = useState("medium");
  const [dealThesis, setDealThesis] = useState("");
  const [primaryContactId, setPrimaryContactId] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }

    setSubmitting(true);
    try {
      // Convert dollar amounts to cents for storage
      const toCents = (val: string) => {
        const num = parseFloat(val);
        return isNaN(num) ? null : Math.round(num * 100);
      };

      await createDeal({
        company_id: companyId,
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
      router.push("/pipeline");
      router.refresh();
    } catch (err) {
      toast.error("Failed to create deal");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="mr-2 h-3.5 w-3.5" />
          Create Deal
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create Deal</DialogTitle>
          <DialogDescription>
            Create a new deal for {companyName}. The company status will be
            updated to qualified.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="deal-title">Title</Label>
            <Input
              id="deal-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Deal title"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="asking-price">Asking Price ($)</Label>
              <Input
                id="asking-price"
                type="number"
                step="0.01"
                min="0"
                value={askingPrice}
                onChange={(e) => setAskingPrice(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="estimated-value">Estimated Value ($)</Label>
              <Input
                id="estimated-value"
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
              <Label htmlFor="revenue">Revenue ($)</Label>
              <Input
                id="revenue"
                type="number"
                step="0.01"
                min="0"
                value={revenue}
                onChange={(e) => setRevenue(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ebitda">EBITDA ($)</Label>
              <Input
                id="ebitda"
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
            <Label htmlFor="priority">Priority</Label>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger id="priority">
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
            <Label htmlFor="deal-thesis">Deal Thesis</Label>
            <Textarea
              id="deal-thesis"
              value={dealThesis}
              onChange={(e) => setDealThesis(e.target.value)}
              placeholder="Why is this a good acquisition target?"
              rows={3}
            />
          </div>

          {contacts.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="primary-contact">Primary Contact</Label>
              <Select
                value={primaryContactId}
                onValueChange={setPrimaryContactId}
              >
                <SelectTrigger id="primary-contact">
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
            <Button type="submit" disabled={submitting}>
              {submitting ? "Creating..." : "Create Deal"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
