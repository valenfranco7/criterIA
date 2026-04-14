import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { requireAnthropic } from '../anthropic.js';
import type { ExtractedIdea } from '../contracts.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const systemPrompt = fs.readFileSync(
  path.resolve(__dirname, './prompts/system-socrates.md'),
  'utf-8'
);

// --- Agent + Environment setup (one-time) ---

let _agentId: string | null = process.env.ANTHROPIC_AGENT_ID ?? null;
let _environmentId: string | null = process.env.ANTHROPIC_ENVIRONMENT_ID ?? null;

export async function ensureAgentSetup(): Promise<{ agentId: string; environmentId: string }> {
  const client = requireAnthropic();

  if (!_agentId) {
    const agent = await (client.beta as any).agents.create({
      name: 'Socrates',
      model: { id: 'claude-opus-4-6', speed: 'fast' },
      system: systemPrompt,
      tools: [
        {
          type: 'custom',
          name: 'submit_session_report',
          description:
            'Called when the student ends the session. Submits a structured close report with summary for the student, detailed report for the teacher, and extracted ideas the student produced during the conversation.',
          input_schema: {
            type: 'object',
            properties: {
              session_summary: {
                type: 'string',
                description: '2-4 sentence summary of the session, written for the student',
              },
              teacher_report: {
                type: 'string',
                description:
                  'Structured markdown report for the teacher with ## headers: Recorrido / Ideas clave / Observaciones',
              },
              extracted_ideas: {
                type: 'array',
                description: 'Ideas the student produced during the conversation, in their own words',
                items: {
                  type: 'object',
                  properties: {
                    text: { type: 'string', description: 'The idea, in the student\'s words' },
                    question_that_triggered_it: {
                      type: 'string',
                      description: 'The question that led to this idea',
                    },
                  },
                  required: ['text'],
                },
              },
            },
            required: ['session_summary', 'teacher_report', 'extracted_ideas'],
          },
        },
      ],
    });
    _agentId = agent.id;
    console.log(`[Socrates] Agent created: ${agent.id} (version ${agent.version})`);
    console.log(`[Socrates] Save this to .env as ANTHROPIC_AGENT_ID=${agent.id}`);
  }

  if (!_environmentId) {
    const env = await (client.beta as any).environments.create({
      name: `criteria-env-${Date.now()}`,
      config: {
        type: 'cloud',
        networking: { type: 'unrestricted' },
      },
    });
    _environmentId = env.id;
    console.log(`[Socrates] Environment created: ${env.id}`);
    console.log(`[Socrates] Save this to .env as ANTHROPIC_ENVIRONMENT_ID=${env.id}`);
  }

  return { agentId: _agentId as string, environmentId: _environmentId as string };
}

// --- Session helpers ---

export async function createManagedSession(): Promise<string> {
  const client = requireAnthropic();
  const { agentId, environmentId } = await ensureAgentSetup();

  const session = await (client.beta as any).sessions.create({
    agent: agentId,
    environment_id: environmentId,
  });

  return session.id;
}

export async function sendAndCollect(
  managedSessionId: string,
  text: string
): Promise<string> {
  const client = requireAnthropic();

  // Stream-first, then send
  const stream = await (client.beta as any).sessions.events.stream(managedSessionId);

  let responseText = '';

  try {
    await (client.beta as any).sessions.events.send(managedSessionId, {
      events: [
        {
          type: 'user.message',
          content: [{ type: 'text', text }],
        },
      ],
    });

    for await (const event of stream) {
      if ((event as any).type === 'agent.message') {
        for (const block of (event as any).content ?? []) {
          if (block.type === 'text') {
            responseText += block.text;
          }
        }
      } else if ((event as any).type === 'session.status_terminated') {
        throw new Error('Managed Agent session terminated unexpectedly');
      } else if ((event as any).type === 'session.status_idle') {
        break;
      }
    }
  } finally {
    if (typeof (stream as any).close === 'function') {
      (stream as any).close();
    }
  }

  return responseText.trim();
}

export interface CloseResult {
  session_summary: string;
  teacher_report: string;
  extracted_ideas: ExtractedIdea[];
}

export async function sendCloseAndCollect(
  managedSessionId: string
): Promise<CloseResult> {
  const client = requireAnthropic();

  const stream = await (client.beta as any).sessions.events.stream(managedSessionId);

  let toolUseEvent: { id: string; input: any } | null = null;
  let fallbackText = '';

  try {
    await (client.beta as any).sessions.events.send(managedSessionId, {
      events: [
        {
          type: 'user.message',
          content: [
            {
              type: 'text',
              text: 'El alumno decidió cerrar la sesión. Generá el reporte de cierre usando la herramienta submit_session_report.',
            },
          ],
        },
      ],
    });

    for await (const event of stream) {
      if ((event as any).type === 'agent.custom_tool_use') {
        const ev = event as any;
        toolUseEvent = { id: ev.id, input: ev.input };
      } else if ((event as any).type === 'agent.message') {
        for (const block of (event as any).content ?? []) {
          if (block.type === 'text') fallbackText += block.text;
        }
      } else if ((event as any).type === 'session.status_terminated') {
        throw new Error('Managed Agent session terminated during close');
      } else if ((event as any).type === 'session.status_idle') {
        const ev = event as any;
        if (ev.stop_reason?.type === 'requires_action' && toolUseEvent) {
          // Agent called our custom tool — send confirmation and continue
          await (client.beta as any).sessions.events.send(managedSessionId, {
            events: [
              {
                type: 'user.custom_tool_result',
                custom_tool_use_id: toolUseEvent.id,
                content: [{ type: 'text', text: 'Report received successfully.' }],
              },
            ],
          });
          continue; // wait for next idle (end_turn)
        }
        break; // end_turn — done
      }
    }
  } finally {
    if (typeof (stream as any).close === 'function') {
      (stream as any).close();
    }
  }

  if (toolUseEvent?.input) {
    const input = toolUseEvent.input;
    const summary = typeof input.session_summary === 'string' ? input.session_summary : '';
    const report = typeof input.teacher_report === 'string' ? input.teacher_report : '';
    const ideas = Array.isArray(input.extracted_ideas) ? input.extracted_ideas : [];

    if (!summary && !report) {
      console.warn('[Socrates] submit_session_report tool returned empty summary and report');
    }

    return {
      session_summary: summary,
      teacher_report: report,
      extracted_ideas: ideas
        .filter((i: any) => typeof i?.text === 'string')
        .map((i: any) => ({
          text: i.text,
          question_that_triggered_it: typeof i.question_that_triggered_it === 'string' ? i.question_that_triggered_it : null,
        })),
    };
  }

  // Fallback: agent didn't use the tool (shouldn't happen)
  console.error('[Socrates] Close did not trigger submit_session_report tool. Falling back.');
  return {
    session_summary: fallbackText || 'La sesión fue completada.',
    teacher_report: '## Observaciones\n\nSesión completada.',
    extracted_ideas: [],
  };
}

export async function archiveSession(managedSessionId: string): Promise<void> {
  const client = requireAnthropic();
  try {
    await (client.beta as any).sessions.archive(managedSessionId);
  } catch (err) {
    console.error('[Socrates] Failed to archive session:', err);
  }
}
