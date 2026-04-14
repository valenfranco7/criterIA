import type { ClassAnalysis } from './contracts.js';
import { db, jsonParse } from './db.js';
import { requireAnthropic } from './anthropic.js';

const MODEL = process.env.ANTHROPIC_MODEL_ANALYST ?? 'claude-opus-4-6';

const classAnalysisSchema = {
  type: 'object' as const,
  properties: {
    class_comprehension_avg: { type: 'number', description: 'Average comprehension 0-100' },
    difficult_topics: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          topic: { type: 'string' },
          student_count: { type: 'number' },
          description: { type: 'string' },
        },
        required: ['topic', 'student_count', 'description'],
      },
    },
    struggling_students: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          student_id: { type: 'string' },
          name: { type: 'string' },
          comprehension_pct: { type: 'number' },
          main_difficulty: { type: 'string' },
        },
        required: ['student_id', 'name', 'comprehension_pct', 'main_difficulty'],
      },
    },
    suggested_groups: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          group_name: { type: 'string' },
          student_ids: { type: 'array', items: { type: 'string' } },
          topic: { type: 'string' },
          rationale: { type: 'string' },
        },
        required: ['group_name', 'student_ids', 'topic', 'rationale'],
      },
    },
    class_summary: { type: 'string', description: 'Concise summary (2-3 sentences max) of how the class went — general trend, not individual students' },
    suggested_plan: { type: 'string', description: 'Brief actionable plan (3-5 bullet points) for the next class' },
  },
  required: [
    'class_comprehension_avg',
    'difficult_topics',
    'struggling_students',
    'suggested_groups',
    'class_summary',
    'suggested_plan',
  ],
};

export async function runClassAnalyst(activityId: string): Promise<{
  analysis: ClassAnalysis;
  understanding_avg: number;
  summary: string;
}> {
  const activity = db
    .prepare('SELECT * FROM activities WHERE id = ?')
    .get(activityId) as any;

  if (!activity) throw new Error('activity_not_found');

  const sessions = db
    .prepare(
      `SELECT s.*, u.name AS student_name, u.id AS student_id
       FROM activity_sessions s
       JOIN users u ON u.id = s.student_id
       WHERE s.activity_id = ? AND s.status = 'completed'`
    )
    .all(activityId) as any[];

  if (sessions.length === 0) throw new Error('no_completed_sessions');

  const sessionBlocks = sessions
    .map((s: any) => {
      const ideas = jsonParse<any[]>(s.extracted_ideas, []);
      const difficultTopics = jsonParse<string[]>(s.difficult_topics, []);
      return (
        `Student ID: ${s.student_id}\n` +
        `Student Name: ${s.student_name}\n` +
        `Comprehension: ${s.comprehension_pct ?? '?'}%\n` +
        `Difficult topics: ${JSON.stringify(difficultTopics)}\n` +
        `Summary: ${s.session_summary ?? '(no summary)'}\n` +
        `Ideas: ${ideas.map((i: any) => i.text).join('; ') || '(none)'}\n` +
        `Teacher report:\n${s.teacher_report ?? '(no report)'}`
      );
    })
    .join('\n\n─────────────────\n\n');

  const input =
    `Activity: ${activity.title}\n` +
    `Topic: ${activity.topic}\n` +
    `Objective: ${activity.objective}\n\n` +
    `Session Reports (${sessions.length} students):\n\n` +
    sessionBlocks;

  const client = requireAnthropic();

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 4096,
    system:
      'Sos un analista pedagógico experto. Te doy los reportes de sesiones socráticas de todos los alumnos de una clase para una actividad. ' +
      'Analizá los datos y generá un panorama completo para el docente. Usá la herramienta submit_class_analysis para devolver el resultado. ' +
      'Escribí todo en español rioplatense, tono profesional.',
    messages: [{ role: 'user', content: input }],
    tools: [
      {
        name: 'submit_class_analysis',
        description: 'Submit the structured class analysis',
        input_schema: classAnalysisSchema,
      },
    ],
    tool_choice: { type: 'tool' as const, name: 'submit_class_analysis' },
  });

  const toolBlock = response.content.find((b) => b.type === 'tool_use');
  if (!toolBlock || toolBlock.type !== 'tool_use') {
    throw new Error('Class analyst did not call submit_class_analysis');
  }

  const analysis = toolBlock.input as unknown as ClassAnalysis;

  return {
    analysis,
    understanding_avg: analysis.class_comprehension_avg,
    summary: analysis.class_summary,
  };
}
