import { createAdminClient } from "@/lib/supabase/admin";
import { sanitizeSearchInput } from "@/lib/utils";

export async function handleToolCall(
  toolName: string,
  toolInput: Record<string, unknown>,
  userId: string
): Promise<string> {
  const supabase = createAdminClient() as any;

  switch (toolName) {
    case "search_companies": {
      let query = supabase
        .from("companies")
        .select("id, name, industry, revenue_range, ebitda_range, icp_score, status, location_city, location_state")
        .eq("user_id", userId)
        .limit(10);

      if (toolInput.query) {
        const search = sanitizeSearchInput(String(toolInput.query));
        query = query.ilike("name", `%${search}%`);
      }
      if (toolInput.industry) query = query.eq("industry", toolInput.industry as string);
      if (toolInput.status) query = query.eq("status", toolInput.status as string);
      if (toolInput.min_score) query = query.gte("icp_score", toolInput.min_score as number);

      const { data, error } = await query;
      if (error) return JSON.stringify({ error: error.message });
      return JSON.stringify({ companies: data, count: data?.length || 0 });
    }

    case "get_company": {
      const { data, error } = await supabase
        .from("companies")
        .select("*")
        .eq("id", toolInput.company_id as string)
        .eq("user_id", userId)
        .single();
      if (error) return JSON.stringify({ error: error.message });
      return JSON.stringify(data);
    }

    case "search_deals": {
      let query = supabase
        .from("deals")
        .select("id, title, stage, asking_price, estimated_value, revenue, ebitda, deal_score, priority, companies(name, industry)")
        .eq("user_id", userId)
        .limit(20);

      if (toolInput.stage) query = query.eq("stage", toolInput.stage as string);
      if (toolInput.priority) query = query.eq("priority", toolInput.priority as string);
      if (toolInput.search) {
        const search = sanitizeSearchInput(String(toolInput.search));
        query = query.ilike("title", `%${search}%`);
      }

      const { data, error } = await query;
      if (error) return JSON.stringify({ error: error.message });
      return JSON.stringify({ deals: data, count: data?.length || 0 });
    }

    case "get_deal": {
      const { data, error } = await supabase
        .from("deals")
        .select("*, companies(*), contacts:primary_contact_id(*)")
        .eq("id", toolInput.deal_id as string)
        .eq("user_id", userId)
        .single();
      if (error) return JSON.stringify({ error: error.message });
      return JSON.stringify(data);
    }

    case "update_deal_stage": {
      const { data, error } = await supabase
        .from("deals")
        .update({ stage: toolInput.stage as string })
        .eq("id", toolInput.deal_id as string)
        .eq("user_id", userId)
        .select()
        .single();
      if (error) return JSON.stringify({ error: error.message });
      return JSON.stringify({ success: true, deal: data });
    }

    case "search_contacts": {
      let query = supabase
        .from("contacts")
        .select("id, first_name, last_name, email, phone, title, role_type, relationship_score, companies(name)")
        .eq("user_id", userId)
        .limit(10);

      if (toolInput.query) {
        const search = sanitizeSearchInput(String(toolInput.query));
        query = query.or(
          `first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%`
        );
      }
      if (toolInput.role_type) query = query.eq("role_type", toolInput.role_type as string);

      const { data, error } = await query;
      if (error) return JSON.stringify({ error: error.message });
      return JSON.stringify({ contacts: data, count: data?.length || 0 });
    }

    case "get_pipeline_metrics": {
      const { data: deals, error } = await supabase
        .from("deals")
        .select("stage, asking_price, estimated_value, deal_score, priority")
        .eq("user_id", userId)
        .neq("stage", "dead");

      if (error) return JSON.stringify({ error: error.message });

      const metrics = {
        total_deals: deals?.length || 0,
        total_pipeline_value: deals?.reduce((sum: number, d: any) => sum + (d.asking_price || 0), 0) || 0,
        avg_deal_score: deals?.length
          ? (deals.reduce((sum: number, d: any) => sum + (d.deal_score || 0), 0) / deals.length).toFixed(1)
          : 0,
        by_stage: {} as Record<string, number>,
        by_priority: {} as Record<string, number>,
      };

      deals?.forEach((d: any) => {
        metrics.by_stage[d.stage] = (metrics.by_stage[d.stage] || 0) + 1;
        metrics.by_priority[d.priority] = (metrics.by_priority[d.priority] || 0) + 1;
      });

      return JSON.stringify(metrics);
    }

    case "get_campaign_stats": {
      let query = supabase
        .from("outreach_campaigns")
        .select("id, name, status, channels, stats")
        .eq("user_id", userId);

      if (toolInput.campaign_id) query = query.eq("id", toolInput.campaign_id as string);

      const { data, error } = await query;
      if (error) return JSON.stringify({ error: error.message });
      return JSON.stringify({ campaigns: data });
    }

    case "get_upcoming_meetings": {
      const days = (toolInput.days as number) || 7;
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + days);

      const { data, error } = await supabase
        .from("meetings")
        .select("id, title, scheduled_at, meeting_type, status, contacts(first_name, last_name), companies(name)")
        .eq("user_id", userId)
        .gte("scheduled_at", new Date().toISOString())
        .lte("scheduled_at", futureDate.toISOString())
        .order("scheduled_at");

      if (error) return JSON.stringify({ error: error.message });
      return JSON.stringify({ meetings: data, count: data?.length || 0 });
    }

    default:
      return JSON.stringify({ error: `Unknown tool: ${toolName}` });
  }
}
