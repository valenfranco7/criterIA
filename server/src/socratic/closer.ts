import type { ActivitySession, ExtractedIdea } from '../contracts.js';
import { requireAnthropic, MODEL_TUTOR } from '../anthropic.js';
import { db } from '../db.js';

export interface CloseResult {
  session_summary: string;
  teacher_report: string;
  extracted_ideas: ExtractedIdea[];
}

export async function closeSession(session: ActivitySession): Promise<CloseResult> {
  const client = requireAnthropic();

  const messages = db
    .prepare(
      `SELECT role, content FROM messages
       WHERE session_id = ? AND role != 'system'
       ORDER BY turn_index ASC`
    )
    .all(session.id) as Array<{ role: string; content: string }>;

  if (messages.length === 0) {
    return {
      session_summary: 'Sesión completada sin intercambio de mensajes.',
      teacher_report: 'El estudiante no interactuó en esta sesión.',
      extracted_ideas: [],
    };
  }

  const conversation = messages
    .map(m => `${m.role === 'student' ? 'Estudiante' : 'Tutor'}: ${m.content}`)
    .join('\n\n');

  const prompt = `Analizá esta conversación socrática entre un tutor y un estudiante de secundaria argentina, y generá un cierre de sesión.

CONVERSACIÓN:
${conversation}

Respondé SOLO con JSON válido (sin markdown, sin texto extra):
{
  "session_summary": "Resumen de 2-3 oraciones de lo que el estudiante logró comprender. Escribilo desde la perspectiva del estudiante, en primera persona del singular.",
  "teacher_report": "Informe para el docente de 3-4 oraciones: qué logró el estudiante, qué dificultades mostró, qué sugiere para el seguimiento pedagógico.",
  "extracted_ideas": [
    {
      "text": "Una idea concreta formulada con las palabras del estudiante (no del tutor)",
      "question_that_triggered_it": "La pregunta exacta del tutor que disparó esa idea, o null si no hay una clara"
    }
  ]
}

Extraé únicamente ideas genuinamente propias del estudiante, no paráfrasis de lo que dijo el tutor. Si el estudiante no formuló ideas propias, devolvé un array vacío.`;

  const response = await client.messages.create({
    model: MODEL_TUTOR,
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  });

  const raw = response.content[0].type === 'text' ? response.content[0].text.trim() : '{}';

  try {
    const parsed = JSON.parse(raw) as Partial<CloseResult>;
    return {
      session_summary: typeof parsed.session_summary === 'string' ? parsed.session_summary : 'Sesión completada.',
      teacher_report: typeof parsed.teacher_report === 'string' ? parsed.teacher_report : 'El estudiante completó la actividad.',
      extracted_ideas: Array.isArray(parsed.extracted_ideas) ? parsed.extracted_ideas : [],
    };
  } catch {
    return {
      session_summary: 'Sesión completada.',
      teacher_report: 'El estudiante completó la actividad.',
      extracted_ideas: [],
    };
  }
}
