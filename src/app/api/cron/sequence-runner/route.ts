import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/integrations/resend";
import { sendSMS } from "@/lib/integrations/twilio";
import { safeCompare } from "@/lib/security";
import type { Json, OutreachChannel, MessageStatus, CampaignStatus } from "@/types/database";

// Join query result shapes (Supabase can't infer these from Relationships: [])
interface SequenceRow {
  id: string;
  campaign_id: string;
  step_number: number;
  channel: OutreachChannel;
  delay_days: number;
  subject_template: string | null;
  body_template: string | null;
  ai_generated: boolean;
  config: Json | null;
  created_at: string;
}

interface CampaignWithSequences {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  channels: OutreachChannel[];
  status: CampaignStatus;
  target_company_ids: string[];
  target_contact_ids: string[];
  ai_config: Json | null;
  stats: Json | null;
  created_at: string;
  updated_at: string;
  outreach_sequences: SequenceRow[];
}

interface MessageWithContact {
  id: string;
  user_id: string;
  sequence_id: string | null;
  contact_id: string;
  company_id: string | null;
  campaign_id: string | null;
  channel: OutreachChannel;
  status: MessageStatus;
  scheduled_at: string | null;
  sent_at: string | null;
  opened_at: string | null;
  replied_at: string | null;
  subject: string | null;
  body: string;
  to_address: string | null;
  provider_message_id: string | null;
  ai_personalization: Json | null;
  external_id: string | null;
  created_at: string;
  contacts: { email: string | null; phone: string | null } | null;
}

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization") || "";
    const expected = `Bearer ${process.env.CRON_SECRET || ""}`;
    if (!process.env.CRON_SECRET || !safeCompare(authHeader, expected)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createAdminClient();
    const now = new Date();
    let processed = 0;
    let errors = 0;

    const { data: activeCampaigns } = await supabase
      .from("outreach_campaigns").select("*, outreach_sequences(*)").eq("status", "active");

    if (!activeCampaigns) return NextResponse.json({ processed: 0 });

    for (const campaign of activeCampaigns as unknown as CampaignWithSequences[]) {
      const sequences = campaign.outreach_sequences || [];
      if (sequences.length === 0) continue;

      // Fetch sent messages joined with contacts to get email/phone
      const { data: sentMessages } = await supabase
        .from("outreach_messages")
        .select("*, contacts(email, phone)")
        .eq("campaign_id", campaign.id)
        .eq("status", "sent")
        .is("replied_at", null);
      if (!sentMessages) continue;

      let campaignSent = 0;
      for (const msg of sentMessages as unknown as MessageWithContact[]) {
        const currentStep = sequences.find((s) => s.id === msg.sequence_id);
        if (!currentStep) continue;
        const nextStep = sequences.find((s) => s.step_number === currentStep.step_number + 1);
        if (!nextStep) continue;

        const sentAt = new Date(msg.sent_at || msg.created_at);
        const delayMs = (nextStep.delay_days || 1) * 24 * 60 * 60 * 1000;
        if (now.getTime() - sentAt.getTime() < delayMs) continue;

        const { data: existing } = await supabase.from("outreach_messages").select("id").eq("campaign_id", campaign.id).eq("sequence_id", nextStep.id).eq("contact_id", msg.contact_id).limit(1);
        if (existing && existing.length > 0) continue;

        // Resolve the to_address from the contact join or existing to_address
        const contact = msg.contacts;
        const toAddress = nextStep.channel === "email"
          ? (contact?.email || msg.to_address)
          : nextStep.channel === "sms"
            ? (contact?.phone || msg.to_address)
            : (msg.to_address || contact?.email || contact?.phone);

        // Personalize the template
        let body = nextStep.body_template || "";
        let subject = nextStep.subject_template || `Follow-up: ${campaign.name}`;

        try {
          if (nextStep.channel === "email" && toAddress) {
            await sendEmail({ to: toAddress, subject, html: body });
          } else if (nextStep.channel === "sms" && toAddress) {
            await sendSMS({ to: toAddress, body });
          } else if (!toAddress) {
            // No address available — skip this contact
            errors++;
            continue;
          }

          await supabase.from("outreach_messages").insert({
            user_id: campaign.user_id,
            campaign_id: campaign.id,
            sequence_id: nextStep.id,
            contact_id: msg.contact_id,
            company_id: msg.company_id || null,
            channel: nextStep.channel,
            to_address: toAddress,
            subject: subject || null,
            body,
            status: "sent",
            sent_at: now.toISOString(),
          });

          processed++;
          campaignSent++;
        } catch (sendErr: any) {
          console.error(`Sequence runner send error for contact ${msg.contact_id}:`, sendErr?.message);
          // Insert a failed message record so we don't retry infinitely
          const { error: insertErr } = await supabase.from("outreach_messages").insert({
            user_id: campaign.user_id,
            campaign_id: campaign.id,
            sequence_id: nextStep.id,
            contact_id: msg.contact_id,
            channel: nextStep.channel,
            to_address: toAddress || null,
            subject: subject || null,
            body,
            status: "failed",
          });
          if (insertErr) console.error("Failed to insert error record:", insertErr.message);
          errors++;
        }
      }

      // Batch-update campaign stats once after processing all messages for this campaign
      if (campaignSent > 0) {
        const { data: freshCampaign } = await supabase
          .from("outreach_campaigns")
          .select("stats")
          .eq("id", campaign.id)
          .single();
        const currentStats = (freshCampaign?.stats as Record<string, unknown>) || {};
        await supabase
          .from("outreach_campaigns")
          .update({
            stats: {
              ...currentStats,
              sent: ((currentStats.sent as number) || 0) + campaignSent,
            } as unknown as Json,
          })
          .eq("id", campaign.id);
      }
    }
    return NextResponse.json({ processed, errors, timestamp: now.toISOString() });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
