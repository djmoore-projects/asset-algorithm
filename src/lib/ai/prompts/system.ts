/**
 * System prompt for the AI co-pilot.
 * Production prompts are loaded from environment configuration.
 */
export const SYSTEM_PROMPT = process.env.AI_PROMPT_SYSTEM || "[Prompt loaded from config]";
