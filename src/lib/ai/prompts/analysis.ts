/**
 * Deal analysis and meeting prep prompts.
 * Production prompts are loaded from environment configuration.
 */
export const DEAL_ANALYSIS_PROMPT = process.env.AI_PROMPT_DEAL_ANALYSIS || "[Prompt loaded from config]";

export const MEETING_PREP_PROMPT = process.env.AI_PROMPT_MEETING_PREP || "[Prompt loaded from config]";
