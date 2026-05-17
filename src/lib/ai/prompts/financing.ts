/**
 * Financing, valuation, and exit strategy prompts.
 * Production prompts are loaded from environment configuration.
 */
export const FINANCING_PROMPT = process.env.AI_PROMPT_FINANCING || "[Prompt loaded from config]";

export const VALUATION_PROMPT = process.env.AI_PROMPT_VALUATION || "[Prompt loaded from config]";

export const EXIT_STRATEGY_PROMPT = process.env.AI_PROMPT_EXIT_STRATEGY || "[Prompt loaded from config]";
