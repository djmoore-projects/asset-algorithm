/**
 * Growth and scaling strategy prompt.
 * Production prompts are loaded from environment configuration.
 */
export const SCALING_PROMPT = process.env.AI_PROMPT_SCALING || "[Prompt loaded from config]";
