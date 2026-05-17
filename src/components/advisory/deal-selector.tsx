"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X } from "lucide-react";

interface DealSelectorProps {
  onSelect: (deal: any) => void;
  onClear: () => void;
  selectedDealId?: string | null;
}

export function DealSelector({ onSelect, onClear, selectedDealId }: DealSelectorProps) {
  const [deals, setDeals] = useState<any[]>([]);
  const [selectedDeal, setSelectedDeal] = useState<any>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("deals")
      .select("id, title, asking_price, stage, companies(name, industry, revenue, ebitda, employee_count, location_city, location_state)")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (data) setDeals(data);
      });
  }, []);

  useEffect(() => {
    if (!selectedDealId) {
      setSelectedDeal(null);
    } else {
      const deal = deals.find((d) => d.id === selectedDealId);
      if (deal) setSelectedDeal(deal);
    }
  }, [selectedDealId, deals]);

  function handleSelect(dealId: string) {
    const deal = deals.find((d) => d.id === dealId);
    if (deal) {
      setSelectedDeal(deal);
      onSelect(deal);
    }
  }

  function handleClear() {
    setSelectedDeal(null);
    onClear();
  }

  return (
    <div className="flex items-center gap-3">
      <span className="shrink-0 text-xs text-muted-foreground">Load from deal:</span>
      <Select value={selectedDeal?.id || ""} onValueChange={handleSelect}>
        <SelectTrigger className="h-8 w-[260px] text-xs">
          <SelectValue placeholder="Select a deal..." />
        </SelectTrigger>
        <SelectContent>
          {deals.map((deal) => (
            <SelectItem key={deal.id} value={deal.id}>
              {deal.title}{deal.companies?.name ? ` — ${deal.companies.name}` : ""}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {selectedDeal && (
        <button
          onClick={handleClear}
          className="inline-flex h-5 w-5 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}
