"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

export function useRealtime({
  table, schema = "public", event = "*", filter, onInsert, onUpdate, onDelete, onChange, enabled = true,
}: {
  table: string; schema?: string; event?: string; filter?: string;
  onInsert?: (payload: any) => void; onUpdate?: (payload: any) => void;
  onDelete?: (payload: any) => void; onChange?: (payload: any) => void; enabled?: boolean;
}) {
  const channelRef = useRef<RealtimeChannel | null>(null);
  useEffect(() => {
    if (!enabled) return;
    const supabase = createClient();
    const config: any = { event, schema, table };
    if (filter) config.filter = filter;
    const channel = supabase.channel(`realtime-${table}-${Date.now()}`)
      .on("postgres_changes", config, (payload: any) => {
        onChange?.(payload);
        if (payload.eventType === "INSERT") onInsert?.(payload);
        else if (payload.eventType === "UPDATE") onUpdate?.(payload);
        else if (payload.eventType === "DELETE") onDelete?.(payload);
      }).subscribe();
    channelRef.current = channel;
    return () => { supabase.removeChannel(channel); };
  }, [table, schema, event, filter, enabled]);
  return channelRef;
}
