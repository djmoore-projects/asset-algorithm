"use client";

import { create } from "zustand";
import type { DealStage } from "@/types/database";

interface PipelineState {
  deals: any[];
  loading: boolean;
  setDeals: (deals: any[]) => void;
  addDeal: (deal: any) => void;
  updateDeal: (id: string, updates: Record<string, any>) => void;
  removeDeal: (id: string) => void;
  moveDeal: (dealId: string, newStage: DealStage) => void;
  setLoading: (loading: boolean) => void;
  getDealsByStage: (stage: DealStage) => any[];
}

export const usePipelineStore = create<PipelineState>((set, get) => ({
  deals: [],
  loading: false,
  setDeals: (deals) => set({ deals }),
  addDeal: (deal) => set((state) => ({ deals: [...state.deals, deal] })),
  updateDeal: (id, updates) =>
    set((state) => ({
      deals: state.deals.map((d) => (d.id === id ? { ...d, ...updates } : d)),
    })),
  removeDeal: (id) =>
    set((state) => ({ deals: state.deals.filter((d) => d.id !== id) })),
  moveDeal: (dealId, newStage) =>
    set((state) => ({
      deals: state.deals.map((d) =>
        d.id === dealId
          ? { ...d, stage: newStage, stage_entered_at: new Date().toISOString() }
          : d
      ),
    })),
  setLoading: (loading) => set({ loading }),
  getDealsByStage: (stage) => get().deals.filter((d) => d.stage === stage),
}));
