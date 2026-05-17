"use client";

import { useCallback, useEffect } from "react";
import { usePipelineStore } from "@/stores/pipeline-store";
import { getDeals, updateDealStage } from "@/actions/deals";
import { useRealtime } from "./use-realtime";
import { toast } from "sonner";

export function usePipeline() {
  const { deals, setDeals, moveDeal, getDealsByStage } = usePipelineStore();
  const loadDeals = useCallback(async () => {
    try { const data = await getDeals(); setDeals(data); } catch { toast.error("Failed to load deals"); }
  }, [setDeals]);
  useEffect(() => { loadDeals(); }, [loadDeals]);
  useRealtime({ table: "deals", onChange: () => { loadDeals(); } });
  const handleMoveDeal = useCallback(async (dealId: string, newStage: string) => {
    moveDeal(dealId, newStage as any);
    try { await updateDealStage(dealId, newStage as any); } catch { toast.error("Failed to update deal stage"); loadDeals(); }
  }, [moveDeal, loadDeals]);
  return { deals, getDealsByStage, moveDeal: handleMoveDeal, refreshDeals: loadDeals };
}
