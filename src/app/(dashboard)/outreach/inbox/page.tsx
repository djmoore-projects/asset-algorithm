"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Inbox, Search, Mail, MessageSquare, Phone, ArrowRight, Loader2 } from "lucide-react";
import type { OutreachChannel, MessageStatus, Sentiment } from "@/types/database";

interface ContactWithCompany {
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  company_id: string | null;
  companies: { name: string } | null;
}

interface OutreachMessageWithContact {
  id: string;
  channel: OutreachChannel;
  status: MessageStatus;
  subject: string | null;
  body: string;
  contact_id: string;
  replied_at: string | null;
  updated_at?: string | null;
  reply_body?: string | null;
  sentiment?: Sentiment | null;
  contacts: ContactWithCompany | null;
}

interface OutreachReplyWithMessage {
  id: string;
  message_id: string;
  channel: OutreachChannel;
  body: string;
  sentiment: Sentiment | null;
  received_at: string;
  outreach_messages: OutreachMessageWithContact | null;
}

export default function InboxPage() {
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const supabase = createClient();

  const CHANNEL_ICONS: Record<string, any> = {
    email: Mail,
    sms: MessageSquare,
    linkedin: MessageSquare,
    call: Phone,
  };

  const SENTIMENT_COLORS: Record<string, string> = {
    positive: "text-green-600",
    neutral: "text-muted-foreground",
    negative: "text-red-600",
  };

  const fetchMessages = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch replies from outreach_replies joined with outreach_messages and contacts
      const { data: repliesRaw } = await supabase
        .from("outreach_replies")
        .select("*, outreach_messages(*, contacts(first_name, last_name, email, phone, company_id, companies(name)))")
        .order("received_at", { ascending: false })
        .limit(50);
      const replies = repliesRaw as unknown as OutreachReplyWithMessage[] | null;

      const inboxMessages: any[] = [];

      if (replies && replies.length > 0) {
        for (const reply of replies) {
          const msg = reply.outreach_messages;
          const contact = msg?.contacts;
          const contactName = contact
            ? `${contact.first_name || ""} ${contact.last_name || ""}`.trim()
            : "Unknown";
          const company = contact?.companies?.name || "";

          inboxMessages.push({
            id: reply.id,
            from: contactName,
            company,
            channel: msg?.channel || reply.channel || "email",
            subject: msg?.subject || null,
            body: reply.body || "",
            sentiment: reply.sentiment || "neutral",
            received_at: reply.received_at,
            contact_id: msg?.contact_id,
            message_id: reply.message_id,
          });
        }
      }

      // Fallback: also fetch outreach_messages with status "replied" that may not have a reply row yet
      const { data: repliedMessagesRaw } = await supabase
        .from("outreach_messages")
        .select("*, contacts(first_name, last_name, email, phone, company_id, companies(name))")
        .eq("status", "replied")
        .order("replied_at", { ascending: false })
        .limit(50);
      const repliedMessages = repliedMessagesRaw as unknown as OutreachMessageWithContact[] | null;

      if (repliedMessages && repliedMessages.length > 0) {
        const existingMessageIds = new Set(inboxMessages.map((m) => m.message_id));

        for (const msg of repliedMessages) {
          // Skip if we already have a reply entry for this message
          if (existingMessageIds.has(msg.id)) continue;

          const contact = msg.contacts;
          const contactName = contact
            ? `${contact.first_name || ""} ${contact.last_name || ""}`.trim()
            : "Unknown";
          const company = contact?.companies?.name || "";

          inboxMessages.push({
            id: `msg-${msg.id}`,
            from: contactName,
            company,
            channel: msg.channel || "email",
            subject: msg.subject || null,
            body: msg.reply_body || msg.body || "",
            sentiment: msg.sentiment || "neutral",
            received_at: msg.replied_at || msg.updated_at,
            contact_id: msg.contact_id,
            message_id: msg.id,
          });
        }
      }

      // Sort all messages by received_at descending
      inboxMessages.sort((a, b) => {
        const dateA = new Date(a.received_at || 0).getTime();
        const dateB = new Date(b.received_at || 0).getTime();
        return dateB - dateA;
      });

      setMessages(inboxMessages);
    } catch (err) {
      console.error("Failed to fetch inbox messages:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  const filteredMessages = messages.filter((m) => {
    if (filter !== "all" && m.channel !== filter) return false;
    if (search) {
      const q = search.toLowerCase();
      const matchesSubject = m.subject?.toLowerCase().includes(q);
      const matchesFrom = m.from?.toLowerCase().includes(q);
      const matchesCompany = m.company?.toLowerCase().includes(q);
      const matchesBody = m.body?.toLowerCase().includes(q);
      if (!matchesSubject && !matchesFrom && !matchesCompany && !matchesBody) return false;
    }
    return true;
  });

  const selected = messages.find((m) => m.id === selectedId);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Unified Inbox</h1>
        <p className="text-sm text-muted-foreground">
          All inbound replies across email, SMS, and LinkedIn
        </p>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search messages..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Channels</SelectItem>
            <SelectItem value="email">Email</SelectItem>
            <SelectItem value="sms">SMS</SelectItem>
            <SelectItem value="linkedin">LinkedIn</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <div className="space-y-2 lg:col-span-2">
          {filteredMessages.length === 0 ? (
            <Card className="border-border/50">
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <Inbox className="h-10 w-10 text-muted-foreground/50" />
                <p className="mt-3 text-sm font-medium">Inbox empty</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Replies to your outreach campaigns will appear here
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredMessages.map((msg) => {
              const ChannelIcon = CHANNEL_ICONS[msg.channel] || Mail;
              return (
                <Card
                  key={msg.id}
                  className={`cursor-pointer border-border/50 transition-colors hover:border-border ${selectedId === msg.id ? "border-primary bg-muted/20" : ""}`}
                  onClick={() => setSelectedId(msg.id)}
                >
                  <CardContent className="p-3">
                    <div className="flex items-start gap-3">
                      <ChannelIcon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm font-medium">
                            {msg.from || "Unknown"}
                          </p>
                          {msg.company && (
                            <span className="truncate text-xs text-muted-foreground">
                              {msg.company}
                            </span>
                          )}
                        </div>
                        <p className="truncate text-xs text-muted-foreground">
                          {msg.subject || msg.body?.slice(0, 60)}
                        </p>
                        <div className="mt-1 flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {msg.channel}
                          </Badge>
                          {msg.sentiment && msg.sentiment !== "neutral" && (
                            <span className={`text-[10px] font-medium ${SENTIMENT_COLORS[msg.sentiment] || ""}`}>
                              {msg.sentiment}
                            </span>
                          )}
                          {msg.received_at && (
                            <span className="text-[10px] text-muted-foreground">
                              {new Date(msg.received_at).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        <div className="lg:col-span-3">
          {selected ? (
            <Card className="border-border/50">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium">
                    {selected.subject || "No subject"}
                  </h3>
                  {selected.sentiment && (
                    <Badge variant="outline" className={`text-xs ${SENTIMENT_COLORS[selected.sentiment] || ""}`}>
                      {selected.sentiment}
                    </Badge>
                  )}
                </div>
                <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                  <span>From: {selected.from}</span>
                  {selected.company && <span>at {selected.company}</span>}
                  {selected.received_at && (
                    <span>— {new Date(selected.received_at).toLocaleString()}</span>
                  )}
                </div>
                <p className="mt-4 whitespace-pre-wrap text-sm">{selected.body}</p>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-border/50">
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <ArrowRight className="h-8 w-8 text-muted-foreground/30" />
                <p className="mt-2 text-sm text-muted-foreground">
                  Select a message to view
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
