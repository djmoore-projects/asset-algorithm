/**
 * Lead and deal scoring prompts.
 * Production prompts are loaded from environment configuration.
 */
export const LEAD_SCORING_PROMPT = process.env.AI_PROMPT_LEAD_SCORING || "[Prompt loaded from config]";

export const DEAL_SCORING_PROMPT = process.env.AI_PROMPT_DEAL_SCORING || "[Prompt loaded from config]";
