"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Mail, Phone, Linkedin, Brain, Calendar, XCircle, CheckCircle2, Loader2, ExternalLink } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

const INTEGRATIONS = [
  { id: "anthropic", icon: Brain, name: "Claude AI", description: "Anthropic API for AI-powered analysis and generation", envKey: "ANTHROPIC_API_KEY", color: "text-primary", oauth: false },
  { id: "resend", icon: Mail, name: "Resend", description: "Transactional email for outreach campaigns", envKey: "RESEND_API_KEY", color: "text-blue-500", oauth: false },
  { id: "twilio", icon: Phone, name: "Twilio", description: "Voice calls and SMS messaging", envKey: "TWILIO_ACCOUNT_SID", color: "text-red-500", oauth: false },
  { id: "google_calendar", icon: Calendar, name: "Google Calendar", description: "Auto-book meetings from positive outreach replies", envKey: "GOOGLE_CLIENT_ID", color: "text-green-500", oauth: true },
  { id: "linkedin", icon: Linkedin, name: "LinkedIn", description: "Connection requests and DM automation", envKey: "LINKEDIN_ACCESS_TOKEN", color: "text-blue-600", oauth: false },
];

export default function IntegrationsPage() {
  const [statuses, setStatuses] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const calendarStatus = searchParams.get("calendar");
  const error = searchParams.get("error");

  useEffect(() => {
    fetch("/api/scanner/status")
      .then((r) => r.json())
      .then((data) => {
        setStatuses(data.configured || {});
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleConnect = async (integrationId: string) => {
    if (integrationId === "google_calendar") {
      setConnecting(integrationId);
      try {
        const res = await fetch("/api/calendar/connect");
        const data = await res.json();
        if (data.url) {
          window.location.href = data.url;
        }
      } catch {
        setConnecting(null);
      }
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link href="/settings" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"><ArrowLeft className="h-3 w-3" /> Back to Settings</Link>
      <div><h1 className="text-2xl font-bold tracking-tight">Integrations</h1><p className="text-sm text-muted-foreground">Connect external services for full platform capability</p></div>

      {calendarStatus === "connected" && (
        <Card className="border-green-500/30 bg-green-500/5">
          <CardContent className="flex items-center gap-2 p-3 text-sm text-green-600">
            <CheckCircle2 className="h-4 w-4" />
            Google Calendar connected successfully! Positive outreach replies will now auto-book meetings.
          </CardContent>
        </Card>
      )}

      {error && (
        <Card className="border-red-500/30 bg-red-500/5">
          <CardContent className="flex items-center gap-2 p-3 text-sm text-red-600">
            <XCircle className="h-4 w-4" />
            Connection error: {decodeURIComponent(error)}
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">{INTEGRATIONS.map((integration) => { const Icon = integration.icon; const isConnected = statuses[integration.id]; return (
        <Card key={integration.id} className="border-border/50"><CardContent className="flex items-center gap-4 p-4">
          <Icon className={`h-6 w-6 ${integration.color}`} />
          <div className="min-w-0 flex-1"><div className="flex items-center gap-2"><p className="font-medium">{integration.name}</p>
            {loading ? (
              <Badge variant="secondary" className="text-xs"><Loader2 className="mr-1 h-3 w-3 animate-spin" />Checking...</Badge>
            ) : isConnected ? (
              <Badge variant="secondary" className="bg-green-500/10 text-green-600 text-xs"><CheckCircle2 className="mr-1 h-3 w-3" />Connected</Badge>
            ) : (
              <Badge variant="secondary" className="bg-red-500/10 text-red-600 text-xs"><XCircle className="mr-1 h-3 w-3" />Not Connected</Badge>
            )}
          </div><p className="text-xs text-muted-foreground">{integration.description}</p>
          {!integration.oauth && (
            <p className="mt-1 font-mono text-xs text-muted-foreground">ENV: {integration.envKey}</p>
          )}
          </div>
          {integration.oauth && !isConnected && !loading && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleConnect(integration.id)}
              disabled={connecting === integration.id}
            >
              {connecting === integration.id ? (
                <><Loader2 className="mr-1 h-3 w-3 animate-spin" />Connecting...</>
              ) : (
                <><ExternalLink className="mr-1 h-3 w-3" />Connect</>
              )}
            </Button>
          )}
        </CardContent></Card>
      ); })}</div>
      <Card className="border-border/50 bg-muted/20"><CardContent className="p-4"><p className="text-sm font-medium">Configuration</p><p className="mt-1 text-xs text-muted-foreground">API keys are configured via environment variables in your .env.local file. OAuth integrations (Google Calendar) can be connected using the button above.</p></CardContent></Card>
    </div>
  );
}
