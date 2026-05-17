import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Workflow, ArrowRight } from "lucide-react";
import Link from "next/link";

export default async function SequencesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: campaigns } = await supabase.from("outreach_campaigns").select("id, name, status, channels").eq("user_id", user.id).order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold tracking-tight">Sequences</h1><p className="text-sm text-muted-foreground">Multi-step outreach sequences across channels</p></div>
      {!campaigns || campaigns.length === 0 ? (
        <Card className="border-border/50"><CardContent className="flex flex-col items-center justify-center py-16 text-center"><Workflow className="h-10 w-10 text-muted-foreground/50" /><p className="mt-3 text-sm font-medium">No sequences yet</p><p className="mt-1 text-xs text-muted-foreground">Create a campaign to set up multi-step outreach sequences</p></CardContent></Card>
      ) : (
        <div className="space-y-3">{campaigns.map((campaign: any) => (
          <Link key={campaign.id} href={`/outreach/campaigns/${campaign.id}`}><Card className="cursor-pointer border-border/50 transition-colors hover:border-border hover:bg-muted/20"><CardContent className="flex items-center gap-4 p-4"><Workflow className="h-5 w-5 text-muted-foreground" /><div className="flex-1"><p className="font-medium">{campaign.name}</p><div className="mt-1 flex items-center gap-2"><Badge variant={campaign.status === "active" ? "default" : "secondary"}>{campaign.status}</Badge>{(campaign.channels as string[])?.map((ch: string) => <Badge key={ch} variant="outline" className="text-xs">{ch}</Badge>)}</div></div><ArrowRight className="h-4 w-4 text-muted-foreground" /></CardContent></Card></Link>
        ))}</div>
      )}
    </div>
  );
}
