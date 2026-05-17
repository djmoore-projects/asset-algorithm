/**
 * Scanner enrichment and contact extraction prompts.
 * Production prompts are loaded from environment configuration.
 */
export const SCANNER_ENRICHMENT_PROMPT = process.env.AI_PROMPT_SCANNER_ENRICHMENT || "[Prompt loaded from config]";

export const WEBSITE_CONTACT_EXTRACTION_PROMPT = process.env.AI_PROMPT_CONTACT_EXTRACTION || "[Prompt loaded from config]";

export const ENRICHED_CONTACT_EXTRACTION_PROMPT = process.env.AI_PROMPT_ENRICHED_EXTRACTION || "[Prompt loaded from config]";
