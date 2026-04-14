import Anthropic from '@anthropic-ai/sdk';

const apiKey = process.env.ANTHROPIC_API_KEY;

// Null if no key is set — server can still boot for non-LLM routes.
export const anthropic = apiKey ? new Anthropic({ apiKey }) : null;

export const MODEL_TUTOR =
  process.env.ANTHROPIC_MODEL_TUTOR ?? 'claude-sonnet-4-5';
export const MODEL_ANALYZER =
  process.env.ANTHROPIC_MODEL_ANALYZER ?? 'claude-haiku-4-5';

export function requireAnthropic(): Anthropic {
  if (!anthropic) {
    throw new Error(
      'ANTHROPIC_API_KEY not set — complete server/.env before using LLM routes'
    );
  }
  return anthropic;
}
