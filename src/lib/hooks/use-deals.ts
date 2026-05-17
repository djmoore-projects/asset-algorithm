"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getDeals, deleteDeal, updateDealStage } from "@/actions/deals";
import type { DealStage } from "@/types/database";

export function useDeals(filters?: { stage?: DealStage; search?: string; company_id?: string }) {
  return useQuery({
    queryKey: ["deals", filters],
    queryFn: () => getDeals(filters),
  });
}

export function useDeleteDeal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteDeal(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["deals"] }),
  });
}

export function useUpdateDealStage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, stage }: { id: string; stage: DealStage }) => updateDealStage(id, stage),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["deals"] }),
  });
}
