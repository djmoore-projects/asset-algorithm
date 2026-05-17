"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getCompanies, deleteCompany } from "@/actions/companies";
import type { CompanyStatus } from "@/types/database";

export function useCompanies(filters?: { search?: string; status?: CompanyStatus | "all" }) {
  return useQuery({
    queryKey: ["companies", filters],
    queryFn: () => getCompanies(filters?.status === "all" ? { search: filters?.search } : filters),
  });
}

export function useDeleteCompany() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteCompany(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["companies"] }),
  });
}
