/**
 * Post-acquisition integration planning prompt.
 * Production prompts are loaded from environment configuration.
 */
export const INTEGRATION_PROMPT = process.env.AI_PROMPT_INTEGRATION || "[Prompt loaded from config]";
