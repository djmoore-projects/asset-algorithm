"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { usePipelineStore } from "@/stores/pipeline-store";
import { PIPELINE_STAGES } from "@/lib/utils/constants";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { EmptyState } from "@/components/shared/empty-state";
import { formatCompactCurrency } from "@/lib/utils/constants";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  GripVertical,
  Kanban,
  Sparkles,
  Trash2,
  CheckSquare,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { toast } from "sonner";
import { NewDealDialog } from "./new-deal-dialog";
import { deleteDeal } from "@/actions/deals";
import type { DealStage } from "@/types/database";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

type Deal = {
  id: string;
  title: string;
  stage: DealStage;
  priority: string;
  asking_price: number | null;
  deal_score: number | null;
  created_at: string;
  companies: { name: string; industry: string | null } | null;
  [key: string]: any;
};

function DealCard({
  deal,
  isDragging,
  selectionMode,
  isSelected,
  onToggleSelect,
  onDeleteSingle,
}: {
  deal: Deal;
  isDragging?: boolean;
  selectionMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: (id: string) => void;
  onDeleteSingle?: (deal: Deal) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: deal.id, data: { stage: deal.stage } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isSortableDragging ? 0.5 : 1,
  };

  const priorityColors: Record<string, string> = {
    low: "bg-muted-foreground/50",
    medium: "bg-primary",
    high: "bg-primary",
    critical: "bg-red-500",
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group cursor-grab rounded-lg border border-border/50 bg-card p-3 shadow-sm transition-all hover:border-border hover:shadow-md active:cursor-grabbing",
        isDragging && "shadow-lg ring-2 ring-primary/20",
        isSelected && "ring-2 ring-primary border-primary"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        {selectionMode && (
          <div
            className="mt-0.5 shrink-0"
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <Checkbox
              checked={isSelected}
              onCheckedChange={() => onToggleSelect?.(deal.id)}
            />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <Link
            href={`/pipeline/${deal.id}`}
            className="text-sm font-medium hover:text-primary"
            onClick={(e) => e.stopPropagation()}
          >
            {deal.title}
          </Link>
          <p className="text-xs text-muted-foreground truncate">
            {deal.companies?.name || "Unknown"}
          </p>
        </div>
        <div className="flex items-center gap-1">
          {!selectionMode && (
            <button
              className="mt-0.5 opacity-0 transition-opacity group-hover:opacity-100 hover:text-destructive"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                onDeleteSingle?.(deal);
              }}
              onPointerDown={(e) => e.stopPropagation()}
              title="Delete deal"
            >
              <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
            </button>
          )}
          <div
            {...attributes}
            {...listeners}
            className="mt-0.5 cursor-grab opacity-0 transition-opacity group-hover:opacity-100"
          >
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>
      </div>
      <div className="mt-2 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <div
            className={cn(
              "h-1.5 w-1.5 rounded-full",
              priorityColors[deal.priority]
            )}
          />
          <span className="text-[10px] capitalize text-muted-foreground">
            {deal.priority}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {deal.deal_score !== null && (
            <div className="flex items-center gap-0.5">
              <Sparkles className="h-2.5 w-2.5 text-primary" />
              <span className="text-[10px] font-medium">
                {Math.round(deal.deal_score)}
              </span>
            </div>
          )}
          {deal.asking_price && (
            <span className="text-xs font-semibold">
              {formatCompactCurrency(deal.asking_price)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function StageColumn({
  stage,
  deals,
  color,
  selectionMode,
  selectedIds,
  onToggleSelect,
  onDeleteSingle,
}: {
  stage: { value: DealStage; label: string; color: string };
  deals: Deal[];
  color: string;
  selectionMode: boolean;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onDeleteSingle: (deal: Deal) => void;
}) {
  const totalValue = deals.reduce(
    (sum, d) => sum + (d.asking_price || 0),
    0
  );

  return (
    <div className="flex h-full w-72 shrink-0 flex-col rounded-xl bg-muted/30">
      {/* Column Header */}
      <div className="flex items-center justify-between border-b border-border/30 px-3 py-2.5">
        <div className="flex items-center gap-2">
          <div className={cn("h-2 w-2 rounded-full", color)} />
          <span className="text-xs font-semibold">{stage.label}</span>
          <Badge
            variant="secondary"
            className="h-5 px-1.5 text-[10px] font-medium"
          >
            {deals.length}
          </Badge>
        </div>
        {totalValue > 0 && (
          <span className="text-[10px] text-muted-foreground">
            {formatCompactCurrency(totalValue)}
          </span>
        )}
      </div>

      {/* Droppable Area */}
      <SortableContext
        items={deals.map((d) => d.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="flex-1 space-y-2 overflow-y-auto p-2">
          {deals.map((deal) => (
            <DealCard
              key={deal.id}
              deal={deal}
              selectionMode={selectionMode}
              isSelected={selectedIds.has(deal.id)}
              onToggleSelect={onToggleSelect}
              onDeleteSingle={onDeleteSingle}
            />
          ))}
        </div>
      </SortableContext>
    </div>
  );
}

export default function PipelinePage() {
  const { deals, setDeals, moveDeal, removeDeal } = usePipelineStore();
  const [loading, setLoading] = useState(true);
  const [activeDeal, setActiveDeal] = useState<Deal | null>(null);

  // Selection mode state
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Delete confirmation dialogs
  const [singleDeleteTarget, setSingleDeleteTarget] = useState<Deal | null>(null);
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const fetchDeals = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const { data, error } = await supabase
      .from("deals")
      .select(
        "*, companies(name, industry)"
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to load deals");
    } else {
      setDeals((data as Deal[]) || []);
    }
    setLoading(false);
  }, [setDeals]);

  useEffect(() => {
    fetchDeals();
  }, [fetchDeals]);

  // Subscribe to realtime updates scoped to the current user
  useEffect(() => {
    const supabase = createClient();
    let channel: ReturnType<typeof supabase.channel> | null = null;

    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      channel = supabase
        .channel("deals-realtime")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "deals", filter: "user_id=eq." + user.id },
          () => {
            fetchDeals();
          }
        )
        .subscribe();
    })();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [fetchDeals]);

  function handleDragStart(event: DragStartEvent) {
    const deal = deals.find((d) => d.id === event.active.id) as Deal | undefined;
    setActiveDeal(deal || null);
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveDeal(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    // Determine the target stage
    const overDeal = deals.find((d) => d.id === over.id);
    if (!overDeal) return;

    const newStage = overDeal.stage;
    const dealId = active.id as string;
    const currentDeal = deals.find((d) => d.id === dealId);
    if (!currentDeal || currentDeal.stage === newStage) return;

    // Optimistic update
    moveDeal(dealId, newStage);

    // Persist to database
    const supabase = createClient();
    const { error } = await supabase
      .from("deals")
      .update({ stage: newStage })
      .eq("id", dealId);

    if (error) {
      toast.error("Failed to move deal");
      fetchDeals(); // Revert
    } else {
      toast.success(
        `Deal moved to ${PIPELINE_STAGES.find((s) => s.value === newStage)?.label}`
      );
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
    const activeIds = activeDeals.map((d) => d.id);
    if (selectedIds.size === activeIds.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(activeIds));
    }
  }

  function exitSelectionMode() {
    setSelectionMode(false);
    setSelectedIds(new Set());
  }

  // Single delete handler
  async function handleConfirmSingleDelete() {
    if (!singleDeleteTarget) return;
    setDeleting(true);
    try {
      removeDeal(singleDeleteTarget.id);
      await deleteDeal(singleDeleteTarget.id);
      toast.success("Deal deleted");
    } catch {
      toast.error("Failed to delete deal");
      fetchDeals();
    } finally {
      setDeleting(false);
      setSingleDeleteTarget(null);
    }
  }

  // Bulk delete handler
  async function handleConfirmBulkDelete() {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    setDeleting(true);
    try {
      // Optimistic removal
      for (const id of ids) removeDeal(id);

      // Persist deletions
      const results = await Promise.allSettled(ids.map((id) => deleteDeal(id)));
      const failed = results.filter((r) => r.status === "rejected").length;

      if (failed > 0) {
        toast.error(`Failed to delete ${failed} deal(s)`);
        fetchDeals();
      } else {
        toast.success(`Deleted ${ids.length} deal(s)`);
      }
    } catch {
      toast.error("Failed to delete deals");
      fetchDeals();
    } finally {
      setDeleting(false);
      setShowBulkDeleteDialog(false);
      exitSelectionMode();
    }
  }

  const activeDeals = deals.filter(
    (d) => d.stage !== "closed" && d.stage !== "dead"
  );

  return (
    <div className="flex h-full flex-col space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Deal Pipeline</h1>
          <p className="text-sm text-muted-foreground">
            {activeDeals.length} active deals
          </p>
        </div>
        <div className="flex items-center gap-2">
          {selectionMode ? (
            <>
              <div className="flex items-center gap-2 mr-2">
                <Checkbox
                  checked={activeDeals.length > 0 && selectedIds.size === activeDeals.length}
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
                disabled={activeDeals.length === 0}
              >
                <CheckSquare className="mr-2 h-3.5 w-3.5" />
                Select
              </Button>
              <NewDealDialog />
            </>
          )}
        </div>
      </div>

      {/* Kanban Board */}
      {activeDeals.length === 0 && !loading ? (
        <EmptyState
          icon={Kanban}
          title="No deals in your pipeline"
          description="Create deals from your sourced companies to start managing your pipeline."
        />
      ) : (
        <div className="flex-1 overflow-x-auto">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <div className="flex gap-3 pb-4" style={{ minHeight: "calc(100vh - 240px)" }}>
              {PIPELINE_STAGES.map((stage) => (
                <StageColumn
                  key={stage.value}
                  stage={stage}
                  deals={
                    (deals.filter((d) => d.stage === stage.value) as Deal[])
                  }
                  color={stage.color}
                  selectionMode={selectionMode}
                  selectedIds={selectedIds}
                  onToggleSelect={toggleSelect}
                  onDeleteSingle={setSingleDeleteTarget}
                />
              ))}
            </div>
            <DragOverlay>
              {activeDeal && <DealCard deal={activeDeal} isDragging />}
            </DragOverlay>
          </DndContext>
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

      {/* Single delete confirmation dialog */}
      <Dialog
        open={!!singleDeleteTarget}
        onOpenChange={(open) => {
          if (!open) setSingleDeleteTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Deal</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{singleDeleteTarget?.title}&quot;? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSingleDeleteTarget(null)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmSingleDelete}
              disabled={deleting}
            >
              {deleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk delete confirmation dialog */}
      <Dialog open={showBulkDeleteDialog} onOpenChange={setShowBulkDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {selectedIds.size} Deal{selectedIds.size !== 1 ? "s" : ""}</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {selectedIds.size} deal{selectedIds.size !== 1 ? "s" : ""}? This action cannot be undone.
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
              {deleting ? "Deleting..." : `Delete ${selectedIds.size} Deal${selectedIds.size !== 1 ? "s" : ""}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
