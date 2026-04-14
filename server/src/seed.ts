import 'dotenv/config';
import { db, applySchema } from './db.js';

// Fresh DB every seed: drop all tables then re-apply schema.sql.
const tables = [
  'activity_summaries',
  'student_profiles',
  'student_ideas',
  'messages',
  'activity_sessions',
  'activities',
  'class_plans',
  'course_students',
  'courses',
  'users',
];
for (const t of tables) db.exec(`DROP TABLE IF EXISTS ${t};`);

applySchema();

const now = () => new Date().toISOString();

const insertUser = db.prepare(
  `INSERT INTO users (id, role, name, email, avatar_initials, created_at)
   VALUES (?, ?, ?, ?, ?, ?)`
);

// 2 teachers
insertUser.run('yairp', 'teacher', 'Yair Perez', 'yairp@criteria.dev', 'YP', now());
insertUser.run('rosariom', 'teacher', 'Rosario Morales', 'rosariom@criteria.dev', 'RM', now());

// 6 students
insertUser.run('sofiam', 'student', 'Sofía Martínez', 'sofiam@criteria.dev', 'SM', now());
insertUser.run('mateol', 'student', 'Mateo López', 'mateol@criteria.dev', 'ML', now());
insertUser.run('valentinag', 'student', 'Valentina García', 'valentinag@criteria.dev', 'VG', now());
insertUser.run('thiagor', 'student', 'Thiago Rodríguez', 'thiagor@criteria.dev', 'TR', now());
insertUser.run('camilaf', 'student', 'Camila Fernández', 'camilaf@criteria.dev', 'CF', now());
insertUser.run('benjamind', 'student', 'Benjamín Díaz', 'benjamind@criteria.dev', 'BD', now());

// 4 courses
const insertCourse = db.prepare(
  `INSERT INTO courses (id, teacher_id, name, year_or_level, created_at)
   VALUES (?, ?, ?, ?, ?)`
);
insertCourse.run('hist-3a', 'yairp', 'Historia 3ro A', '3ro A', now());
insertCourse.run('ciud-4b', 'yairp', 'Ciudadanía 4to B', '4to B', now());
insertCourse.run('hist-2c', 'rosariom', 'Historia 2do C', '2do C', now());
insertCourse.run('ciud-3a', 'rosariom', 'Ciudadanía 3ro A', '3ro A', now());

const insertMember = db.prepare(
  `INSERT INTO course_students (course_id, student_id) VALUES (?, ?)`
);
const memberships: Array<[string, string]> = [
  ['hist-3a', 'sofiam'],
  ['hist-3a', 'mateol'],
  ['hist-3a', 'valentinag'],
  ['hist-3a', 'thiagor'],
  ['hist-3a', 'camilaf'],
  ['hist-3a', 'benjamind'],
  ['ciud-4b', 'sofiam'],
  ['ciud-4b', 'mateol'],
  ['ciud-4b', 'benjamind'],
  ['hist-2c', 'valentinag'],
  ['hist-2c', 'camilaf'],
  ['ciud-3a', 'thiagor'],
  ['ciud-3a', 'benjamind'],
];
for (const [c, s] of memberships) insertMember.run(c, s);

const insertProfile = db.prepare(
  `INSERT INTO student_profiles (student_id, summary, updated_at) VALUES (?, ?, ?)`
);
for (const id of ['sofiam', 'mateol', 'valentinag', 'thiagor', 'camilaf', 'benjamind']) {
  insertProfile.run(id, '', now());
}

const insertActivity = db.prepare(
  `INSERT INTO activities (
     id, teacher_id, course_id, class_plan_id, title, objective, topic,
     estimated_duration_minutes, status, config, created_at
   ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
);

insertActivity.run(
  'act-revolucion',
  'yairp',
  'hist-3a',
  null,
  'La Revolución de Mayo',
  'Que el alumno explique por qué hubo tensiones entre Buenos Aires y el interior.',
  'Semana de Mayo y el Cabildo Abierto',
  30,
  'active',
  JSON.stringify({
    initial_question: '¿Por qué te parece que en 1810 no todos estaban de acuerdo con lo mismo?',
    success_criteria: 'El alumno identifica al menos dos intereses en tensión.',
    agent_tone: 'socrático, cercano, sin dar respuestas',
  }),
  now()
);

insertActivity.run(
  'act-justicia',
  'yairp',
  'ciud-4b',
  null,
  'Qué es la justicia',
  'Que el alumno formule una definición propia de justicia contrastando dos ejemplos.',
  'Ética — concepto de justicia',
  30,
  'draft',
  JSON.stringify({
    initial_question: '¿Te parece justo que dos personas que hicieron lo mismo reciban castigos distintos?',
    success_criteria: 'El alumno articula un criterio propio y reconoce al menos una tensión.',
    agent_tone: 'socrático, cercano, sin dar respuestas',
  }),
  now()
);

console.log('seed done: 2 teachers, 6 students, 4 courses, 2 activities');
