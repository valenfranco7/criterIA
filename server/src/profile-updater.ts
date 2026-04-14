import type { StudentProfile } from './contracts.js';
import { db } from './db.js';
import { requireAnthropic } from './anthropic.js';

const MODEL = process.env.ANTHROPIC_MODEL_TEACHER ?? 'claude-opus-4-6';

export async function refreshStudentProfile(
  studentId: string
): Promise<Pick<StudentProfile, 'summary'>> {
  const student = db
    .prepare("SELECT * FROM users WHERE id = ? AND role = 'student'")
    .get(studentId) as any;

  if (!student) {
    throw new Error('student_not_found');
  }

  const sessions = db
    .prepare(
      `SELECT s.session_summary, s.teacher_report, s.comprehension_pct, s.difficult_topics,
              a.title AS activity_title, a.topic AS activity_topic
       FROM activity_sessions s
       JOIN activities a ON a.id = s.activity_id
       WHERE s.student_id = ? AND s.status = 'completed'
       ORDER BY s.completed_at DESC
       LIMIT 10`
    )
    .all(studentId) as any[];

  const ideas = db
    .prepare(
      `SELECT text, question_that_triggered_it
       FROM student_ideas
       WHERE student_id = ?
       ORDER BY created_at DESC
       LIMIT 20`
    )
    .all(studentId) as any[];

  const sessionLines =
    sessions.length > 0
      ? sessions
          .map(
            (s: any, i: number) =>
              `Sesión ${i + 1} — ${s.activity_title} (${s.activity_topic})\n` +
              `  Resumen: ${s.session_summary ?? '(sin resumen)'}\n` +
              `  Comprensión: ${s.comprehension_pct ?? '?'}%\n` +
              `  Temas difíciles: ${s.difficult_topics ?? '[]'}\n` +
              `  Reporte: ${s.teacher_report ?? '(sin reporte)'}`
          )
          .join('\n\n')
      : '(sin sesiones completadas)';

  const ideaLines =
    ideas.length > 0
      ? ideas
          .map(
            (idea: any, i: number) =>
              `Idea ${i + 1}: ${idea.text}` +
              (idea.question_that_triggered_it
                ? ` (pregunta disparadora: ${idea.question_that_triggered_it})`
                : '')
          )
          .join('\n')
      : '(sin ideas registradas)';

  const context =
    `Alumno: ${student.name}\n\n` +
    `Sesiones recientes:\n${sessionLines}\n\n` +
    `Ideas generadas:\n${ideaLines}`;

  const client = requireAnthropic();

  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    system:
      'Sos un analista pedagógico experto. Te doy el historial de un alumno: sus sesiones socráticas, reportes, comprensión y temas difíciles. ' +
      'Escribí un perfil cognitivo del alumno en 4-6 oraciones. Incluí: cómo piensa (visual, abstracto, concreto, analógico), ' +
      'qué patrones muestra (resistencia, velocidad, profundidad), dónde se traba y qué lo/la desbloquea, qué estrategias ' +
      'pedagógicas le funcionan mejor. Escribí en tercera persona, en español rioplatense, tono profesional pero cálido. ' +
      'No uses bullet points — párrafo corrido.',
    messages: [{ role: 'user', content: context }],
  });

  const summary =
    message.content[0].type === 'text' ? message.content[0].text.trim() : '';

  return { summary };
}
