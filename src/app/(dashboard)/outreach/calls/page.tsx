import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Phone, PhoneIncoming, Clock, Building2 } from "lucide-react";
import { format } from "date-fns";

const STATUS_COLORS: Record<string, string> = {
  completed: "bg-green-500/10 text-green-500",
  no_answer: "bg-primary/10 text-primary",
  voicemail: "bg-primary/10 text-primary",
  busy: "bg-primary/10 text-primary",
  failed: "bg-red-500/10 text-red-500",
};

export default async function CallsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: calls } = await supabase
    .from("calls")
    .select("*, contacts(first_name, last_name), companies(name)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Call Log</h1>
        <p className="text-sm text-muted-foreground">
          Track all outbound and inbound calls
        </p>
      </div>

      {!calls || calls.length === 0 ? (
        <Card className="border-border/50">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Phone className="h-10 w-10 text-muted-foreground/50" />
            <p className="mt-3 text-sm font-medium">No calls yet</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Call records will appear here when you start making outreach calls
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {calls.map((call: any) => (
            <Card key={call.id} className="border-border/50">
              <CardContent className="flex items-center gap-4 p-4">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-full ${call.direction === "outbound" ? "bg-primary/10" : "bg-green-500/10"}`}
                >
                  {call.direction === "outbound" ? (
                    <Phone className="h-4 w-4 text-primary" />
                  ) : (
                    <PhoneIncoming className="h-4 w-4 text-green-500" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    {call.contacts && (
                      <p className="text-sm font-medium">
                        {call.contacts.first_name} {call.contacts.last_name}
                      </p>
                    )}
                    {call.companies && (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Building2 className="h-3 w-3" />
                        {call.companies.name}
                      </span>
                    )}
                  </div>
                  <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                    <span>{call.phone_number}</span>
                    {call.duration_seconds && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {Math.floor(call.duration_seconds / 60)}:
                        {String(call.duration_seconds % 60).padStart(2, "0")}
                      </span>
                    )}
                    <span>{format(new Date(call.created_at), "MMM d, h:mm a")}</span>
                  </div>
                </div>
                <Badge className={STATUS_COLORS[call.status] || ""}>
                  {call.status}
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
