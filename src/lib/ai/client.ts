import Anthropic from "@anthropic-ai/sdk";

let client: Anthropic | null = null;

export function getAnthropicClient(): Anthropic {
  if (!client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY is not set. Add it to .env.local");
    }
    client = new Anthropic({ apiKey });
  }
  return client;
}

/** Check if an Anthropic API key is available */
export function isAnthropicConfigured(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}

export const AI_MODEL = "claude-sonnet-4-5-20250929";
export const MAX_TOKENS = 4096;

/**
 * Parse JSON from AI response text.
 * Claude often wraps JSON in markdown code blocks (```json ... ```),
 * which causes JSON.parse() to fail. This strips that wrapping first.
 */
export function parseAIJson(text: string): any {
  // Try direct parse first
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    // Strip markdown code block wrappers
    const codeBlockMatch = trimmed.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
    if (codeBlockMatch?.[1]) {
      return JSON.parse(codeBlockMatch[1].trim());
    }
    // Try stripping any leading/trailing non-JSON text
    const jsonMatch = trimmed.match(/(\{[\s\S]*\})/);
    if (jsonMatch?.[1]) {
      return JSON.parse(jsonMatch[1]);
    }
    throw new Error("Could not parse JSON from AI response");
  }
}
