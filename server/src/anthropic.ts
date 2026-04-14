import Anthropic from '@anthropic-ai/sdk';

const apiKey = process.env.ANTHROPIC_API_KEY;

export const anthropic = apiKey ? new Anthropic({ apiKey }) : null;

// Used by teacher-agents.ts (LLM #1, #4, #5)
export const MODEL_TUTOR =
  process.env.ANTHROPIC_MODEL_TUTOR ?? 'claude-sonnet-4-6';

export function requireAnthropic(): Anthropic {
  if (!anthropic) {
    throw new Error(
      'ANTHROPIC_API_KEY not set — complete server/.env before using LLM routes'
    );
  }
  return anthropic;
}
