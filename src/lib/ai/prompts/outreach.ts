/**
 * Multi-channel outreach generation prompts (email, call, SMS, LinkedIn).
 * Production prompts are loaded from environment configuration.
 */
export const EMAIL_GENERATION_PROMPT = process.env.AI_PROMPT_EMAIL || "[Prompt loaded from config]";

export const CALL_SCRIPT_PROMPT = process.env.AI_PROMPT_CALL_SCRIPT || "[Prompt loaded from config]";

export const SMS_GENERATION_PROMPT = process.env.AI_PROMPT_SMS || "[Prompt loaded from config]";

export const LINKEDIN_DM_PROMPT = process.env.AI_PROMPT_LINKEDIN || "[Prompt loaded from config]";
