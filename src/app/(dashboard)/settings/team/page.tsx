import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Users, Crown } from "lucide-react";
import Link from "next/link";
import type { Database } from "@/types/database";
type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];

export default async function TeamPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single() as unknown as { data: ProfileRow | null };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link href="/settings" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"><ArrowLeft className="h-3 w-3" /> Back to Settings</Link>
      <div><h1 className="text-2xl font-bold tracking-tight">Team</h1><p className="text-sm text-muted-foreground">Manage team members and access</p></div>
      <Card className="border-border/50"><CardHeader><CardTitle className="text-sm">Current Members</CardTitle></CardHeader><CardContent>
        <div className="flex items-center gap-4 rounded-lg border border-border/30 p-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">{profile?.full_name?.charAt(0) || user.email?.charAt(0)?.toUpperCase()}</div>
          <div className="flex-1"><p className="text-sm font-medium">{profile?.full_name || "You"}</p><p className="text-xs text-muted-foreground">{user.email}</p></div>
          <Badge><Crown className="mr-1 h-3 w-3" />{profile?.role || "owner"}</Badge>
        </div>
      </CardContent></Card>
      <Card className="border-border/50 bg-muted/20"><CardContent className="p-4 text-center"><Users className="mx-auto h-8 w-8 text-muted-foreground/50" /><p className="mt-2 text-sm font-medium">Team features coming soon</p><p className="mt-1 text-xs text-muted-foreground">Invite team members to collaborate on deal sourcing and pipeline management</p></CardContent></Card>
    </div>
  );
}
