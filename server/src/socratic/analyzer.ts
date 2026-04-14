import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { requireAnthropic, MODEL_ANALYZER } from '../anthropic.js';
import type { Phase } from '../contracts.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export interface AnalyzerOutput {
  resistance_level: 0 | 1 | 2 | 3;
  blockage_level: 0 | 1 | 2 | 3;
  phase_action: 'stay' | 'advance' | 'retreat';
}

export interface AnalyzerInput {
  current_phase: Phase;
  recent_history: Array<{ role: 'student' | 'assistant'; content: string }>;
  student_message: string;
}

const analyzerPrompt = fs.readFileSync(
  path.resolve(__dirname, './prompts/analyzer.md'),
  'utf-8'
);

export async function runAnalyzer(input: AnalyzerInput): Promise<AnalyzerOutput> {
  const client = requireAnthropic();

  const historyText = input.recent_history
    .map((m) => `${m.role === 'student' ? 'Alumno' : 'Tutor'}: ${m.content}`)
    .join('\n');

  const userContent = `Fase actual: ${input.current_phase}

Historial reciente:
${historyText || '(sin historial previo)'}

Último mensaje del alumno:
${input.student_message}`;

  const response = await client.beta.promptCaching.messages.create({
    model: MODEL_ANALYZER,
    max_tokens: 256,
    temperature: 0,
    system: [
      {
        type: 'text',
        text: analyzerPrompt,
        cache_control: { type: 'ephemeral' },
      },
    ],
    messages: [{ role: 'user', content: userContent }],
  });

  const raw = response.content[0].type === 'text' ? response.content[0].text : '';
  // Strip markdown code fences if present
  const cleaned = raw.replace(/```json\n?|\n?```/g, '').trim();

  try {
    const parsed = JSON.parse(cleaned) as AnalyzerOutput;
    // Validate shape
    if (
      typeof parsed.resistance_level !== 'number' ||
      typeof parsed.blockage_level !== 'number' ||
      !['stay', 'advance', 'retreat'].includes(parsed.phase_action)
    ) {
      throw new Error('invalid shape');
    }
    return parsed;
  } catch (err) {
    console.error('[Analyzer] JSON parse failed:', { error: String(err), raw: raw.substring(0, 200) });
    // Fallback: conservative defaults so the turn doesn't fail
    return { resistance_level: 0, blockage_level: 0, phase_action: 'stay' };
  }
}
