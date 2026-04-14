import type { CourseAnalytics } from './contracts.js';
import { db, jsonParse } from './db.js';
import { requireAnthropic } from './anthropic.js';
import { nanoid } from 'nanoid';

const MODEL = process.env.ANTHROPIC_MODEL_ANALYST ?? 'claude-opus-4-6';

const courseAnalyticsSchema = {
  type: 'object' as const,
  properties: {
    course_comprehension_avg: { type: 'number', description: 'Average comprehension 0-100 across all activities' },
    student_rankings: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          student_id: { type: 'string' },
          name: { type: 'string' },
          comprehension_avg: { type: 'number', description: 'Average comprehension across activities' },
          trend: { type: 'string', enum: ['improving', 'stable', 'declining'], description: 'Based on chronological comprehension scores' },
          main_strengths: { type: 'string' },
          main_difficulties: { type: 'string' },
        },
        required: ['student_id', 'name', 'comprehension_avg', 'trend', 'main_strengths', 'main_difficulties'],
      },
    },
    accumulated_difficult_topics: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          topic: { type: 'string' },
          frequency: { type: 'number', description: 'Number of activities where this topic appeared as difficult' },
          description: { type: 'string' },
        },
        required: ['topic', 'frequency', 'description'],
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
    course_summary: { type: 'string', description: 'Narrative summary of how the course is going overall' },
  },
  required: ['course_comprehension_avg', 'student_rankings', 'accumulated_difficult_topics', 'suggested_groups', 'course_summary'],
};

export async function runCourseAnalyst(courseId: string): Promise<CourseAnalytics> {
  const course = db
    .prepare('SELECT * FROM courses WHERE id = ?')
    .get(courseId) as any;

  if (!course) throw new Error('course_not_found');

  const summaries = db
    .prepare(
      `SELECT a.title, a.topic, a.objective, s.analysis, s.understanding_avg
       FROM activity_summaries s
       JOIN activities a ON a.id = s.activity_id
       WHERE s.course_id = ?
       ORDER BY s.created_at ASC`
    )
    .all(courseId) as any[];

  const sessions = db
    .prepare(
      `SELECT s.student_id, u.name AS student_name, s.comprehension_pct, s.difficult_topics,
              s.completed_at, a.title AS activity_title
       FROM activity_sessions s
       JOIN users u ON u.id = s.student_id
       JOIN activities a ON a.id = s.activity_id
       WHERE a.course_id = ? AND s.status = 'completed'
       ORDER BY s.completed_at ASC`
    )
    .all(courseId) as any[];

  const profiles = db
    .prepare(
      `SELECT sp.student_id, u.name, sp.summary
       FROM student_profiles sp
       JOIN users u ON u.id = sp.student_id
       JOIN course_students cs ON cs.student_id = sp.student_id AND cs.course_id = ?`
    )
    .all(courseId) as any[];

  if (summaries.length === 0 && sessions.length === 0) {
    throw new Error('no_data_for_course');
  }

  const summaryBlocks = summaries
    .map((s: any) => {
      const analysis = jsonParse<any>(s.analysis, null);
      return (
        `Activity: ${s.title} (${s.topic})\n` +
        `Objective: ${s.objective}\n` +
        `Class comprehension: ${s.understanding_avg ?? '?'}%\n` +
        (analysis
          ? `Difficult topics: ${JSON.stringify(analysis.difficult_topics ?? [])}\n` +
            `Struggling students: ${JSON.stringify(analysis.struggling_students ?? [])}`
          : '(no detailed analysis)')
      );
    })
    .join('\n\n─────────────────\n\n');

  const studentSessionBlocks = sessions
    .map((s: any) => {
      const topics = jsonParse<string[]>(s.difficult_topics, []);
      return (
        `Student ID: ${s.student_id} | Name: ${s.student_name}\n` +
        `Activity: ${s.activity_title}\n` +
        `Comprehension: ${s.comprehension_pct ?? '?'}% | Date: ${s.completed_at ?? ''}\n` +
        `Difficult topics: ${JSON.stringify(topics)}`
      );
    })
    .join('\n\n');

  const profileBlocks = profiles
    .map((p: any) => `Student ID: ${p.student_id} | Name: ${p.name}\nProfile: ${p.summary || '(no profile yet)'}`)
    .join('\n\n');

  const input =
    `Course: ${course.name} (${course.year_or_level})\n\n` +
    `=== ACTIVITY SUMMARIES (${summaries.length}) ===\n\n${summaryBlocks || '(none yet)'}\n\n` +
    `=== INDIVIDUAL SESSION HISTORY (for trend calculation) ===\n\n${studentSessionBlocks || '(none)'}\n\n` +
    `=== STUDENT PROFILES ===\n\n${profileBlocks || '(none)'}`;

  const client = requireAnthropic();

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 4096,
    system:
      'Sos un analista pedagógico experto. Te doy los resúmenes de todas las actividades de un curso, el historial de sesiones individuales de cada alumno (con comprensión % y fecha para calcular tendencias), y los perfiles cognitivos de los alumnos. ' +
      'Generá un análisis completo del curso. Para la tendencia de cada alumno, compará su comprensión cronológicamente: si mejoró entre actividades es "improving", si se mantuvo es "stable", si empeoró es "declining". ' +
      'Usá la herramienta submit_course_analysis para devolver el resultado. Escribí todo en español rioplatense, tono profesional.',
    messages: [{ role: 'user', content: input }],
    tools: [
      {
        name: 'submit_course_analysis',
        description: 'Submit the structured course analysis',
        input_schema: courseAnalyticsSchema,
      },
    ],
    tool_choice: { type: 'tool' as const, name: 'submit_course_analysis' },
  });

  const toolBlock = response.content.find((b) => b.type === 'tool_use');
  if (!toolBlock || toolBlock.type !== 'tool_use') {
    throw new Error('Course analyst did not call submit_course_analysis');
  }

  const analysis = toolBlock.input as unknown as CourseAnalytics;

  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO course_analytics (id, course_id, analysis, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(course_id) DO UPDATE SET analysis = excluded.analysis, updated_at = excluded.updated_at`
  ).run(nanoid(), courseId, JSON.stringify(analysis), now, now);

  return analysis;
}
