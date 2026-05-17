"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getContacts, deleteContact } from "@/actions/contacts";

export function useContacts(filters?: { search?: string; role_type?: string; company_id?: string }) {
  return useQuery({
    queryKey: ["contacts", filters],
    queryFn: () => getContacts(filters),
  });
}

export function useDeleteContact() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteContact(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["contacts"] }),
  });
}
