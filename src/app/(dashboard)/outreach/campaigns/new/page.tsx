"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Loader2, Mail, MessageSquare, Phone, Linkedin, Sparkles } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import type { OutreachChannel } from "@/types/database";

const CHANNELS = [
  { id: "email", label: "Email", icon: Mail, description: "Cold email sequences with AI personalization" },
  { id: "sms", label: "SMS", icon: MessageSquare, description: "Text message outreach with compliance" },
  { id: "call", label: "Phone", icon: Phone, description: "Cold call scripts with objection handling" },
  { id: "linkedin", label: "LinkedIn", icon: Linkedin, description: "Connection requests and DM sequences" },
] as const;

export default function NewCampaignPage() {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedChannels, setSelectedChannels] = useState<string[]>(["email"]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  function toggleChannel(channelId: string) {
    setSelectedChannels((prev) =>
      prev.includes(channelId) ? prev.filter((c) => c !== channelId) : [...prev, channelId]
    );
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || selectedChannels.length === 0) return;
    setLoading(true);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("outreach_campaigns")
      .insert({ user_id: user.id, name, description: description || null, channels: selectedChannels as OutreachChannel[], status: "draft" })
      .select()
      .single();

    if (error) { toast.error("Failed to create campaign"); setLoading(false); return; }
    toast.success("Campaign created");
    router.push(`/outreach/campaigns/${(data as any).id}`);
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link href="/outreach" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"><ArrowLeft className="h-3 w-3" /> Back to Outreach</Link>
      <div><h1 className="text-2xl font-bold tracking-tight">New Campaign</h1><p className="text-sm text-muted-foreground">Set up a multi-channel outreach campaign</p></div>

      <form onSubmit={handleCreate} className="space-y-6">
        <Card className="border-border/50">
          <CardHeader><CardTitle className="text-sm">Campaign Details</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2"><Label htmlFor="name">Campaign Name *</Label><Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Q1 Manufacturing Outreach" required /></div>
            <div className="space-y-2"><Label htmlFor="desc">Description</Label><Textarea id="desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Target manufacturing businesses in TX with $1-5M revenue..." /></div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader><CardTitle className="text-sm">Outreach Channels</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {CHANNELS.map((channel) => {
              const Icon = channel.icon;
              return (
                <label key={channel.id} className="flex cursor-pointer items-center gap-3 rounded-lg border border-border/50 p-3 transition-colors hover:bg-muted/30">
                  <Checkbox checked={selectedChannels.includes(channel.id)} onCheckedChange={() => toggleChannel(channel.id)} />
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <div><p className="text-sm font-medium">{channel.label}</p><p className="text-xs text-muted-foreground">{channel.description}</p></div>
                </label>
              );
            })}
          </CardContent>
        </Card>

        <div className="flex items-center justify-between">
          <p className="flex items-center gap-1 text-xs text-muted-foreground"><Sparkles className="h-3 w-3" /> AI will generate personalized content for each channel</p>
          <Button type="submit" disabled={loading || !name.trim() || selectedChannels.length === 0}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Create Campaign
          </Button>
        </div>
      </form>
    </div>
  );
}
