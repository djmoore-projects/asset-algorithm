import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { User, Key, Users, Target } from "lucide-react";
import Link from "next/link";
import type { Database } from "@/types/database";
type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];

const SETTINGS_LINKS = [
  { href: "/settings/integrations", icon: Key, title: "Integrations", description: "API keys, email, SMS, and LinkedIn connections" },
  { href: "/settings/team", icon: Users, title: "Team", description: "Manage team members and permissions" },
  { href: "/settings/icp", icon: Target, title: "Ideal Company Profile", description: "Configure your target acquisition criteria" },
];

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single() as unknown as { data: ProfileRow | null };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div><h1 className="text-2xl font-bold tracking-tight">Settings</h1><p className="text-sm text-muted-foreground">Manage your account and platform configuration</p></div>
      <Card className="border-border/50"><CardHeader><CardTitle className="flex items-center gap-2 text-sm"><User className="h-4 w-4" />Profile</CardTitle></CardHeader><CardContent className="space-y-3">
        <div className="flex items-center justify-between"><span className="text-sm text-muted-foreground">Name</span><span className="text-sm font-medium">{profile?.full_name || "Not set"}</span></div>
        <div className="flex items-center justify-between"><span className="text-sm text-muted-foreground">Email</span><span className="text-sm font-medium">{user.email}</span></div>
        <div className="flex items-center justify-between"><span className="text-sm text-muted-foreground">Role</span><Badge variant="outline">{profile?.role || "owner"}</Badge></div>
        <div className="flex items-center justify-between"><span className="text-sm text-muted-foreground">Company</span><span className="text-sm font-medium">{profile?.company_name || "Not set"}</span></div>
      </CardContent></Card>
      <div className="space-y-3">{SETTINGS_LINKS.map((link) => { const Icon = link.icon; return (
        <Link key={link.href} href={link.href}><Card className="cursor-pointer border-border/50 transition-colors hover:border-border hover:bg-muted/20"><CardContent className="flex items-center gap-4 p-4"><Icon className="h-5 w-5 text-muted-foreground" /><div><p className="text-sm font-medium">{link.title}</p><p className="text-xs text-muted-foreground">{link.description}</p></div></CardContent></Card></Link>
      ); })}</div>
    </div>
  );
}
