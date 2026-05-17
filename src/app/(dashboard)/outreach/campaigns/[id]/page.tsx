"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Plus,
  Loader2,
  Mail,
  MessageSquare,
  Phone,
  Linkedin,
  Clock,
  Send,
  Sparkles,
  Users,
  Play,
  Pause,
  Trash2,
  UserPlus,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import type { OutreachChannel } from "@/types/database";

const CHANNEL_ICONS: Record<string, any> = {
  email: Mail,
  sms: MessageSquare,
  call: Phone,
  linkedin: Linkedin,
};

const CHANNEL_AI_TYPE: Record<string, string> = {
  email: "email",
  sms: "sms",
  call: "call_script",
  linkedin: "linkedin_dm",
};

export default function CampaignDetailPage() {
  const params = useParams();
  const router = useRouter();
  const campaignId = params.id as string;

  const [campaign, setCampaign] = useState<any>(null);
  const [sequences, setSequences] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [allContacts, setAllContacts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Add step dialog
  const [showAddStep, setShowAddStep] = useState(false);
  const [stepChannel, setStepChannel] = useState("email");
  const [stepDelay, setStepDelay] = useState("0");
  const [stepSubject, setStepSubject] = useState("");
  const [stepBody, setStepBody] = useState("");
  const [addingStep, setAddingStep] = useState(false);
  const [generatingAI, setGeneratingAI] = useState(false);

  // Add contacts dialog
  const [showAddContacts, setShowAddContacts] = useState(false);
  const [selectedContactIds, setSelectedContactIds] = useState<Set<string>>(new Set());
  const [contactSearch, setContactSearch] = useState("");
  const [addingContacts, setAddingContacts] = useState(false);

  // Launch
  const [launching, setLaunching] = useState(false);

  const supabase = createClient();

  const loadCampaign = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const [campRes, seqRes, msgRes] = await Promise.all([
      supabase.from("outreach_campaigns").select("*").eq("id", campaignId).single(),
      supabase.from("outreach_sequences").select("*").eq("campaign_id", campaignId).order("step_number"),
      supabase.from("outreach_messages").select("*, contacts(first_name, last_name, email), companies(name)").eq("campaign_id", campaignId).order("created_at", { ascending: false }).limit(20),
    ]);

    if (campRes.data) setCampaign(campRes.data);
    if (seqRes.data) setSequences(seqRes.data);
    if (msgRes.data) setMessages(msgRes.data);

    // Load assigned contacts
    const targetIds = (campRes.data as any)?.target_contact_ids || [];
    if (targetIds.length > 0) {
      const { data: assignedContacts } = await supabase
        .from("contacts")
        .select("id, first_name, last_name, email, phone, company_id, companies(name)")
        .in("id", targetIds);
      if (assignedContacts) setContacts(assignedContacts);
    }

    setLoading(false);
  }, [campaignId]);

  useEffect(() => {
    loadCampaign();
  }, [loadCampaign]);

  async function loadAllContacts() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("contacts")
      .select("id, first_name, last_name, email, phone, company_id, companies(name)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(100);
    if (data) setAllContacts(data);
  }

  async function handleAddStep() {
    if (!stepBody.trim()) { toast.error("Message body is required"); return; }
    setAddingStep(true);

    const nextStep = sequences.length + 1;
    const { data, error } = await supabase
      .from("outreach_sequences")
      .insert({
        campaign_id: campaignId,
        step_number: nextStep,
        channel: stepChannel as OutreachChannel,
        delay_days: parseInt(stepDelay) || 0,
        subject_template: stepSubject || null,
        body_template: stepBody,
        ai_generated: generatingAI,
      })
      .select()
      .single();

    if (error) { toast.error("Failed to add step"); setAddingStep(false); return; }
    setSequences((prev) => [...prev, data]);
    setShowAddStep(false);
    setStepSubject("");
    setStepBody("");
    setStepDelay("0");
    setAddingStep(false);
    toast.success(`Step ${nextStep} added`);
  }

  async function handleDeleteStep(stepId: string) {
    const { error } = await supabase.from("outreach_sequences").delete().eq("id", stepId);
    if (error) { toast.error("Failed to delete step"); return; }
    setSequences((prev) => prev.filter((s) => s.id !== stepId));
    toast.success("Step removed");
  }

  async function generateAIContent() {
    setGeneratingAI(true);
    try {
      // Gather context about the campaign, sequence position, and previous steps
      const context: any = {
        campaign_name: campaign?.name,
        campaign_description: campaign?.description,
        campaign_goal: campaign?.description || campaign?.name,
        channel: stepChannel,
        step_number: sequences.length + 1,
        total_steps_so_far: sequences.length,
        delay_days_from_previous: parseInt(stepDelay) || 0,
        previous_steps: sequences
          .sort((a: any, b: any) => a.step_number - b.step_number)
          .map((s: any) => ({
            step_number: s.step_number,
            channel: s.channel,
            delay_days: s.delay_days,
            subject: s.subject_template || null,
            body_preview: (s.body_template || "").slice(0, 200),
          })),
      };

      // Add sample contact/company if available
      if (contacts.length > 0) {
        const sample = contacts[0];
        context.contact = {
          name: `${sample.first_name} ${sample.last_name}`,
          email: sample.email,
          company: sample.companies?.name,
        };
      }

      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          type: CHANNEL_AI_TYPE[stepChannel] || "email",
          context,
        }),
      });

      if (!res.ok) {
        let errorMsg = "Generation failed";
        try {
          const errData = await res.json();
          errorMsg = errData.error || `HTTP ${res.status}: ${res.statusText}`;
        } catch {
          errorMsg = `HTTP ${res.status}: ${res.statusText}`;
        }
        console.error("AI generate error:", errorMsg);
        toast.error(errorMsg);
        return;
      }

      const data = await res.json();

      // Parse the response — try to extract subject and body for emails
      const content = data.content || "";
      if (!content) {
        toast.error("AI returned empty content");
        return;
      }

      if (stepChannel === "email") {
        // Extract subject line
        const subjectMatch = content.match(/Subject:\s*(.+)/i);
        let body = content;
        if (subjectMatch) {
          setStepSubject(subjectMatch[1].trim());
          body = content.replace(/Subject:\s*.+\n?/i, "").trim();
        }
        // Strip any AI preamble (lines before "Hi/Hey/Dear/Hello" or the salutation)
        const salutationMatch = body.match(/^([\s\S]*?)((?:Hi|Hey|Hello|Dear|Good morning|Good afternoon)\b[\s\S]*)$/i);
        if (salutationMatch && salutationMatch[2]) {
          body = salutationMatch[2].trim();
        }
        // Strip trailing AI notes/commentary (anything after a signature-like ending)
        const trailingMatch = body.match(/([\s\S]*?(?:Best,?|Regards,?|Sincerely,?|Thank you,?|Thanks,?|Cheers,?|Warm regards,?)[\s\S]*?\n\{?name\}?)([\s\S]*)/i);
        if (trailingMatch) {
          body = trailingMatch[1].trim();
        }
        setStepBody(body);
      } else if (stepChannel === "call") {
        // For call scripts, strip any preamble before the actual script
        let script = content;
        const scriptStart = script.match(/(Opening|OPENING|\*\*Opening|## Opening|Step 1)/i);
        if (scriptStart && scriptStart.index && scriptStart.index > 50) {
          script = script.slice(scriptStart.index);
        }
        setStepBody(script.trim());
      } else {
        // SMS / LinkedIn — just the raw message, strip quotes/preamble
        let msg = content.trim();
        // If AI wrapped it in quotes, strip them
        if (msg.startsWith('"') && msg.endsWith('"')) {
          msg = msg.slice(1, -1);
        }
        setStepBody(msg);
      }

      toast.success("AI content generated");
    } catch (err: any) {
      console.error("AI generate exception:", err);
      toast.error(err?.message || "Failed to generate content");
    } finally {
      setGeneratingAI(false);
    }
  }

  async function handleAddContacts() {
    if (selectedContactIds.size === 0) return;
    setAddingContacts(true);

    const existingIds = campaign?.target_contact_ids || [];
    const newIds = [...new Set([...existingIds, ...Array.from(selectedContactIds)])];

    const { error } = await supabase
      .from("outreach_campaigns")
      .update({ target_contact_ids: newIds })
      .eq("id", campaignId);

    if (error) { toast.error("Failed to add contacts"); setAddingContacts(false); return; }

    setCampaign((prev: any) => ({ ...prev, target_contact_ids: newIds }));

    // Reload contacts
    const { data: updated } = await supabase
      .from("contacts")
      .select("id, first_name, last_name, email, phone, company_id, companies(name)")
      .in("id", newIds);
    if (updated) setContacts(updated);

    setShowAddContacts(false);
    setSelectedContactIds(new Set());
    setAddingContacts(false);
    toast.success(`${selectedContactIds.size} contacts added to campaign`);
  }

  async function handleRemoveContact(contactId: string) {
    const newIds = (campaign?.target_contact_ids || []).filter((id: string) => id !== contactId);
    await supabase.from("outreach_campaigns").update({ target_contact_ids: newIds }).eq("id", campaignId);
    setCampaign((prev: any) => ({ ...prev, target_contact_ids: newIds }));
    setContacts((prev) => prev.filter((c) => c.id !== contactId));
    toast.success("Contact removed");
  }

  async function handleLaunch() {
    if (sequences.length === 0) { toast.error("Add at least one sequence step first"); return; }
    if (contacts.length === 0) { toast.error("Add contacts to the campaign first"); return; }
    setLaunching(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { toast.error("Not authenticated"); setLaunching(false); return; }

      // Create and send messages for each contact × first sequence step
      const firstStep = sequences.sort((a: any, b: any) => a.step_number - b.step_number)[0];
      let sentCount = 0;
      let errorCount = 0;

      for (const contact of contacts) {
        // Generate personalized content for each contact
        let subject = firstStep.subject_template || "";
        let body = firstStep.body_template || "";

        // Simple template variable replacement
        const name = `${contact.first_name} ${contact.last_name || ""}`.trim();
        const company = contact.companies?.name || "your company";
        subject = subject.replace(/\{name\}/gi, name).replace(/\{company\}/gi, company);
        body = body.replace(/\{name\}/gi, name).replace(/\{company\}/gi, company);

        // Determine the to_address based on channel
        const toAddress = firstStep.channel === "email"
          ? contact.email
          : firstStep.channel === "sms"
            ? contact.phone
            : contact.email || contact.phone || null;

        // Insert the message as pending first
        const { data: msgData, error: insertError } = await supabase.from("outreach_messages").insert({
          user_id: user.id,
          sequence_id: firstStep.id,
          contact_id: contact.id,
          company_id: contact.company_id || null,
          campaign_id: campaignId,
          channel: firstStep.channel as OutreachChannel,
          status: "pending",
          scheduled_at: new Date().toISOString(),
          subject: subject || null,
          body,
          to_address: toAddress || null,
        }).select().single();

        if (insertError) {
          console.error("Failed to insert message:", insertError);
          errorCount++;
          continue;
        }

        // Actually send the message via the API
        try {
          let sendSuccess = false;

          if (firstStep.channel === "email" && contact.email) {
            const res = await fetch("/api/outreach/email", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify({
                to: contact.email,
                subject: subject || campaign.name,
                html: body,
                contactId: contact.id,
                campaignId,
                sequenceId: firstStep.id,
              }),
            });
            sendSuccess = res.ok;
            if (!res.ok) {
              const errData = await res.json().catch(() => ({}));
              console.error("Email send failed:", errData.error || res.statusText);
            }
          } else if (firstStep.channel === "sms" && contact.phone) {
            const res = await fetch("/api/outreach/sms", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify({
                to: contact.phone,
                body,
                contactId: contact.id,
                campaignId,
              }),
            });
            sendSuccess = res.ok;
            if (!res.ok) {
              const errData = await res.json().catch(() => ({}));
              console.error("SMS send failed:", errData.error || res.statusText);
            }
          } else if (firstStep.channel === "call" && contact.phone) {
            const res = await fetch("/api/outreach/call", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify({
                to: contact.phone,
                contactId: contact.id,
                companyId: contact.company_id || null,
              }),
            });
            sendSuccess = res.ok;
          } else if (firstStep.channel === "linkedin") {
            // LinkedIn is manual — mark as pending_manual so user knows to act
            sendSuccess = true; // We'll mark it differently
          }

          if (sendSuccess && msgData) {
            // LinkedIn is manual — mark as pending instead of sent
            const newStatus = firstStep.channel === "linkedin" ? "pending" : "sent";
            await supabase.from("outreach_messages")
              .update({ status: newStatus, sent_at: new Date().toISOString() })
              .eq("id", (msgData as any).id);
            sentCount++;
          } else if (msgData) {
            // Mark as failed if send didn't succeed
            await supabase.from("outreach_messages")
              .update({ status: "failed" })
              .eq("id", (msgData as any).id);
            errorCount++;
          }
        } catch (sendErr: any) {
          console.error("Send error for contact:", contact.id, sendErr);
          if (msgData) {
            await supabase.from("outreach_messages")
              .update({ status: "failed" })
              .eq("id", (msgData as any).id);
          }
          errorCount++;
        }
      }

      // Update campaign status and stats
      const existingStats = campaign.stats || {};
      const updatedStats = {
        ...existingStats,
        sent: (existingStats.sent || 0) + sentCount,
        failed: (existingStats.failed || 0) + errorCount,
        total: (existingStats.total || 0) + contacts.length,
      };

      await supabase
        .from("outreach_campaigns")
        .update({ status: "active", stats: updatedStats })
        .eq("id", campaignId);

      setCampaign((prev: any) => ({ ...prev, status: "active", stats: updatedStats }));

      if (errorCount > 0) {
        toast.success(`Campaign launched! ${sentCount} sent, ${errorCount} failed.`);
      } else {
        toast.success(`Campaign launched! ${sentCount} messages sent.`);
      }
      loadCampaign();
    } catch (e: any) {
      toast.error(e.message || "Launch failed");
    } finally {
      setLaunching(false);
    }
  }

  async function handlePause() {
    await supabase.from("outreach_campaigns").update({ status: "paused" }).eq("id", campaignId);
    setCampaign((prev: any) => ({ ...prev, status: "paused" }));
    toast.success("Campaign paused");
  }

  const filteredContacts = allContacts.filter((c) => {
    const existing = new Set(campaign?.target_contact_ids || []);
    if (existing.has(c.id)) return false;
    if (!contactSearch) return true;
    const search = contactSearch.toLowerCase();
    return (
      c.first_name?.toLowerCase().includes(search) ||
      c.last_name?.toLowerCase().includes(search) ||
      c.email?.toLowerCase().includes(search) ||
      c.companies?.name?.toLowerCase().includes(search)
    );
  });

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  if (!campaign) {
    return <div className="py-20 text-center text-muted-foreground">Campaign not found</div>;
  }

  const stats = campaign.stats || {};
  const channels = campaign.channels?.length > 0 ? campaign.channels : ["email", "sms", "call", "linkedin"];

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link href="/outreach" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3 w-3" /> Back to Outreach
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{campaign.name}</h1>
          {campaign.description && (
            <p className="mt-1 text-sm text-muted-foreground">{campaign.description}</p>
          )}
          <div className="mt-2 flex items-center gap-2">
            <Badge variant={campaign.status === "active" ? "default" : campaign.status === "paused" ? "secondary" : "outline"}>
              {campaign.status}
            </Badge>
            {channels.map((ch: string) => {
              const Icon = CHANNEL_ICONS[ch] || Mail;
              return (
                <Badge key={ch} variant="outline" className="gap-1">
                  <Icon className="h-3 w-3" />
                  {ch}
                </Badge>
              );
            })}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {campaign.status === "draft" && (
            <Button onClick={handleLaunch} disabled={launching} size="sm">
              {launching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
              Launch Campaign
            </Button>
          )}
          {campaign.status === "active" && (
            <Button onClick={handlePause} variant="outline" size="sm">
              <Pause className="mr-2 h-4 w-4" />
              Pause
            </Button>
          )}
          {campaign.status === "paused" && (
            <Button onClick={handleLaunch} size="sm">
              <Play className="mr-2 h-4 w-4" />
              Resume
            </Button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="border-border/50"><CardContent className="p-4 text-center"><p className="text-2xl font-bold">{stats.sent || 0}</p><p className="text-xs text-muted-foreground">Sent</p></CardContent></Card>
        <Card className="border-border/50"><CardContent className="p-4 text-center"><p className="text-2xl font-bold">{stats.opened || 0}</p><p className="text-xs text-muted-foreground">Opened</p></CardContent></Card>
        <Card className="border-border/50"><CardContent className="p-4 text-center"><p className="text-2xl font-bold">{stats.replied || 0}</p><p className="text-xs text-muted-foreground">Replied</p></CardContent></Card>
        <Card className="border-border/50"><CardContent className="p-4 text-center"><p className="text-2xl font-bold">{stats.meetings_booked || 0}</p><p className="text-xs text-muted-foreground">Meetings</p></CardContent></Card>
      </div>

      {/* Sequence Steps */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold">
              Sequence Steps ({sequences.length})
            </CardTitle>
            <Dialog open={showAddStep} onOpenChange={setShowAddStep}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="h-7 text-xs">
                  <Plus className="mr-1 h-3 w-3" /> Add Step
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg max-h-[90vh] flex flex-col">
                <DialogHeader className="shrink-0">
                  <DialogTitle>Add Sequence Step</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 overflow-y-auto flex-1 pr-1">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Channel</Label>
                      <Select value={stepChannel} onValueChange={setStepChannel}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {channels.map((ch: string) => (
                            <SelectItem key={ch} value={ch}>
                              <span className="capitalize">{ch}</span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Delay (days after previous)</Label>
                      <Input type="number" min="0" value={stepDelay} onChange={(e) => setStepDelay(e.target.value)} />
                    </div>
                  </div>
                  {stepChannel === "email" && (
                    <div className="space-y-2">
                      <Label>Subject Line</Label>
                      <Input value={stepSubject} onChange={(e) => setStepSubject(e.target.value)} placeholder="Quick question about {company}" />
                    </div>
                  )}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Message Body</Label>
                      <Button variant="ghost" size="sm" className="h-6 text-[10px] gap-1" onClick={generateAIContent} disabled={generatingAI}>
                        {generatingAI ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                        Generate with AI
                      </Button>
                    </div>
                    <Textarea
                      value={stepBody}
                      onChange={(e) => setStepBody(e.target.value)}
                      placeholder="Hi {name}, I came across {company} and was impressed by..."
                      className="min-h-[120px] max-h-[40vh] resize-y"
                    />
                    <p className="text-[10px] text-muted-foreground">
                      Use {"{name}"}, {"{company}"} as template variables
                    </p>
                  </div>
                </div>
                <div className="flex justify-end gap-2 shrink-0 pt-2 border-t border-border/50">
                  <Button variant="outline" onClick={() => setShowAddStep(false)}>Cancel</Button>
                  <Button onClick={handleAddStep} disabled={addingStep || !stepBody.trim()}>
                    {addingStep && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Add Step {sequences.length + 1}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {sequences.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Zap className="mb-2 h-8 w-8 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">No sequence steps yet</p>
              <p className="text-xs text-muted-foreground">Add steps to define your outreach flow</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sequences.sort((a: any, b: any) => a.step_number - b.step_number).map((step: any) => {
                const Icon = CHANNEL_ICONS[step.channel] || Mail;
                return (
                  <div key={step.id} className="flex items-start gap-3 rounded-lg border border-border/30 p-3 group">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                      {step.step_number}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                        <p className="text-sm font-medium capitalize">{step.channel}</p>
                        {step.ai_generated && (
                          <Badge variant="outline" className="text-[10px] gap-1">
                            <Sparkles className="h-2.5 w-2.5" /> AI
                          </Badge>
                        )}
                      </div>
                      {step.subject_template && (
                        <p className="mt-1 text-xs font-medium">Subject: {step.subject_template}</p>
                      )}
                      <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                        {step.body_template}
                      </p>
                      <div className="mt-1 flex items-center gap-2 text-[10px] text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {step.delay_days === 0 ? "Send immediately" : `Wait ${step.delay_days} day${step.delay_days > 1 ? "s" : ""}`}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                      onClick={() => handleDeleteStep(step.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Assigned Contacts */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold">
              Contacts ({contacts.length})
            </CardTitle>
            <Dialog open={showAddContacts} onOpenChange={(open) => { setShowAddContacts(open); if (open) loadAllContacts(); }}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="h-7 text-xs">
                  <UserPlus className="mr-1 h-3 w-3" /> Add Contacts
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg max-h-[90vh] flex flex-col">
                <DialogHeader className="shrink-0">
                  <DialogTitle>Add Contacts to Campaign</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
                  <Input
                    className="shrink-0"
                    placeholder="Search contacts..."
                    value={contactSearch}
                    onChange={(e) => setContactSearch(e.target.value)}
                  />
                  <div className="flex-1 overflow-y-auto space-y-1 min-h-0 max-h-[50vh]">
                    {filteredContacts.length === 0 ? (
                      <p className="py-4 text-center text-xs text-muted-foreground">
                        {allContacts.length === 0 ? "No contacts yet — import some from the Scanner first" : "No matching contacts"}
                      </p>
                    ) : (
                      filteredContacts.map((c) => (
                        <label key={c.id} className="flex cursor-pointer items-center gap-3 rounded-lg p-2 hover:bg-muted/50">
                          <Checkbox
                            checked={selectedContactIds.has(c.id)}
                            onCheckedChange={(checked) => {
                              setSelectedContactIds((prev) => {
                                const next = new Set(prev);
                                if (checked) next.add(c.id); else next.delete(c.id);
                                return next;
                              });
                            }}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium">{c.first_name} {c.last_name}</p>
                            <p className="text-xs text-muted-foreground truncate">
                              {c.companies?.name || "No company"} {c.email ? `• ${c.email}` : ""}
                            </p>
                          </div>
                        </label>
                      ))
                    )}
                  </div>
                </div>
                <div className="flex justify-between items-center shrink-0 pt-2 border-t border-border/50">
                  <p className="text-xs text-muted-foreground">{selectedContactIds.size} selected</p>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setShowAddContacts(false)}>Cancel</Button>
                    <Button onClick={handleAddContacts} disabled={addingContacts || selectedContactIds.size === 0}>
                      {addingContacts && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Add {selectedContactIds.size} Contacts
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {contacts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Users className="mb-2 h-8 w-8 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">No contacts assigned</p>
              <p className="text-xs text-muted-foreground">Add contacts from your Relationships to target</p>
            </div>
          ) : (
            <div className="space-y-1">
              {contacts.map((c) => (
                <div key={c.id} className="flex items-center justify-between rounded-lg p-2 group hover:bg-muted/30">
                  <div className="flex items-center gap-3">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-xs font-medium">
                      {c.first_name?.[0]}{c.last_name?.[0]}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{c.first_name} {c.last_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {c.companies?.name || "No company"} {c.email ? `• ${c.email}` : ""} {c.phone ? `• ${c.phone}` : ""}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                    onClick={() => handleRemoveContact(c.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Messages */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">
            Messages ({messages.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {messages.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No messages sent yet — launch the campaign to start outreach
            </p>
          ) : (
            <div className="space-y-2">
              {messages.map((msg: any) => (
                <div key={msg.id} className="flex items-center gap-3 rounded-lg border border-border/30 p-2">
                  <Send className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">
                      {msg.contacts ? `${msg.contacts.first_name} ${msg.contacts.last_name}` : "Unknown"}
                      {msg.companies?.name ? ` — ${msg.companies.name}` : ""}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {msg.subject || msg.body?.slice(0, 80)}
                    </p>
                  </div>
                  <Badge variant={msg.status === "sent" ? "default" : msg.status === "replied" ? "default" : "outline"} className="text-[10px] shrink-0">
                    {msg.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
