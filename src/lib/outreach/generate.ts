/**
 * Message generation for the automated path.
 *
 * The API route at /api/ai/generate serves the composer in the UI. The cron
 * cannot call its own HTTP endpoint without a user session, so generation
 * lives here and both paths use the same prompts.
 */

import { getAnthropicClient, AI_MODEL, isAnthropicConfigured } from "@/lib/ai/client";
import {
  EMAIL_GENERATION_PROMPT,
  CALL_SCRIPT_PROMPT,
  SMS_GENERATION_PROMPT,
  LINKEDIN_DM_PROMPT,
} from "@/lib/ai/prompts/outreach";
import type { OutreachChannel } from "@/types/database";

const PROMPT_BY_CHANNEL: Record<OutreachChannel, string> = {
  email: EMAIL_GENERATION_PROMPT,
  call: CALL_SCRIPT_PROMPT,
  sms: SMS_GENERATION_PROMPT,
  linkedin: LINKEDIN_DM_PROMPT,
};

export interface GenerationContext {
  step_number: number;
  channel: OutreachChannel;
  campaign_name: string;
  /** Who the message is from. Without this the model cannot sign a name. */
  sender: {
    first_name?: string | null;
    full_name?: string | null;
    company_name?: string | null;
  };
  contact: {
    first_name?: string | null;
    last_name?: string | null;
    title?: string | null;
    role_type?: string | null;
  };
  company?: {
    name?: string | null;
    industry?: string | null;
    location_city?: string | null;
    location_state?: string | null;
    revenue_range?: string | null;
    employee_count?: number | null;
    ai_summary?: string | null;
    enrichment_data?: Record<string, unknown> | null;
  } | null;
  previous_steps?: { step_number: number; channel: string; subject?: string | null; body: string }[];
}

/**
 * The handful of enrichment fields worth putting in front of the model.
 *
 * enrichment_data carries the full Apollo payload plus scanner output — logos,
 * NAICS arrays, internal ids. Passing all of it buries the two facts that
 * actually personalize an email (how old the business is, what the scanner
 * noticed) in noise, so this narrows it deliberately.
 */
function distillEnrichment(
  enrichment: Record<string, unknown> | null | undefined
): Record<string, unknown> | null {
  if (!enrichment) return null;

  const keep = [
    "founded_year",
    "business_age",
    "revenue_printed",
    "employee_count",
    "headcount_growth_12mo",
    "acquisition_signals",
    "industry",
  ];

  const distilled: Record<string, unknown> = {};
  for (const key of keep) {
    const value = enrichment[key];
    if (value !== null && value !== undefined && value !== "" ) {
      distilled[key] = value;
    }
  }

  return Object.keys(distilled).length ? distilled : null;
}

export interface GeneratedMessage {
  subject: string | null;
  body: string;
  /** False when generation was unavailable and the caller should fall back. */
  generated: boolean;
}

/**
 * Em dashes are banned outright, so they get removed rather than requested.
 * The model reliably drops them from a 45-word email and reliably sneaks them
 * back into a 300-word call script, so the rule is enforced here instead of
 * being asked for twice.
 */
function stripEmDashes(text: string): string {
  return text
    .replace(/\s*—\s*/g, ", ")   // spaced or unspaced, becomes a comma
    .replace(/,\s*,/g, ",")       // collapse any doubled comma this creates
    .replace(/\s+,/g, ",")
    .replace(/,\s*([.!?])/g, "$1");
}

/**
 * Denying a label plants it, and every buyer contacting this owner denies the
 * same ones. Catching it needs the negation and the label close together, so a
 * legitimate sentence like "I run a small firm" is left alone.
 */
const DENIAL_PATTERN =
  /\b(not|no|isn'?t|aren'?t|never)\b[^.!?\n]{0,30}\b(fund|funds|broker|brokers|firm|investor|investors|middleman|private equity|PE)\b/i;

/** Negate one framing, assert the corrected one. The pattern to never ship. */
const FATAL_PATTERN =
  /\b(this|it)\s+(isn'?t|is not)\b[^.!?\n]*[.!?]\s*(this|it)'?s\b|\bnot\s+a\b[^.!?\n]{0,40}[,.]\s*(just|only|simply)\b|\bless\b[^.!?\n]{0,30}\bmore\b/i;

/**
 * Banned phrases the model reaches for most often. Rewording these changes
 * meaning, so they trigger a retry rather than a find-and-replace.
 */
const BANNED_PHRASES =
  /\b(reach(ing)? out|touch base|circle back|I'd love to|delve|dive into|leverage|utilize|in today's|game.changer|cutting.edge|straightforward|it's worth noting|it's important to note)\b/i;

export function hasVoiceViolation(text: string): boolean {
  return DENIAL_PATTERN.test(text) || FATAL_PATTERN.test(text) || BANNED_PHRASES.test(text);
}

const CORRECTION_NOTE = `
Your previous draft broke a rule. It did one of these:
- denied a label (fund, broker, firm, investor)
- negated one framing to assert a corrected one
- used a banned phrase such as "reach out", "touch base", "circle back",
  "I'd love to", "leverage", or "in today's"

Rewrite it. Say what you are and stop there. Replace any banned phrase with
plain speech: "I'm calling because", "I wanted to ask", "I'd like to". Keep
everything else about the draft that was working.`;

/**
 * Generate one message for a sequence step.
 *
 * Returns generated:false rather than throwing when AI is unconfigured or the
 * call fails — an automated run should fall back to the stored template, not
 * abort the whole campaign.
 */
export async function generateSequenceMessage(
  context: GenerationContext
): Promise<GeneratedMessage> {
  if (!isAnthropicConfigured()) {
    return { subject: null, body: "", generated: false };
  }

  const systemPrompt = PROMPT_BY_CHANNEL[context.channel];
  if (!systemPrompt) return { subject: null, body: "", generated: false };

  try {
    // Hand the model a narrowed, clearly-labelled payload rather than the raw
    // record. Everything here is a fact it is allowed to use verbatim.
    const payload = {
      step_number: context.step_number,
      channel: context.channel,
      sender: context.sender,
      recipient: {
        first_name: context.contact.first_name,
        title: context.contact.title,
        role: context.contact.role_type,
      },
      business: context.company
        ? {
            name: context.company.name,
            industry: context.company.industry,
            city: context.company.location_city,
            state: context.company.location_state,
            revenue_range: context.company.revenue_range,
            employee_count: context.company.employee_count,
            what_we_know: context.company.ai_summary,
            ...distillEnrichment(context.company.enrichment_data),
          }
        : null,
      previous_steps: context.previous_steps ?? [],
    };

    const userMessage =
      `Write step ${context.step_number} of this sequence.\n\n` +
      `${JSON.stringify(payload, null, 2)}\n\n` +
      `Use only the facts above. Any field that is absent or null is unknown to ` +
      `you — do not invent a value for it.`;

    const anthropic = getAnthropicClient();

    const draft = async (messages: { role: "user" | "assistant"; content: string }[]) => {
      const response = await anthropic.messages.create({
        model: AI_MODEL,
        max_tokens: 1024,
        system: systemPrompt,
        messages,
      });
      return response.content
        .filter((b) => b.type === "text")
        .map((b) => ("text" in b ? b.text : ""))
        .join("")
        .trim();
    };

    let text = await draft([{ role: "user", content: userMessage }]);
    if (!text) return { subject: null, body: "", generated: false };

    // The model holds these rules well over a short email and loses them over a
    // long call script, so one targeted retry backs up the prompt.
    if (hasVoiceViolation(text)) {
      const retry = await draft([
        { role: "user", content: userMessage },
        { role: "assistant", content: text },
        { role: "user", content: CORRECTION_NOTE },
      ]);
      if (retry) {
        text = retry;
        if (hasVoiceViolation(text)) {
          console.warn(
            `[Outreach.Generate] voice violation persisted after retry (${context.channel} step ${context.step_number})`
          );
        }
      }
    }

    text = stripEmDashes(text);

    return { ...splitSubject(text, context.channel), generated: true };
  } catch (err) {
    console.error(
      "[Outreach.Generate]",
      err instanceof Error ? err.message : err
    );
    return { subject: null, body: "", generated: false };
  }
}

/**
 * Pull a leading "Subject: ..." line off an email body.
 * Only email carries a subject; other channels return the text whole.
 */
function splitSubject(
  text: string,
  channel: OutreachChannel
): { subject: string | null; body: string } {
  if (channel !== "email") return { subject: null, body: text };

  const match = text.match(/^\s*subject\s*:\s*(.+?)\r?\n([\s\S]*)$/i);
  if (!match) return { subject: null, body: text };

  return { subject: match[1].trim(), body: match[2].trim() };
}
