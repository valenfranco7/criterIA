import Anthropic from '@anthropic-ai/sdk';

const apiKey = process.env.ANTHROPIC_API_KEY;

export const anthropic = apiKey ? new Anthropic({ apiKey }) : null;

export function requireAnthropic(): Anthropic {
  if (!anthropic) {
    throw new Error(
      'ANTHROPIC_API_KEY not set — complete server/.env before using LLM routes'
    );
  }
  return anthropic;
}
