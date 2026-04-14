import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { requireAnthropic, MODEL_TUTOR } from '../anthropic.js';
import type { ActivitySession, Message, StudentIdea, ExtractedIdea } from '../contracts.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export interface CloseResult {
  session_summary: string;
  teacher_report: string;
  extracted_ideas: ExtractedIdea[];
}

const closerPrompt = fs.readFileSync(
  path.resolve(__dirname, './prompts/closer.md'),
  'utf-8'
);

export async function closeSession(
  _session: ActivitySession,
  messages: Message[],
  previousIdeas: StudentIdea[]
): Promise<CloseResult> {
  const client = requireAnthropic();

  const conversationText = messages
    .filter((m) => m.role !== 'system')
    .map((m) => `${m.role === 'student' ? 'Alumno' : 'Tutor'}: ${m.content}`)
    .join('\n');

  const previousIdeasText =
    previousIdeas.length > 0
      ? `\n\nIdeas previas del alumno en esta materia:\n${previousIdeas.map((i) => `- ${i.text}`).join('\n')}`
      : '\n\n(Sin ideas previas del alumno en esta materia)';

  const userContent = `Conversación completa:\n${conversationText}${previousIdeasText}`;

  const response = await client.beta.promptCaching.messages.create({
    model: MODEL_TUTOR,
    max_tokens: 1024,
    temperature: 0.3,
    system: [
      {
        type: 'text',
        text: closerPrompt,
        cache_control: { type: 'ephemeral' },
      },
    ],
    messages: [{ role: 'user', content: userContent }],
  });

  const first = response.content[0];
  if (!first || first.type !== 'text') {
    console.error('[Closer] Unexpected response content type:', first?.type);
    throw new Error('Closer did not return a text response');
  }

  const raw = first.text;
  const cleaned = raw.replace(/```json\n?|\n?```/g, '').trim();

  try {
    const parsed = JSON.parse(cleaned) as {
      session_summary: string;
      teacher_report: string;
      extracted_ideas: Array<{ text: string; question_that_triggered_it?: string }>;
    };
    return {
      session_summary: parsed.session_summary ?? '',
      teacher_report: parsed.teacher_report ?? '',
      extracted_ideas: (parsed.extracted_ideas ?? []).map((i) => ({
        text: i.text,
        question_that_triggered_it: i.question_that_triggered_it ?? null,
      })),
    };
  } catch (err) {
    console.error('[Closer] JSON parse failed:', { error: String(err), raw: raw.substring(0, 200) });
    return {
      session_summary: 'La sesión fue completada.',
      teacher_report: '## Observaciones\n\nSesión completada.',
      extracted_ideas: [],
    };
  }
}
