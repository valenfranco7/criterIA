import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { requireAnthropic, MODEL_TUTOR } from '../anthropic.js';
import type { Phase } from '../contracts.js';
import type { AnalyzerOutput } from './analyzer.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export interface TutorInput {
  current_phase: Phase;
  recent_history: Array<{ role: 'student' | 'assistant'; content: string }>;
  student_message: string;
  analyzer_notes: AnalyzerOutput;
  activity_config: {
    initial_question?: string;
    success_criteria?: string;
    agent_tone?: string;
    reference_material?: string;
  };
}

const baseSystemPrompt = fs.readFileSync(
  path.resolve(__dirname, './prompts/system-tutor.md'),
  'utf-8'
);

export async function runTutor(input: TutorInput): Promise<string> {
  const client = requireAnthropic();

  const phaseContext = `\n\n## Contexto de esta sesión\n\nFase actual: **${input.current_phase}**\n\nSeñales del analyzer (orientativas, no mandatorias):\n- resistance_level: ${input.analyzer_notes.resistance_level}/3\n- blockage_level: ${input.analyzer_notes.blockage_level}/3\n- phase_action sugerido: ${input.analyzer_notes.phase_action}\n\nSi el mensaje literal del alumno no confirma estas señales, ignoralas y respondé al texto.`;

  const configContext = [
    input.activity_config.success_criteria
      ? `\nCriterio de éxito de esta actividad: ${input.activity_config.success_criteria}`
      : '',
    input.activity_config.agent_tone
      ? `\nTono sugerido por el docente: ${input.activity_config.agent_tone}`
      : '',
    input.activity_config.reference_material
      ? `\nMaterial de referencia: ${input.activity_config.reference_material}`
      : '',
  ]
    .filter(Boolean)
    .join('');

  const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [
    ...input.recent_history.map((m) => ({
      role: (m.role === 'student' ? 'user' : 'assistant') as 'user' | 'assistant',
      content: m.content,
    })),
    { role: 'user', content: input.student_message },
  ];

  const response = await client.beta.promptCaching.messages.create({
    model: MODEL_TUTOR,
    max_tokens: 512,
    temperature: 0.7,
    system: [
      {
        type: 'text',
        text: baseSystemPrompt + phaseContext + configContext,
        cache_control: { type: 'ephemeral' },
      },
    ],
    messages,
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '';
  return text.trim();
}
