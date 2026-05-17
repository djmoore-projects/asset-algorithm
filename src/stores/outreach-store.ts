"use client";

import { create } from "zustand";

interface OutreachState {
  campaigns: any[];
  inboxMessages: any[];
  activeCampaignId: string | null;
  setCampaigns: (campaigns: any[]) => void;
  addCampaign: (campaign: any) => void;
  updateCampaign: (id: string, updates: Record<string, any>) => void;
  setInboxMessages: (messages: any[]) => void;
  setActiveCampaignId: (id: string | null) => void;
}

export const useOutreachStore = create<OutreachState>((set) => ({
  campaigns: [],
  inboxMessages: [],
  activeCampaignId: null,
  setCampaigns: (campaigns) => set({ campaigns }),
  addCampaign: (campaign) =>
    set((state) => ({ campaigns: [...state.campaigns, campaign] })),
  updateCampaign: (id, updates) =>
    set((state) => ({
      campaigns: state.campaigns.map((c) =>
        c.id === id ? { ...c, ...updates } : c
      ),
    })),
  setInboxMessages: (inboxMessages) => set({ inboxMessages }),
  setActiveCampaignId: (activeCampaignId) => set({ activeCampaignId }),
}));
