"use client";

import { useCallback, useEffect } from "react";
import { useOutreachStore } from "@/stores/outreach-store";
import { getCampaigns } from "@/actions/outreach";
import { toast } from "sonner";

export function useOutreach() {
  const { campaigns, setCampaigns, activeCampaignId, setActiveCampaignId } = useOutreachStore();
  const loadCampaigns = useCallback(async () => {
    try { const data = await getCampaigns(); setCampaigns(data); } catch { toast.error("Failed to load campaigns"); }
  }, [setCampaigns]);
  useEffect(() => { loadCampaigns(); }, [loadCampaigns]);
  const activeCampaign = campaigns.find((c) => c.id === activeCampaignId);
  return { campaigns, activeCampaign, activeCampaignId, setActiveCampaignId, refreshCampaigns: loadCampaigns };
}
