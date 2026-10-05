"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { MetricCard } from "@/components/analytics/metric-card";
import { Mail, MessageSquare, Phone, Plus, Send, Linkedin } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
export default function OutreachPage() {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCampaigns = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("outreach_campaigns")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) toast.error("Failed to load campaigns");
    else setCampaigns(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    // Initial data load; fetchCampaigns sets loading state before awaiting.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchCampaigns();
  }, [fetchCampaigns]);

  const activeCampaigns = campaigns.filter((c) => c.status === "active");
  const totalSent = campaigns.reduce((sum, c) => {
    const stats = c.stats as Record<string, number> | null;
    return sum + (stats?.sent || 0);
  }, 0);
  const totalReplied = campaigns.reduce((sum, c) => {
    const stats = c.stats as Record<string, number> | null;
    return sum + (stats?.replied || 0);
  }, 0);
  const totalBooked = campaigns.reduce((sum, c) => {
    const stats = c.stats as Record<string, number> | null;
    return sum + (stats?.booked || 0);
  }, 0);

  const channelIcons: Record<string, React.ElementType> = {
    email: Mail, sms: MessageSquare, call: Phone, linkedin: Linkedin,
  };

  const statusColors: Record<string, string> = {
    draft: "bg-muted text-muted-foreground",
    active: "bg-emerald-500/10 text-emerald-500",
    paused: "bg-primary/10 text-primary",
    completed: "bg-primary/10 text-primary",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Outreach</h1>
          <p className="text-sm text-muted-foreground">Multi-channel campaigns with AI-powered personalization</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/outreach/inbox"><Button variant="outline" size="sm"><Mail className="mr-2 h-3.5 w-3.5" />Inbox</Button></Link>
          <Link href="/outreach/calls"><Button variant="outline" size="sm"><Phone className="mr-2 h-3.5 w-3.5" />Call Log</Button></Link>
          <Link href="/outreach/campaigns/new"><Button size="sm"><Plus className="mr-2 h-3.5 w-3.5" />New Campaign</Button></Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard title="Active Campaigns" value={activeCampaigns.length} icon="Target" iconColor="text-primary" />
        <MetricCard title="Total Sent" value={totalSent} icon="Mail" iconColor="text-primary" />
        <MetricCard title="Total Replies" value={totalReplied} icon="Activity" iconColor="text-emerald-500" />
        <MetricCard title="Meetings Booked" value={totalBooked} icon="Calendar" iconColor="text-primary" />
      </div>

      {campaigns.length === 0 && !loading ? (
        <EmptyState icon={Send} title="No campaigns yet" description="Create your first outreach campaign to start generating deal flow." />
      ) : (
        <div className="space-y-3">
          {campaigns.map((campaign) => {
            const stats = campaign.stats as Record<string, number> | null;
            return (
              <Link key={campaign.id} href={`/outreach/campaigns/${campaign.id}`} className="flex items-center justify-between rounded-xl border border-border/50 bg-card p-4 transition-colors hover:bg-muted/30">
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted"><Send className="h-5 w-5 text-muted-foreground" /></div>
                  <div>
                    <p className="font-medium">{campaign.name}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {campaign.channels?.map((ch: string) => { const Icon = channelIcons[ch] || Mail; return <Icon key={ch} className="h-3 w-3" />; })}
                      {campaign.description && <span>{campaign.description}</span>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>{stats?.sent || 0} sent</span>
                    <span>{stats?.replied || 0} replied</span>
                    <span>{stats?.booked || 0} booked</span>
                  </div>
                  <Badge variant="secondary" className={statusColors[campaign.status]}>{campaign.status}</Badge>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
