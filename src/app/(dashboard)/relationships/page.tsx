"use client";

import { useState } from "react";
import { createContact } from "@/actions/contacts";
import { useContacts, useDeleteContact } from "@/lib/hooks/use-contacts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, Plus, Search, Mail, Phone, Star, Trash2, CheckSquare, X } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

const ROLE_TYPES = ["owner", "cfo", "broker", "intermediary", "other"];

export default function RelationshipsPage() {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [singleDeleteTarget, setSingleDeleteTarget] = useState<any | null>(null);

  const { data, isLoading: isPending, refetch: loadContacts } = useContacts({ search: search || undefined, role_type: roleFilter !== "all" ? roleFilter : undefined });
  const contacts: any[] = data?.contacts || [];
  const deleteContactMutation = useDeleteContact();

  async function handleCreate(formData: FormData) {
    try {
      await createContact({
        first_name: formData.get("first_name") as string, last_name: formData.get("last_name") as string,
        email: (formData.get("email") as string) || null, phone: (formData.get("phone") as string) || null,
        title: (formData.get("title") as string) || null, role_type: (formData.get("role_type") as string) || "other",
      });
      toast.success("Contact created"); setDialogOpen(false); loadContacts();
    } catch { toast.error("Failed to create contact"); }
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
    if (selectedIds.size === contacts.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(contacts.map((c) => c.id)));
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
      const results = await Promise.allSettled(ids.map((id) => deleteContactMutation.mutateAsync(id)));
      const failed = results.filter((r) => r.status === "rejected").length;
      if (failed > 0) {
        toast.error(`Failed to delete ${failed} contact(s)`);
      } else {
        toast.success(`Deleted ${ids.length} contact(s)`);
      }
    } catch {
      toast.error("Failed to delete contacts");
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
      await deleteContactMutation.mutateAsync(target.id);
      toast.success(`Deleted "${target.first_name} ${target.last_name}"`);
    } catch {
      toast.error("Failed to delete contact");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold tracking-tight">Relationships</h1><p className="text-sm text-muted-foreground">Manage contacts and build your network</p></div>
        <div className="flex items-center gap-2">
          {selectionMode ? (
            <>
              <div className="flex items-center gap-2 mr-2">
                <Checkbox
                  checked={contacts.length > 0 && selectedIds.size === contacts.length}
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
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectionMode(true)}
              disabled={contacts.length === 0}
            >
              <CheckSquare className="mr-2 h-3.5 w-3.5" />
              Select
            </Button>
          )}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}><DialogTrigger asChild><Button size="sm"><Plus className="mr-2 h-4 w-4" />Add Contact</Button></DialogTrigger>
          <DialogContent><DialogHeader><DialogTitle>Add Contact</DialogTitle></DialogHeader>
            <form action={handleCreate} className="space-y-4">
              <div className="grid grid-cols-2 gap-4"><div className="space-y-2"><Label htmlFor="first_name">First Name *</Label><Input id="first_name" name="first_name" required /></div><div className="space-y-2"><Label htmlFor="last_name">Last Name *</Label><Input id="last_name" name="last_name" required /></div></div>
              <div className="space-y-2"><Label htmlFor="email">Email</Label><Input id="email" name="email" type="email" /></div>
              <div className="space-y-2"><Label htmlFor="phone">Phone</Label><Input id="phone" name="phone" /></div>
              <div className="space-y-2"><Label htmlFor="title">Title</Label><Input id="title" name="title" /></div>
              <div className="space-y-2"><Label>Role Type</Label><select name="role_type" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">{ROLE_TYPES.map((r) => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}</select></div>
              <Button type="submit" className="w-full">Create Contact</Button>
            </form>
          </DialogContent>
        </Dialog>
        </div>
      </div>
      <div className="flex gap-3">
        <div className="relative flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input placeholder="Search contacts..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
        <Select value={roleFilter} onValueChange={setRoleFilter}><SelectTrigger className="w-[160px]"><SelectValue placeholder="Role Type" /></SelectTrigger><SelectContent><SelectItem value="all">All Roles</SelectItem>{ROLE_TYPES.map((r) => <SelectItem key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</SelectItem>)}</SelectContent></Select>
      </div>
      {contacts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center"><Users className="h-12 w-12 text-muted-foreground/50" /><h3 className="mt-4 text-lg font-medium">No contacts yet</h3><p className="mt-1 text-sm text-muted-foreground">Start building your network by adding contacts</p></div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{contacts.map((contact) => (
          <div key={contact.id} className="relative">
            {selectionMode && (
              <div className="absolute left-3 top-3 z-10">
                <Checkbox
                  checked={selectedIds.has(contact.id)}
                  onCheckedChange={() => toggleSelect(contact.id)}
                />
              </div>
            )}
            <Link href={`/relationships/${contact.id}`}>
              <Card className={`group/card cursor-pointer border-border/50 transition-colors hover:border-border hover:bg-muted/20 ${
                selectedIds.has(contact.id) ? "ring-2 ring-primary border-primary" : ""
              }`}><CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className={`min-w-0 flex-1 ${selectionMode ? "ml-7" : ""}`}><p className="font-medium">{contact.first_name} {contact.last_name}</p>{contact.title && <p className="text-xs text-muted-foreground">{contact.title}</p>}</div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 opacity-0 group-hover/card:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setSingleDeleteTarget(contact);
                      }}
                      title="Delete contact"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                    {contact.relationship_score && <Badge variant="secondary" className="ml-1"><Star className="mr-1 h-3 w-3" />{Math.round(contact.relationship_score)}</Badge>}
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">{contact.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{contact.email}</span>}{contact.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{contact.phone}</span>}</div>
                <Badge variant="outline" className="mt-2 text-xs">{contact.role_type || "other"}</Badge>
              </CardContent></Card>
            </Link>
          </div>
        ))}</div>
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
            <DialogTitle>Delete {selectedIds.size} Contact{selectedIds.size !== 1 ? "s" : ""}</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {selectedIds.size} contact{selectedIds.size !== 1 ? "s" : ""}? This action cannot be undone.
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
              {deleting ? "Deleting..." : `Delete ${selectedIds.size} Contact${selectedIds.size !== 1 ? "s" : ""}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Single delete confirmation dialog */}
      <Dialog open={!!singleDeleteTarget} onOpenChange={(open) => { if (!open) setSingleDeleteTarget(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Contact</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &ldquo;{singleDeleteTarget?.first_name} {singleDeleteTarget?.last_name}&rdquo;? This action cannot be undone.
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
