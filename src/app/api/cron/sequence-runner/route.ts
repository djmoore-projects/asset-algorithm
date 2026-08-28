import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/integrations/resend";
import { sendSMS } from "@/lib/integrations/twilio";
import { safeCompare } from "@/lib/security";
import { getSendBudget, ensureWarmupStarted, type SendBudget } from "@/lib/outreach/governor";
import {
  isSuppressed,
  suppressContact,
  withUnsubscribeFooter,
} from "@/lib/outreach/suppression";
import { generateSequenceMessage } from "@/lib/outreach/generate";
import type {
  Json, OutreachChannel, MessageStatus, CampaignStatus, ContactRoleType,
} from "@/types/database";

export const maxDuration = 120;

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
  auto_enroll: boolean;
  auto_enroll_min_score: number;
  auto_enroll_role_types: string[];
  created_at: string;
  updated_at: string;
  outreach_sequences: SequenceRow[];
}

interface ContactRow {
  id: string;
  company_id: string | null;
  first_name: string | null;
  last_name: string | null;
  title: string | null;
  role_type: string | null;
  email: string | null;
  phone: string | null;
  unsubscribed_at: string | null;
  unsubscribe_token: string;
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
  contacts: ContactRow | null;
}

interface CompanyContext {
  name: string | null;
  industry: string | null;
  location_city: string | null;
  location_state: string | null;
  revenue_range: string | null;
  employee_count: number | null;
  ai_summary: string | null;
  enrichment_data: Record<string, unknown> | null;
}

interface SenderIdentity {
  first_name: string | null;
  full_name: string | null;
  company_name: string | null;
}

/**
 * Fill merge fields left in a template, and catch any the model emitted
 * despite being told not to. An unresolved {name} in a live email is the most
 * damaging tell there is, so this runs on every body regardless of source.
 */
function fillMergeFields(
  text: string,
  contact: ContactRow | null,
  companyName: string | null
): string {
  const first = contact?.first_name?.trim() || "there";
  const full = [contact?.first_name, contact?.last_name].filter(Boolean).join(" ").trim() || first;
  const company = companyName?.trim() || "your business";

  return text
    .replace(/\{\s*first_?name\s*\}/gi, first)
    .replace(/\{\s*name\s*\}/gi, full)
    .replace(/\{\s*company(_name)?\s*\}/gi, company);
}

type Supa = ReturnType<typeof createAdminClient>;

interface RunTally {
  enrolled: number;
  advanced: number;
  suppressed: number;
  capped: number;
  errors: number;
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
    const tally: RunTally = { enrolled: 0, advanced: 0, suppressed: 0, capped: 0, errors: 0 };

    const { data: activeCampaigns } = await supabase
      .from("outreach_campaigns")
      .select("*, outreach_sequences(*)")
      .eq("status", "active");

    if (!activeCampaigns?.length) return NextResponse.json({ ...tally });

    const campaigns = activeCampaigns as unknown as CampaignWithSequences[];

    // One budget per user, shared across their campaigns — reputation is a
    // property of the sending domain, not of any single campaign.
    const budgets = new Map<string, SendBudget>();
    async function budgetFor(userId: string): Promise<SendBudget> {
      let budget = budgets.get(userId);
      if (!budget) {
        budget = await getSendBudget(supabase, userId, now);
        budgets.set(userId, budget);
      }
      return budget;
    }

    // Cached per user — the model needs a real name to sign off with.
    const senders = new Map<string, SenderIdentity>();
    async function senderFor(userId: string): Promise<SenderIdentity> {
      let sender = senders.get(userId);
      if (!sender) {
        const { data } = await supabase
          .from("profiles")
          .select("full_name, company_name")
          .eq("id", userId)
          .single();
        const profile = data as { full_name: string | null; company_name: string | null } | null;
        sender = {
          first_name: profile?.full_name?.trim().split(/\s+/)[0] || null,
          full_name: profile?.full_name || null,
          company_name: profile?.company_name || null,
        };
        senders.set(userId, sender);
      }
      return sender;
    }

    for (const campaign of campaigns) {
      const sequences = (campaign.outreach_sequences || []).sort(
        (a, b) => a.step_number - b.step_number
      );
      if (!sequences.length) continue;

      const budget = await budgetFor(campaign.user_id);
      if (budget.remaining <= 0) {
        tally.capped++;
        continue;
      }

      const sender = await senderFor(campaign.user_id);

      let sentForCampaign = 0;

      // ── Advance contacts already in the sequence ──────────────────────
      sentForCampaign += await advanceSequence(
        supabase, campaign, sequences, budget, sender, now, tally
      );

      // ── Pull in new contacts and fire step 1 ──────────────────────────
      if (campaign.auto_enroll && budget.remaining > 0) {
        sentForCampaign += await enrollNewContacts(
          supabase, campaign, sequences, budget, sender, now, tally
        );
      }

      if (sentForCampaign > 0) {
        await bumpCampaignStats(supabase, campaign.id, sentForCampaign);
      }
    }

    console.log(
      `[SequenceRunner] enrolled=${tally.enrolled} advanced=${tally.advanced} ` +
      `suppressed=${tally.suppressed} capped=${tally.capped} errors=${tally.errors}`
    );

    return NextResponse.json(tally);
  } catch (error) {
    console.error("[Cron.SequenceRunner]", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Sequence runner failed" }, { status: 500 });
  }
}

/**
 * Move contacts already in the campaign to their next step once the step's
 * delay has elapsed.
 */
async function advanceSequence(
  supabase: Supa,
  campaign: CampaignWithSequences,
  sequences: SequenceRow[],
  budget: SendBudget,
  sender: SenderIdentity,
  now: Date,
  tally: RunTally
): Promise<number> {
  const { data: sentMessages } = await supabase
    .from("outreach_messages")
    .select(
      "*, contacts(id, company_id, first_name, last_name, title, role_type, email, phone, unsubscribed_at, unsubscribe_token)"
    )
    .eq("campaign_id", campaign.id)
    .eq("status", "sent")
    .is("replied_at", null);

  if (!sentMessages?.length) return 0;

  let sent = 0;

  for (const msg of sentMessages as unknown as MessageWithContact[]) {
    if (budget.remaining <= 0) {
      tally.capped++;
      break;
    }

    const currentStep = sequences.find((s) => s.id === msg.sequence_id);
    if (!currentStep) continue;
    const nextStep = sequences.find((s) => s.step_number === currentStep.step_number + 1);
    if (!nextStep) continue;

    const sentAt = new Date(msg.sent_at || msg.created_at);
    const delayMs = (nextStep.delay_days || 1) * 86_400_000;
    if (now.getTime() - sentAt.getTime() < delayMs) continue;

    const contact = msg.contacts;

    // A contact who opted out after step 1 must not receive step 2.
    if (isSuppressed(contact)) {
      tally.suppressed++;
      continue;
    }

    const { data: existing } = await supabase
      .from("outreach_messages")
      .select("id")
      .eq("campaign_id", campaign.id)
      .eq("sequence_id", nextStep.id)
      .eq("contact_id", msg.contact_id)
      .limit(1);
    if (existing?.length) continue;

    const delivered = await sendStep({
      supabase,
      campaign,
      step: nextStep,
      sequences,
      contact,
      contactId: msg.contact_id,
      companyId: msg.company_id,
      sender,
      fallbackAddress: msg.to_address,
      now,
      tally,
    });

    if (delivered) {
      sent++;
      budget.remaining--;
      tally.advanced++;
    }
  }

  return sent;
}

/**
 * Find contacts that qualify for this campaign but have never been messaged
 * by it, and send them step 1.
 *
 * Qualification is deliberately strict: the company must clear the campaign's
 * ICP threshold, the contact must hold one of the configured roles, must have
 * a usable address for the channel, and must not be suppressed.
 */
async function enrollNewContacts(
  supabase: Supa,
  campaign: CampaignWithSequences,
  sequences: SequenceRow[],
  budget: SendBudget,
  sender: SenderIdentity,
  now: Date,
  tally: RunTally
): Promise<number> {
  const firstStep = sequences[0];
  if (!firstStep || firstStep.step_number !== 1) return 0;

  const roleTypes = (
    campaign.auto_enroll_role_types?.length ? campaign.auto_enroll_role_types : ["owner"]
  ) as ContactRoleType[];

  // Companies that clear the score bar. Explicit targets, when set, narrow it.
  let companyQuery = supabase
    .from("companies")
    .select("id, name, industry, location_city, location_state, revenue_range, employee_count, ai_summary, enrichment_data")
    .eq("user_id", campaign.user_id)
    .gte("icp_score", campaign.auto_enroll_min_score)
    .neq("status", "disqualified");

  if (campaign.target_company_ids?.length) {
    companyQuery = companyQuery.in("id", campaign.target_company_ids);
  }

  const { data: companies } = await companyQuery.limit(200);
  if (!companies?.length) return 0;

  const companyById = new Map<string, CompanyContext & { id: string }>(
    (companies as unknown as (CompanyContext & { id: string })[]).map((c) => [c.id, c])
  );

  const { data: candidates } = await supabase
    .from("contacts")
    .select("id, company_id, first_name, last_name, title, role_type, email, phone, unsubscribed_at, unsubscribe_token")
    .eq("user_id", campaign.user_id)
    .in("company_id", Array.from(companyById.keys()))
    .in("role_type", roleTypes)
    .is("unsubscribed_at", null)
    .limit(200);

  if (!candidates?.length) return 0;

  // Everyone this campaign has already touched, so enrollment never repeats.
  const { data: touched } = await supabase
    .from("outreach_messages")
    .select("contact_id")
    .eq("campaign_id", campaign.id);

  const alreadyTouched = new Set(
    (touched as { contact_id: string }[] | null)?.map((m) => m.contact_id) ?? []
  );

  let sent = 0;

  for (const contact of candidates as unknown as ContactRow[]) {
    if (budget.remaining <= 0) {
      tally.capped++;
      break;
    }
    if (alreadyTouched.has(contact.id)) continue;
    if (!addressFor(firstStep.channel, contact)) continue;

    const delivered = await sendStep({
      supabase,
      campaign,
      step: firstStep,
      sequences,
      contact,
      contactId: contact.id,
      companyId: contact.company_id,
      company: contact.company_id ? companyById.get(contact.company_id) ?? null : null,
      sender,
      fallbackAddress: null,
      now,
      tally,
    });

    if (delivered) {
      sent++;
      budget.remaining--;
      tally.enrolled++;
      alreadyTouched.add(contact.id);
    }
  }

  return sent;
}

function addressFor(channel: OutreachChannel, contact: ContactRow | null): string | null {
  if (!contact) return null;
  if (channel === "email") return contact.email || null;
  if (channel === "sms" || channel === "call") return contact.phone || null;
  return contact.email || contact.phone || null;
}

/**
 * Compose and dispatch a single step, then record it.
 *
 * Returns true only when the message actually left. Failures are written as
 * failed rows so the runner does not retry them forever, and a hard bounce
 * suppresses the contact rather than burning further budget on them.
 */
async function sendStep(args: {
  supabase: Supa;
  campaign: CampaignWithSequences;
  step: SequenceRow;
  sequences: SequenceRow[];
  contact: ContactRow | null;
  contactId: string;
  companyId: string | null;
  company?: CompanyContext | null;
  sender: SenderIdentity;
  fallbackAddress: string | null;
  now: Date;
  tally: RunTally;
}): Promise<boolean> {
  const {
    supabase, campaign, step, sequences, contact, contactId,
    companyId, company, sender, fallbackAddress, now, tally,
  } = args;

  const toAddress = addressFor(step.channel, contact) || fallbackAddress;
  if (!toAddress) {
    tally.errors++;
    return false;
  }

  let subject = step.subject_template || `Following up on ${company?.name || "your business"}`;
  let body = step.body_template || "";
  let aiGenerated = false;

  if (step.ai_generated) {
    const generated = await generateSequenceMessage({
      step_number: step.step_number,
      channel: step.channel,
      campaign_name: campaign.name,
      sender: {
        first_name: sender?.first_name ?? null,
        full_name: sender?.full_name ?? null,
        company_name: sender?.company_name ?? null,
      },
      contact: {
        first_name: contact?.first_name,
        last_name: contact?.last_name,
        title: contact?.title,
        role_type: contact?.role_type,
      },
      company: company ?? null,
      previous_steps: sequences
        .filter((s) => s.step_number < step.step_number)
        .map((s) => ({
          step_number: s.step_number,
          channel: s.channel,
          subject: s.subject_template,
          body: s.body_template || "",
        })),
    });

    if (generated.generated) {
      body = generated.body;
      if (generated.subject) subject = generated.subject;
      aiGenerated = true;
    }
  }

  if (!body.trim()) {
    tally.errors++;
    return false;
  }

  // Resolve merge fields last, so it covers stored templates and anything the
  // model emitted despite instructions.
  body = fillMergeFields(body, contact, company?.name ?? null);
  subject = fillMergeFields(subject, contact, company?.name ?? null);

  // CAN-SPAM: every automated email carries a working opt-out.
  const emailBody =
    step.channel === "email" && contact?.unsubscribe_token
      ? withUnsubscribeFooter(body, contact.unsubscribe_token)
      : body;

  try {
    if (step.channel === "email") {
      await sendEmail({ to: toAddress, subject, html: emailBody });
    } else if (step.channel === "sms") {
      await sendSMS({ to: toAddress, body });
    } else {
      // linkedin and call steps are recorded for the operator to action.
      await recordMessage(supabase, {
        campaign, step, contactId, companyId, toAddress,
        subject, body, status: "pending", aiGenerated, now,
      });
      return false;
    }

    await ensureWarmupStarted(supabase, campaign.user_id);
    await recordMessage(supabase, {
      campaign, step, contactId, companyId, toAddress,
      subject, body: emailBody, status: "sent", aiGenerated, now,
    });

    return true;
  } catch (sendErr) {
    const message = sendErr instanceof Error ? sendErr.message : String(sendErr);
    console.error(`[SequenceRunner] send failed for contact ${contactId}: ${message}`);

    if (isHardBounce(message)) {
      await suppressContact(supabase, contactId, "bounced");
      tally.suppressed++;
    }

    await recordMessage(supabase, {
      campaign, step, contactId, companyId, toAddress,
      subject, body: emailBody, status: "failed", aiGenerated, now,
    });

    tally.errors++;
    return false;
  }
}

/** Provider errors that mean the address is dead, not that the send flaked. */
function isHardBounce(message: string): boolean {
  return /invalid|does not exist|no such|unknown recipient|not found|blocked|suppress/i.test(
    message
  );
}

async function recordMessage(
  supabase: Supa,
  args: {
    campaign: CampaignWithSequences;
    step: SequenceRow;
    contactId: string;
    companyId: string | null;
    toAddress: string;
    subject: string;
    body: string;
    status: MessageStatus;
    aiGenerated: boolean;
    now: Date;
  }
): Promise<void> {
  const { campaign, step, contactId, companyId, toAddress, subject, body, status, aiGenerated, now } = args;

  const { error } = await supabase.from("outreach_messages").insert({
    user_id: campaign.user_id,
    campaign_id: campaign.id,
    sequence_id: step.id,
    contact_id: contactId,
    company_id: companyId || null,
    channel: step.channel,
    to_address: toAddress,
    subject: step.channel === "email" ? subject : null,
    body,
    status,
    sent_at: status === "sent" ? now.toISOString() : null,
    ai_personalization: aiGenerated ? { generated: true, step: step.step_number } : null,
  });

  if (error) console.error("[SequenceRunner] failed to record message:", error.message);
}

async function bumpCampaignStats(
  supabase: Supa,
  campaignId: string,
  sent: number
): Promise<void> {
  const { data: fresh } = await supabase
    .from("outreach_campaigns")
    .select("stats")
    .eq("id", campaignId)
    .single();

  const stats = ((fresh as { stats?: Record<string, unknown> } | null)?.stats || {}) as Record<string, number>;

  await supabase
    .from("outreach_campaigns")
    .update({
      stats: { ...stats, sent: (stats.sent || 0) + sent },
      updated_at: new Date().toISOString(),
    })
    .eq("id", campaignId);
}
