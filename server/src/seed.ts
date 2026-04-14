import 'dotenv/config';
import { db, applySchema } from './db.js';

// Fresh DB every seed: drop all tables then re-apply schema.sql.
const tables = [
  'course_analytics',
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

// ── helpers for stable timestamps ────────────────────────────────────────────
const daysAgo = (d: number, h = 0, m = 0) => {
  const dt = new Date();
  dt.setDate(dt.getDate() - d);
  dt.setHours(h, m, 0, 0);
  return dt.toISOString();
};

const insertUser = db.prepare(
  `INSERT INTO users (id, role, name, email, avatar_initials, created_at)
   VALUES (?, ?, ?, ?, ?, ?)`
);

// 2 teachers
insertUser.run('yairp',    'teacher', 'Yair Perez',      'yairp@criteria.dev',    'YP', now());
insertUser.run('rosariom', 'teacher', 'Rosario Morales', 'rosariom@criteria.dev', 'RM', now());

// 10 students
insertUser.run('sofiam',    'student', 'Sofía Martínez',       'sofiam@criteria.dev',    'SM', now());
insertUser.run('mateol',    'student', 'Mateo López',          'mateol@criteria.dev',    'ML', now());
insertUser.run('valentinag','student', 'Valentina García',     'valentinag@criteria.dev','VG', now());
insertUser.run('thiagor',   'student', 'Thiago Rodríguez',     'thiagor@criteria.dev',   'TR', now());
insertUser.run('camilaf',   'student', 'Camila Fernández',     'camilaf@criteria.dev',   'CF', now());
insertUser.run('benjamind', 'student', 'Benjamín Díaz',        'benjamind@criteria.dev', 'BD', now());
insertUser.run('lucianaa',  'student', 'Luciana Álvarez',      'lucianaa@criteria.dev',  'LA', now());
insertUser.run('santip',    'student', 'Santiago Pereyra',     'santip@criteria.dev',    'SP', now());
insertUser.run('milag',     'student', 'Milagros González',    'milag@criteria.dev',     'MG', now());
insertUser.run('facur',     'student', 'Facundo Ramírez',      'facur@criteria.dev',     'FR', now());

// ── courses ───────────────────────────────────────────────────────────────────
const insertCourse = db.prepare(
  `INSERT INTO courses (id, teacher_id, name, year_or_level, created_at)
   VALUES (?, ?, ?, ?, ?)`
);
insertCourse.run('hist-3a', 'yairp',    'History 3rd A',       '3rd A', now());
insertCourse.run('ciud-4b', 'yairp',    'Citizenship 4th B',  '4th B', now());
insertCourse.run('hist-2c', 'rosariom', 'History 2nd C',      '2nd C', now());
insertCourse.run('ciud-3a', 'rosariom', 'Citizenship 3rd A',  '3rd A', now());

// ── course members ────────────────────────────────────────────────────────────
const insertMember = db.prepare(
  `INSERT INTO course_students (course_id, student_id) VALUES (?, ?)`
);
const memberships: Array<[string, string]> = [
  // hist-3a: 8 students
  ['hist-3a', 'sofiam'],
  ['hist-3a', 'mateol'],
  ['hist-3a', 'valentinag'],
  ['hist-3a', 'thiagor'],
  ['hist-3a', 'camilaf'],
  ['hist-3a', 'benjamind'],
  ['hist-3a', 'lucianaa'],
  ['hist-3a', 'santip'],
  // ciud-4b: 6 students
  ['ciud-4b', 'sofiam'],
  ['ciud-4b', 'mateol'],
  ['ciud-4b', 'benjamind'],
  ['ciud-4b', 'milag'],
  ['ciud-4b', 'facur'],
  ['ciud-4b', 'lucianaa'],
  // hist-2c
  ['hist-2c', 'valentinag'],
  ['hist-2c', 'camilaf'],
  // ciud-3a
  ['ciud-3a', 'thiagor'],
  ['ciud-3a', 'benjamind'],
];
for (const [c, s] of memberships) insertMember.run(c, s);

// ── student profiles ──────────────────────────────────────────────────────────
const insertProfile = db.prepare(
  `INSERT INTO student_profiles (student_id, summary, updated_at) VALUES (?, ?, ?)`
);

insertProfile.run(
  'sofiam',
  'Sofía demonstrates a remarkable ability to connect abstract concepts with spatial and visual analogies: when discussing the rise of cities she compares them to expanding rings, and when talking about participation she uses water-current metaphors. She takes the initiative to hypothesize before the tutor guides her, which accelerates the Socratic cycle. Her area for improvement is the tendency to generalize without checking for exceptions; when invited to look for counterexamples she finds them easily but rarely proposes them on her own. She shows high intrinsic motivation and persists through difficult questions without signs of frustration.',
  daysAgo(1)
);

insertProfile.run(
  'mateol',
  'Mateo learns best when concepts are anchored in concrete situations close to his everyday experience: he needs physical or narrative examples before he can abstract. He shows initial resistance to open-ended questions — he interprets uncertainty as a lack of information — but once he understands that his opinion is being sought, his answers are solid and well-reasoned. His consolidation pace is slower than the course average, although the conclusions he reaches tend to be more nuanced.',
  daysAgo(1)
);

insertProfile.run(
  'valentinag',
  'Valentina is the student with the strongest synthesis ability in the group. She reaches complete causal models with few tutor interventions. She has a broad vocabulary and formulates generalizable conclusions. Her risk is speed: she sometimes skips steps without verifying assumptions. She benefits from challenges that break simple models.',
  daysAgo(2)
);

insertProfile.run(
  'thiagor',
  'Thiago participates enthusiastically but tends to get sidetracked. He latches onto anecdotal details and struggles to abstract. He responds well when the tutor redirects him with closed questions and then gradually reopens. He has a good memory for specific facts and makes unexpected connections with popular culture.',
  daysAgo(3)
);

insertProfile.run(
  'camilaf',
  'Camila has solid analytical thinking but low confidence. She hesitates a lot before answering and prefers to be told whether she is on the right track. When given space and her own words are reflected back to her rephrased, she gains confidence and goes deeper. Her best answers come when she feels no time pressure.',
  daysAgo(2)
);

insertProfile.run(
  'benjamind',
  'Benjamín is the least participative student in the course. He answers in monosyllables and requires a lot of scaffolding to make progress. He does not show resistance but rather disinterest or difficulty connecting with abstract topics. He works better with questions linked to his everyday life and technology.',
  daysAgo(4)
);

insertProfile.run(
  'lucianaa',
  'Luciana is methodical and organized in her reasoning. She builds arguments step by step and likes to verify each stage before moving forward. She has a knack for spotting contradictions in texts. Her challenge is gaining speed without losing rigor, and daring to hypothesize without having all the information.',
  daysAgo(3)
);

insertProfile.run(
  'santip',
  'Santiago is creative and makes original connections between seemingly unrelated topics. He tends to go off on tangents but his digressions are usually productive if the tutor redirects them. He works especially well in activities where he can debate or defend a position.',
  daysAgo(3)
);

insertProfile.run(
  'milag',
  'Milagros shows strong intuitive understanding but struggles to verbalize her ideas. When the tutor paraphrases what she said, she responds "yes, that" and can go deeper from there. She has a natural empathy that helps her understand multiple perspectives on citizenship topics.',
  daysAgo(5)
);

insertProfile.run(
  'facur',
  'Facundo has a confrontational style that can be productive: he questions premises and does not accept easy answers. He needs to feel the topic matters in order to engage. When motivated his reasoning is sharp; when not, he disconnects quickly. He works well with moral dilemmas and controversial topics.',
  daysAgo(4)
);

// ── activities ────────────────────────────────────────────────────────────────
const insertActivity = db.prepare(
  `INSERT INTO activities (
     id, teacher_id, course_id, class_plan_id, title, objective, topic,
     estimated_duration_minutes, status, config, created_at
   ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
);

// hist-3a — closed
insertActivity.run(
  'act-ciudades', 'yairp', 'hist-3a', null,
  'The origin of cities',
  'The student explains why the first cities arose and what conditions made it possible.',
  'Ancient history — urban revolution',
  30, 'closed',
  JSON.stringify({ initial_question: 'Why do you think people started living together in large places instead of staying in small groups?', success_criteria: 'The student identifies at least two factors (agricultural surplus, division of labor, defense) and relates them to each other.' }),
  daysAgo(21)
);

// hist-3a — closed
insertActivity.run(
  'act-mesopotamia', 'yairp', 'hist-3a', null,
  'Mesopotamia: between rivers and power',
  'The student understands how geography shaped political organization in Mesopotamia.',
  'Ancient history — river civilizations',
  30, 'closed',
  JSON.stringify({ initial_question: 'Why do you think the first civilizations arose next to rivers and not just anywhere?', success_criteria: 'The student connects water control with political power and agricultural surplus.' }),
  daysAgo(14)
);

// hist-3a — closed
insertActivity.run(
  'act-egipto', 'yairp', 'hist-3a', null,
  'Egypt: the pharaoh and the Nile',
  'The student explains the relationship between control of the Nile and the centralization of power in Egypt.',
  'Ancient history — Egypt',
  30, 'closed',
  JSON.stringify({ initial_question: 'Why was a single ruler able to control all of Egypt for thousands of years?', success_criteria: 'The student connects irrigation control with the legitimization of pharaonic power.' }),
  daysAgo(7)
);

// hist-3a — active
insertActivity.run(
  'act-revolucion', 'yairp', 'hist-3a', null,
  'The May Revolution',
  'The student explains why there were tensions between Buenos Aires and the interior provinces.',
  'May Week and the Open Cabildo',
  30, 'active',
  JSON.stringify({ initial_question: 'Why do you think that in 1810 not everyone agreed on the same thing?', success_criteria: 'The student identifies at least two conflicting interests.' }),
  daysAgo(3)
);

// hist-3a — draft
insertActivity.run(
  'act-independencia', 'yairp', 'hist-3a', null,
  'The road to independence',
  'The student analyzes why 6 years passed between the May Revolution and the declaration of independence.',
  'Independence process 1810-1816',
  30, 'draft',
  JSON.stringify({ initial_question: 'Why do you think it took 6 years to declare independence if they had already carried out the revolution?' }),
  daysAgo(1)
);

// ciud-4b — closed
insertActivity.run(
  'act-participar', 'yairp', 'ciud-4b', null,
  'Participate — what for?',
  'The student reflects on the meaning of citizen participation and evaluates its limits and possibilities.',
  'Citizenship — democratic participation',
  30, 'closed',
  JSON.stringify({ initial_question: 'Have you ever tried to change something you thought was unfair? What did you do?' }),
  daysAgo(15)
);

// ciud-4b — closed
insertActivity.run(
  'act-igualdad', 'yairp', 'ciud-4b', null,
  'Equality vs. equity',
  'The student distinguishes between formal equality and equity, using concrete examples.',
  'Citizenship — equality and equity',
  30, 'closed',
  JSON.stringify({ initial_question: 'Is treating everyone the same the same as treating everyone fairly?' }),
  daysAgo(8)
);

// ciud-4b — active
insertActivity.run(
  'act-derechos', 'yairp', 'ciud-4b', null,
  'What does it mean to have rights?',
  'The student explores the concept of rights starting from personal experience and arrives at a well-founded definition.',
  'Citizenship — rights and obligations',
  30, 'active',
  JSON.stringify({ initial_question: 'Have you ever felt that something you were entitled to was not given to you? How did you know you were entitled to it?' }),
  daysAgo(5)
);

// ciud-4b — draft
insertActivity.run(
  'act-justicia', 'yairp', 'ciud-4b', null,
  'What is justice',
  'The student formulates a personal definition of justice by contrasting two examples.',
  'Ethics — concept of justice',
  30, 'draft',
  JSON.stringify({ initial_question: 'Do you think it is fair that two people who did the same thing receive different punishments?' }),
  daysAgo(2)
);

// ── helpers ───────────────────────────────────────────────────────────────────
const insertSession = db.prepare(
  `INSERT INTO activity_sessions
     (id, activity_id, student_id, status, current_phase, phase_turn_count,
      started_at, completed_at, session_summary, teacher_report, extracted_ideas,
      managed_session_id, comprehension_pct, difficult_topics)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
);

const insertMessage = db.prepare(
  `INSERT INTO messages
     (id, session_id, turn_index, role, content, phase_at_turn, analyzer_json, created_at)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
);

const insertIdea = db.prepare(
  `INSERT INTO student_ideas
     (id, student_id, course_id, activity_id, session_id, text, question_that_triggered_it, connections, created_at)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
);

// Helper to bulk-insert a session with messages
function seedSession(
  id: string, activityId: string, studentId: string, status: string,
  phase: string, phaseTurns: number, startDay: number, startH: number,
  endDay: number | null, endH: number, endM: number,
  summary: string | null, report: string | null,
  ideas: string[], comprehension: number, difficulties: string[],
  messages: Array<[string, number, string, string, string]>
) {
  insertSession.run(
    id, activityId, studentId, status, phase, phaseTurns,
    daysAgo(startDay, startH, 0),
    endDay !== null ? daysAgo(endDay, endH, endM) : null,
    summary, report, JSON.stringify(ideas), null, comprehension, JSON.stringify(difficulties)
  );
  for (const [msgId, idx, role, content, msgPhase] of messages) {
    insertMessage.run(msgId, id, idx, role, content, msgPhase, null, daysAgo(startDay, startH, idx * 3));
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SESSIONS — act-ciudades (closed, hist-3a) — 7 students completed
// ═══════════════════════════════════════════════════════════════════════════════

seedSession('sess-sofia-ciudades', 'act-ciudades', 'sofiam', 'completed',
  'consolidation', 2, 20, 9, 20, 9, 28,
  'Sofía quickly arrived at the idea of agricultural surplus and articulated it with the division of labor using a concentric-rings analogy.',
  '## Report — Sofía Martínez\n### Strengths\n- Built the causal chain autonomously.\n- Used original spatial analogies.\n### Areas for improvement\n- Tendency to generalize without exploring exceptions.',
  ['The agricultural surplus meant not everyone had to produce food', 'Specialization creates interdependence'], 85, [],
  [['msg-sc-1', 0, 'assistant', 'Why do you think people started living together in large places instead of staying in small groups?', 'anchoring'],
   ['msg-sc-2', 1, 'student', 'Well… I guess it was easier. If you\'re with more people you can help each other out.', 'anchoring'],
   ['msg-sc-3', 2, 'assistant', 'Interesting. Easier for what, specifically?', 'exploration'],
   ['msg-sc-4', 3, 'student', 'Hmm, you can have someone who heals the sick, another who builds, another who farms.', 'exploration'],
   ['msg-sc-5', 4, 'assistant', 'How does that work if there isn\'t enough food for everyone? What would need to happen first?', 'tension'],
   ['msg-sc-6', 5, 'student', 'There has to be surplus food. First you need to be able to produce more than you need yourself.', 'tension'],
   ['msg-sc-7', 6, 'assistant', 'How would you summarize the chain that leads to a city arising?', 'consolidation'],
   ['msg-sc-8', 7, 'student', 'First you produce more food. That allows specialization. And if everyone depends on everyone else, it makes sense to live close together. Like rings that keep adding up.', 'consolidation']]
);

seedSession('sess-mateo-ciudades', 'act-ciudades', 'mateol', 'completed',
  'consolidation', 3, 20, 10, 20, 10, 35,
  'Mateo started with short answers until the tutor anchored him in his own neighborhood. From there he built the argument step by step.',
  '## Report — Mateo López\n### Strengths\n- Spontaneously identified defense as a motivation.\n### Areas for improvement\n- Needs concrete scaffolding to get started.',
  ['Living together also served for defense'], 45, ['agricultural surplus', 'division of labor'],
  [['msg-mc-1', 0, 'assistant', 'Why do you think people started living together in large places?', 'anchoring'],
   ['msg-mc-2', 1, 'student', 'I don\'t know. Because they wanted to, I guess.', 'anchoring'],
   ['msg-mc-3', 2, 'assistant', 'Think about your neighborhood: why do you live there with other people instead of living alone in the countryside?', 'anchoring'],
   ['msg-mc-4', 3, 'student', 'Oh, well, because there are shops, schools, everything is nearby.', 'exploration'],
   ['msg-mc-5', 4, 'assistant', 'And what would need to exist first for there to be shops and schools?', 'exploration'],
   ['msg-mc-6', 5, 'student', 'People. And they need food. Also someone to defend them if another group comes.', 'tension'],
   ['msg-mc-7', 6, 'assistant', 'Which of those three things has to come first?', 'tension'],
   ['msg-mc-8', 7, 'student', 'Food. Without food you can\'t do anything else.', 'consolidation']]
);

seedSession('sess-vale-ciudades', 'act-ciudades', 'valentinag', 'completed',
  'consolidation', 1, 20, 11, 20, 11, 20,
  'Valentina reached synthesis in few interventions, anticipating concepts before the tutor suggested them.',
  '## Report — Valentina García\n### Strengths\n- Synthesis ability well above average.\n### Areas for improvement\n- Speed may hide unchecked assumptions.',
  ['A city is possible when production exceeds individual subsistence'], 92, [],
  [['msg-vc-1', 0, 'assistant', 'Why do you think people started living together in large places?', 'anchoring'],
   ['msg-vc-2', 1, 'student', 'Because when they started farming they produced more food than they needed. Some could make pottery, build, govern. And to coordinate all of that, the most practical thing was to live close together.', 'exploration'],
   ['msg-vc-3', 2, 'assistant', 'Can you think of a case where there was surplus but no city emerged?', 'tension'],
   ['msg-vc-4', 3, 'student', 'Yes, if the group was too small or if the surplus wasn\'t stable. Without all three conditions together there\'s no city.', 'consolidation']]
);

seedSession('sess-thiago-ciudades', 'act-ciudades', 'thiagor', 'completed',
  'consolidation', 2, 20, 12, 20, 12, 30,
  'Thiago latched onto the idea of defense and connected it to medieval fortresses. It was hard to redirect him to agricultural surplus as the primary cause.',
  '## Report — Thiago Rodríguez\n### Strengths\n- Creative connections with popular culture and other eras.\n### Areas for improvement\n- Tends to get sidetracked, needs frequent redirection.',
  ['Walls are a consequence of the city, not its cause'], 55, ['causation vs. correlation'],
  [['msg-tc-1', 0, 'assistant', 'Why do you think people started living together in large places?', 'anchoring'],
   ['msg-tc-2', 1, 'student', 'To defend themselves. Like medieval castles, right? They gathered to be safer.', 'anchoring'],
   ['msg-tc-3', 2, 'assistant', 'Interesting. But what do you need before you can gather that many people in one place? How do you feed them?', 'exploration'],
   ['msg-tc-4', 3, 'student', 'Oh, right. You need food. A lot of food. I mean, first you farm, then you defend.', 'exploration'],
   ['msg-tc-5', 4, 'assistant', 'So, are walls the cause of the city or a consequence?', 'tension'],
   ['msg-tc-6', 5, 'student', 'They\'re a consequence. First the city arose because of food and then you protected it. I got carried away with the castles thing.', 'consolidation']]
);

seedSession('sess-camila-ciudades', 'act-ciudades', 'camilaf', 'completed',
  'consolidation', 2, 20, 13, 20, 13, 35,
  'Camila was cautious but precise. She asked for confirmation several times but her final answers were solid.',
  '## Report — Camila Fernández\n### Strengths\n- Methodical and careful reasoning.\n### Areas for improvement\n- Low confidence: needs frequent external validation.',
  ['The division of labor only works if there is surplus to sustain it'], 70, ['confidence in her answers'],
  [['msg-cc-1', 0, 'assistant', 'Why do you think people started living together in large places?', 'anchoring'],
   ['msg-cc-2', 1, 'student', 'I\'m not sure… could it be because it was more practical to work together?', 'anchoring'],
   ['msg-cc-3', 2, 'assistant', 'What kind of work would be more practical to do together?', 'exploration'],
   ['msg-cc-4', 3, 'student', 'If one person specializes in something, like making tools, and another farms… is that right?', 'exploration'],
   ['msg-cc-5', 4, 'assistant', 'Exactly! That\'s called the division of labor. What is needed for it to work?', 'tension'],
   ['msg-cc-6', 5, 'student', 'The farmer needs to produce enough for both. Otherwise the toolmaker starves.', 'tension'],
   ['msg-cc-7', 6, 'assistant', 'How would you summarize it?', 'consolidation'],
   ['msg-cc-8', 7, 'student', 'First you need a food surplus, that allows some people to do other things, and it makes sense to live together to coordinate. Is that right?', 'consolidation']]
);

seedSession('sess-benjamin-ciudades', 'act-ciudades', 'benjamind', 'completed',
  'tension', 3, 20, 14, 20, 14, 40,
  'Benjamín participated minimally. He came to understand surplus but could not articulate the complete causal chain.',
  '## Report — Benjamín Díaz\n### Strengths\n- With extensive scaffolding he grasps individual concepts.\n### Areas for improvement\n- Does not integrate concepts into a coherent argument. Very low participation.',
  [], 25, ['causal chain', 'synthesis'],
  [['msg-bc-1', 0, 'assistant', 'Why do you think people started living together in large places?', 'anchoring'],
   ['msg-bc-2', 1, 'student', 'No idea.', 'anchoring'],
   ['msg-bc-3', 2, 'assistant', 'Could you live alone without needing anything from anyone?', 'anchoring'],
   ['msg-bc-4', 3, 'student', 'No, I need food and stuff.', 'exploration'],
   ['msg-bc-5', 4, 'assistant', 'And where does that food come from?', 'exploration'],
   ['msg-bc-6', 5, 'student', 'From the countryside. Someone grows it.', 'tension']]
);

seedSession('sess-luciana-ciudades', 'act-ciudades', 'lucianaa', 'completed',
  'consolidation', 2, 20, 15, 20, 15, 30,
  'Luciana built the argument methodically, verifying each step. She reached a precise synthesis although it took her more turns than Valentina.',
  '## Report — Luciana Álvarez\n### Strengths\n- Rigorous and verifiable reasoning.\n### Areas for improvement\n- Could take more risks hypothesizing without having all the information.',
  ['Order matters: surplus first, specialization second, city as a result'], 80, [],
  [['msg-lc-1', 0, 'assistant', 'Why do you think people started living together in large places?', 'anchoring'],
   ['msg-lc-2', 1, 'student', 'There must have been some change that made it possible. Before agriculture they couldn\'t.', 'anchoring'],
   ['msg-lc-3', 2, 'assistant', 'What exactly changed with agriculture?', 'exploration'],
   ['msg-lc-4', 3, 'student', 'They could produce more food than they needed. That freed people up to do other things.', 'exploration'],
   ['msg-lc-5', 4, 'assistant', 'And that automatically creates a city?', 'tension'],
   ['msg-lc-6', 5, 'student', 'No, you also need organization. Someone to coordinate who does what. And it helps to be together for that.', 'tension'],
   ['msg-lc-7', 6, 'assistant', 'So what is the order then?', 'consolidation'],
   ['msg-lc-8', 7, 'student', 'First agricultural surplus, then specialization, then organization, and the city is the result of all of that together.', 'consolidation']]
);

seedSession('sess-santi-ciudades', 'act-ciudades', 'santip', 'completed',
  'consolidation', 2, 20, 16, 20, 16, 28,
  'Santiago made an original connection with the Industrial Revolution and had to be redirected to the ancient period. Once focused, his reasoning was solid.',
  '## Report — Santiago Pereyra\n### Strengths\n- Original interdisciplinary connections.\n### Areas for improvement\n- Goes off topic, needs redirection.',
  ['The concentration of resources generates concentration of people, in any era'], 72, ['maintaining temporal focus'],
  [['msg-spc-1', 0, 'assistant', 'Why do you think people started living together in large places?', 'anchoring'],
   ['msg-spc-2', 1, 'student', 'It\'s like the Industrial Revolution, right? People went to the cities for work.', 'anchoring'],
   ['msg-spc-3', 2, 'assistant', 'Good parallel. But we\'re talking about thousands of years earlier. What "work" would there have been at that time to attract people?', 'exploration'],
   ['msg-spc-4', 3, 'student', 'Oh, well, at that time what mattered was food. If someone had a lot of food, others went there.', 'exploration'],
   ['msg-spc-5', 4, 'assistant', 'And what happened when they arrived?', 'tension'],
   ['msg-spc-6', 5, 'student', 'Each person did something different. One built, another made weapons. And that\'s how a city was formed.', 'tension'],
   ['msg-spc-7', 6, 'assistant', 'Can you summarize what is needed for an ancient city to emerge?', 'consolidation'],
   ['msg-spc-8', 7, 'student', 'Surplus food, people who specialize, and some form of organization. It\'s always the same: where there are resources, people gather.', 'consolidation']]
);

// ═══════════════════════════════════════════════════════════════════════════════
// SESSIONS — act-mesopotamia (closed, hist-3a) — 6 students completed
// ═══════════════════════════════════════════════════════════════════════════════

seedSession('sess-sofia-meso', 'act-mesopotamia', 'sofiam', 'completed',
  'consolidation', 2, 13, 9, 13, 9, 30,
  'Sofía quickly connected water control with political power. She used the metaphor "whoever controls the faucet, controls the people".',
  null, ['Controlling irrigation is controlling food, and controlling food is controlling people'], 88, [],
  [['msg-sm-1', 0, 'assistant', 'Why do you think the first civilizations arose alongside rivers?', 'anchoring'],
   ['msg-sm-2', 1, 'student', 'Because they needed water to irrigate crops. Without a river there is not enough food.', 'anchoring'],
   ['msg-sm-3', 2, 'assistant', 'And who decided how the water was distributed?', 'exploration'],
   ['msg-sm-4', 3, 'student', 'Someone had to organize that. And whoever organized the irrigation had power over the rest. It\'s like: whoever controls the faucet, controls the people.', 'exploration'],
   ['msg-sm-5', 4, 'assistant', 'Does that mean political power arose from the control of water?', 'tension'],
   ['msg-sm-6', 5, 'student', 'Yes, at least in Mesopotamia. The king was not king just because; he was king because he managed the infrastructure.', 'consolidation']]
);

seedSession('sess-mateo-meso', 'act-mesopotamia', 'mateol', 'completed',
  'tension', 3, 13, 10, 13, 10, 40,
  'Mateo understood the water-food relationship but struggled to make the leap to the water-power relationship.',
  null, ['The river provided food but also problems: they had to organize for the floods'], 42, ['relationship between natural resources and political power'],
  [['msg-mm-1', 0, 'assistant', 'Why do you think the first civilizations arose alongside rivers?', 'anchoring'],
   ['msg-mm-2', 1, 'student', 'Because water is useful for everything: drinking, irrigating, bathing.', 'anchoring'],
   ['msg-mm-3', 2, 'assistant', 'But why did a civilization arise next to a river and not next to a lagoon?', 'exploration'],
   ['msg-mm-4', 3, 'student', 'Because the river had more water. You could irrigate more.', 'exploration'],
   ['msg-mm-5', 4, 'assistant', 'And if the river flooded? What would you do?', 'tension'],
   ['msg-mm-6', 5, 'student', 'You had to organize with others to control the water. Build canals or something.', 'tension'],
   ['msg-mm-7', 6, 'assistant', 'And who was in charge of that organization?', 'tension'],
   ['msg-mm-8', 7, 'student', 'The one who knew about water, I guess. Or the strongest. I don\'t know.', 'tension']]
);

seedSession('sess-vale-meso', 'act-mesopotamia', 'valentinag', 'completed',
  'consolidation', 1, 13, 11, 13, 11, 18,
  'Valentina articulated the resources-power-State relationship very quickly and generalized it to other civilizations.',
  null, ['The State emerges when a critical resource requires collective management'], 95, [],
  [['msg-vm-1', 0, 'assistant', 'Why do you think the first civilizations arose alongside rivers?', 'anchoring'],
   ['msg-vm-2', 1, 'student', 'Because the river enabled large-scale agriculture, but required coordinated irrigation works. That coordination generated power structures. It\'s Wittfogel\'s thesis, right? Hydraulic despotism.', 'exploration'],
   ['msg-vm-3', 2, 'assistant', 'Impressive that you know that. Does it always work or are there exceptions?', 'tension'],
   ['msg-vm-4', 3, 'student', 'Not always. There are civilizations that arose without large rivers, like the Maya with cenotes. But the principle is similar: a critical resource that needs collective management generates centralized power.', 'consolidation']]
);

seedSession('sess-thiago-meso', 'act-mesopotamia', 'thiagor', 'completed',
  'consolidation', 2, 13, 12, 13, 12, 35,
  'Thiago got excited about ziggurats and religion but managed to connect religious power with water control.',
  null, ['The priests controlled the planting calendar because they knew when the flood was coming'], 60, ['distinguishing religion from politics in Mesopotamia'],
  [['msg-tm-1', 0, 'assistant', 'Why do you think the first civilizations arose alongside rivers?', 'anchoring'],
   ['msg-tm-2', 1, 'student', 'Because the gods lived in the river. The temples were next to the water. I saw photos of the ziggurats.', 'anchoring'],
   ['msg-tm-3', 2, 'assistant', 'Interesting. And why did the priests have so much power?', 'exploration'],
   ['msg-tm-4', 3, 'student', 'Because they knew when the river flood was coming. They could predict the seasons.', 'exploration'],
   ['msg-tm-5', 4, 'assistant', 'And what did that give them?', 'tension'],
   ['msg-tm-6', 5, 'student', 'Power. Because if you know when to plant, you control the food. And if you control the food...', 'tension'],
   ['msg-tm-7', 6, 'assistant', 'You control what?', 'consolidation'],
   ['msg-tm-8', 7, 'student', 'You control the people. The priest was powerful because he had useful knowledge about the river.', 'consolidation']]
);

seedSession('sess-luciana-meso', 'act-mesopotamia', 'lucianaa', 'completed',
  'consolidation', 2, 13, 14, 13, 14, 28,
  'Luciana precisely analyzed the chain water→surplus→State and compared it with the case of Egypt.',
  null, ['Mesopotamia had unpredictable rivers, Egypt had the regular Nile; that produced different power structures'], 83, [],
  [['msg-lm-1', 0, 'assistant', 'Why do you think the first civilizations arose alongside rivers?', 'anchoring'],
   ['msg-lm-2', 1, 'student', 'The river provided water for irrigation. More irrigation, more food, more people, more organization needed.', 'anchoring'],
   ['msg-lm-3', 2, 'assistant', 'What kind of organization?', 'exploration'],
   ['msg-lm-4', 3, 'student', 'They had to build canals, maintain them, decide who used how much water. That requires a government.', 'exploration'],
   ['msg-lm-5', 4, 'assistant', 'Would it be the same for all rivers?', 'tension'],
   ['msg-lm-6', 5, 'student', 'No. The Tigris and Euphrates were unpredictable, which is why Mesopotamia had many competing city-states. The Nile was regular, which is why Egypt was a unified kingdom.', 'consolidation']]
);

seedSession('sess-santi-meso', 'act-mesopotamia', 'santip', 'completed',
  'consolidation', 2, 13, 15, 13, 15, 30,
  'Santiago compared Mesopotamia with Silicon Valley: the concentration of a key resource attracts people and generates power.',
  null, ['Rivers were like the internet of antiquity: infrastructure that concentrates power'], 68, ['anachronistic analogies'],
  [['msg-spm-1', 0, 'assistant', 'Why do you think the first civilizations arose alongside rivers?', 'anchoring'],
   ['msg-spm-2', 1, 'student', 'It\'s like Silicon Valley. Where there is a key resource, everyone gathers and someone ends up in charge.', 'anchoring'],
   ['msg-spm-3', 2, 'assistant', 'Interesting parallel. What was the "key resource" in Mesopotamia?', 'exploration'],
   ['msg-spm-4', 3, 'student', 'The river water. And the fertile land alongside it. Those who controlled the irrigation canals were like the owners of tech companies.', 'exploration'],
   ['msg-spm-5', 4, 'assistant', 'Is there any difference between controlling water and controlling technology?', 'tension'],
   ['msg-spm-6', 5, 'student', 'Yes, water is a matter of life or death. Technology is not. That gave more power to whoever controlled the water.', 'tension'],
   ['msg-spm-7', 6, 'assistant', 'How would you summarize it?', 'consolidation'],
   ['msg-spm-8', 7, 'student', 'The control of a vital resource generates political power. In Mesopotamia it was water, today it is data. The mechanism is similar.', 'consolidation']]
);

// ═══════════════════════════════════════════════════════════════════════════════
// SESSIONS — act-egipto (closed, hist-3a) — 7 students completed
// ═══════════════════════════════════════════════════════════════════════════════

seedSession('sess-sofia-egipto', 'act-egipto', 'sofiam', 'completed',
  'consolidation', 2, 6, 9, 6, 9, 25,
  'Sofía understood the pharaoh\'s legitimation as manager of the Nile and connected it with the idea of social contract.',
  null, ['The pharaoh was powerful because he guaranteed the Nile floods — it was an implicit contract'], 90, [],
  [['msg-se-1', 0, 'assistant', 'Why was a single ruler able to control all of Egypt for thousands of years?', 'anchoring'],
   ['msg-se-2', 1, 'student', 'Because everyone depended on the Nile and the pharaoh presented himself as the one who made the Nile work.', 'anchoring'],
   ['msg-se-3', 2, 'assistant', 'And did people believe him?', 'exploration'],
   ['msg-se-4', 3, 'student', 'It was convenient to believe him. If the pharaoh organizes the irrigation and the harvest turns out well, why question him? It\'s like a contract: I obey you, you give me food.', 'exploration'],
   ['msg-se-5', 4, 'assistant', 'What happens when the Nile does not rise?', 'tension'],
   ['msg-se-6', 5, 'student', 'That\'s when the pharaoh has a problem. If he cannot fulfill his part, he loses legitimacy. As happened with some weak pharaohs.', 'consolidation']]
);

seedSession('sess-mateo-egipto', 'act-egipto', 'mateol', 'completed',
  'tension', 3, 6, 10, 6, 10, 40,
  'Mateo understood that the Nile provided food but could not articulate why that centralized power in one person.',
  null, [], 38, ['centralization of power', 'political legitimation'],
  [['msg-me-1', 0, 'assistant', 'Why was a single ruler able to control all of Egypt for thousands of years?', 'anchoring'],
   ['msg-me-2', 1, 'student', 'Because he was the pharaoh and everyone was afraid of him.', 'anchoring'],
   ['msg-me-3', 2, 'assistant', 'Just fear? Was there no benefit to obeying?', 'exploration'],
   ['msg-me-4', 3, 'student', 'Well, the pharaoh organized everything. The canals, the constructions.', 'exploration'],
   ['msg-me-5', 4, 'assistant', 'And why did that make him powerful? Anyone could organize canals, right?', 'tension'],
   ['msg-me-6', 5, 'student', 'No, because it required a lot of people and someone in charge. And religion helped him.', 'tension']]
);

seedSession('sess-vale-egipto', 'act-egipto', 'valentinag', 'completed',
  'consolidation', 1, 6, 11, 6, 11, 15,
  'Valentina compared Egypt with Mesopotamia and argued that the regularity of the Nile allowed for political unification.',
  null, ['Predictable Nile = stable centralized power; unpredictable rivers = competing city-states'], 95, [],
  [['msg-ve-1', 0, 'assistant', 'Why was a single ruler able to control all of Egypt for thousands of years?', 'anchoring'],
   ['msg-ve-2', 1, 'student', 'Because the Nile was predictable. It rose the same way every year. That allowed the pharaoh to plan and deliver. In Mesopotamia it was different: the rivers were chaotic and that is why there was no single stable ruler.', 'exploration'],
   ['msg-ve-3', 2, 'assistant', 'So does geography determine politics?', 'tension'],
   ['msg-ve-4', 3, 'student', 'It does not determine it, but it strongly conditions it. The Nile made centralization possible, but someone had to take advantage of it.', 'consolidation']]
);

seedSession('sess-thiago-egipto', 'act-egipto', 'thiagor', 'completed',
  'consolidation', 2, 6, 12, 6, 12, 30,
  'Thiago was fascinated by the pyramids and from there came to understand the pharaoh\'s power as a mobilizer of labor.',
  null, ['The pyramids were not built by slaves but by workers organized by the pharaoh — that shows his power'], 62, ['distinguishing myth from historical evidence'],
  [['msg-te-1', 0, 'assistant', 'Why was a single ruler able to control all of Egypt for thousands of years?', 'anchoring'],
   ['msg-te-2', 1, 'student', 'Because he built the pyramids. If you can do that, you can do anything.', 'anchoring'],
   ['msg-te-3', 2, 'assistant', 'Good point. How did he get thousands of people to work on that?', 'exploration'],
   ['msg-te-4', 3, 'student', 'With slaves? Oh no, I read they were not slaves. They were peasants who worked when the Nile rose and they could not plant.', 'exploration'],
   ['msg-te-5', 4, 'assistant', 'And why did they obey?', 'tension'],
   ['msg-te-6', 5, 'student', 'Because the pharaoh was like a god. And he also gave them food and shelter. It was a deal.', 'consolidation']]
);

seedSession('sess-camila-egipto', 'act-egipto', 'camilaf', 'completed',
  'consolidation', 2, 6, 13, 6, 13, 35,
  'Camila articulated the Nile-power relationship well but needed more turns and validation to reach the synthesis.',
  null, ['The pharaoh was an intermediary between the Nile (nature) and the people (society)'], 68, [],
  [['msg-ce-1', 0, 'assistant', 'Why was a single ruler able to control all of Egypt for thousands of years?', 'anchoring'],
   ['msg-ce-2', 1, 'student', 'Because the Nile was very important and someone had to manage it... could that be it?', 'anchoring'],
   ['msg-ce-3', 2, 'assistant', 'You\'re doing great. What exactly did they have to "manage"?', 'exploration'],
   ['msg-ce-4', 3, 'student', 'The irrigation. The canals. When to plant. And people obeyed him because without that they would not eat.', 'exploration'],
   ['msg-ce-5', 4, 'assistant', 'Was there any other reason to obey him, besides food?', 'tension'],
   ['msg-ce-6', 5, 'student', 'Religion. The pharaoh was a living god. So it was as if the Nile rose because he asked for it. He was an intermediary between nature and the people.', 'consolidation']]
);

seedSession('sess-benjamin-egipto', 'act-egipto', 'benjamind', 'completed',
  'exploration', 4, 6, 14, 6, 14, 45,
  'Benjamín participated more than in other activities. He understood that the pharaoh had power through food but did not arrive at the idea of legitimation.',
  null, [], 30, ['religious legitimation', 'synthesis of concepts'],
  [['msg-be-1', 0, 'assistant', 'Why was a single ruler able to control all of Egypt for thousands of years?', 'anchoring'],
   ['msg-be-2', 1, 'student', 'Because he was the boss.', 'anchoring'],
   ['msg-be-3', 2, 'assistant', 'But why was HE the boss and not someone else? What did he do?', 'exploration'],
   ['msg-be-4', 3, 'student', 'He controlled the food. That is, the Nile crops.', 'exploration'],
   ['msg-be-5', 4, 'assistant', 'And were people okay with that?', 'exploration'],
   ['msg-be-6', 5, 'student', 'I suppose so, if they had food.', 'exploration']]
);

seedSession('sess-luciana-egipto', 'act-egipto', 'lucianaa', 'completed',
  'consolidation', 2, 6, 15, 6, 15, 25,
  'Luciana analyzed the stability of pharaonic power by comparing it with other systems of government.',
  null, ['The stability of the Nile generated political stability; the two reinforced each other'], 85, [],
  [['msg-le-1', 0, 'assistant', 'Why was a single ruler able to control all of Egypt for thousands of years?', 'anchoring'],
   ['msg-le-2', 1, 'student', 'Because the system worked. The Nile was predictable, the harvests turned out well, and no one had reasons to rebel.', 'anchoring'],
   ['msg-le-3', 2, 'assistant', 'And when did the system stop working?', 'exploration'],
   ['msg-le-4', 3, 'student', 'When there were droughts or the Nile did not rise. That is when the political problems began. Egypt\'s intermediate periods coincide with climate crises.', 'tension'],
   ['msg-le-5', 4, 'assistant', 'So what really sustained the pharaoh: fear, religion, or the economy?', 'consolidation'],
   ['msg-le-6', 5, 'student', 'All three, but the economy was the foundation. Without the Nile working, neither religion nor fear were enough.', 'consolidation']]
);

// ═══════════════════════════════════════════════════════════════════════════════
// SESSIONS — act-participar (closed, ciud-4b) — 5 students completed
// ═══════════════════════════════════════════════════════════════════════════════

seedSession('sess-sofia-participar', 'act-participar', 'sofiam', 'completed',
  'consolidation', 2, 14, 9, 14, 9, 30,
  'Sofía connected participation with the power to influence and explored the tension between participating within the rules and questioning them.',
  null, ['Participating is not just expressing opinions, it is influencing decisions'], 88, ['participation from outside the system'],
  [['msg-sp-1', 0, 'assistant', 'Have you ever tried to change something that did not seem fair to you?', 'anchoring'],
   ['msg-sp-2', 1, 'student', 'Yes, at school we wanted to change the phone policy. We collected signatures.', 'anchoring'],
   ['msg-sp-3', 2, 'assistant', 'And did it work?', 'exploration'],
   ['msg-sp-4', 3, 'student', 'Sort of. They changed one part. I learned that you have to follow the rules of the place, even if they seem unfair to you.', 'exploration'],
   ['msg-sp-5', 4, 'assistant', 'And what if the rules do not allow you to change them?', 'tension'],
   ['msg-sp-6', 5, 'student', 'Maybe you have to push from the outside. Like a protest march. That is also participating.', 'tension'],
   ['msg-sp-7', 6, 'assistant', 'What would participating be, ultimately?', 'consolidation'],
   ['msg-sp-8', 7, 'student', 'Getting involved in the decisions that affect you, seeking to make an impact. Within or outside the rules.', 'consolidation']]
);

seedSession('sess-mateo-participar', 'act-participar', 'mateol', 'completed',
  'consolidation', 3, 14, 10, 14, 10, 40,
  'Mateo showed initial resistance but had a conceptual breakthrough with the neighborhood traffic light example.',
  null, ['Not participating is also a decision, and it has consequences'], 48, ['structural conditions that limit participation'],
  [['msg-mp-1', 0, 'assistant', 'Have you ever tried to change something that did not seem fair to you?', 'anchoring'],
   ['msg-mp-2', 1, 'student', 'No. What for, if nothing changes anyway.', 'anchoring'],
   ['msg-mp-3', 2, 'assistant', 'Can you recall a case where something changed in your neighborhood?', 'exploration'],
   ['msg-mp-4', 3, 'student', 'The neighbors got a traffic light. They went to city hall and insisted.', 'exploration'],
   ['msg-mp-5', 4, 'assistant', 'If they had not done that, would there be a traffic light?', 'tension'],
   ['msg-mp-6', 5, 'student', 'No. I see. If you don\'t participate, others decide for you.', 'consolidation']]
);

seedSession('sess-benjamin-participar', 'act-participar', 'benjamind', 'completed',
  'exploration', 4, 14, 11, 14, 11, 45,
  'Benjamín participated little but recognized that voting is a form of participation.',
  null, [], 22, ['participation beyond voting', 'concept of active citizenship'],
  [['msg-bp-1', 0, 'assistant', 'Have you ever tried to change something that did not seem fair to you?', 'anchoring'],
   ['msg-bp-2', 1, 'student', 'No.', 'anchoring'],
   ['msg-bp-3', 2, 'assistant', 'Do you know of any way to participate in your community\'s decisions?', 'exploration'],
   ['msg-bp-4', 3, 'student', 'Voting. When you grow up you vote.', 'exploration'],
   ['msg-bp-5', 4, 'assistant', 'And before voting? Are there no other ways?', 'exploration'],
   ['msg-bp-6', 5, 'student', 'I don\'t know. Complaining, I guess.', 'exploration']]
);

seedSession('sess-milag-participar', 'act-participar', 'milag', 'completed',
  'consolidation', 2, 14, 12, 14, 12, 30,
  'Milagros connected participation with empathy: you participate because you care about what happens to others, not just yourself.',
  null, ['Participating is putting yourself in the other person\'s place and taking action'], 75, [],
  [['msg-mgp-1', 0, 'assistant', 'Have you ever tried to change something that did not seem fair to you?', 'anchoring'],
   ['msg-mgp-2', 1, 'student', 'Yes, when a classmate was being left out. I talked to the other girls.', 'anchoring'],
   ['msg-mgp-3', 2, 'assistant', 'Is that participating?', 'exploration'],
   ['msg-mgp-4', 3, 'student', 'I think so. It is doing something when you see something is wrong. Not staying silent.', 'exploration'],
   ['msg-mgp-5', 4, 'assistant', 'And what if doing something brings you problems?', 'tension'],
   ['msg-mgp-6', 5, 'student', 'Sometimes it does. But if you do nothing, the problem continues. Participating is putting yourself in the other person\'s place and taking action.', 'consolidation']]
);

seedSession('sess-facur-participar', 'act-participar', 'facur', 'completed',
  'consolidation', 2, 14, 13, 14, 13, 28,
  'Facundo questioned whether participation really changes anything or is just an illusion of democracy. Productive debate.',
  null, ['Participation can be real or it can be a facade. You have to distinguish between them.'], 70, ['cynicism vs. critical thinking'],
  [['msg-fp-1', 0, 'assistant', 'Have you ever tried to change something that did not seem fair to you?', 'anchoring'],
   ['msg-fp-2', 1, 'student', 'Yes, but why bother telling you if in the end those in charge do whatever they want.', 'anchoring'],
   ['msg-fp-3', 2, 'assistant', 'So is participation useless?', 'exploration'],
   ['msg-fp-4', 3, 'student', 'Sometimes yes. They pretend to listen but they have already decided everything.', 'exploration'],
   ['msg-fp-5', 4, 'assistant', 'Is there any difference between real participation and fake participation?', 'tension'],
   ['msg-fp-6', 5, 'student', 'Yes. The real kind is when your voice changes something. The other is marketing. You have to know how to distinguish them.', 'consolidation']]
);

seedSession('sess-luciana-participar', 'act-participar', 'lucianaa', 'completed',
  'consolidation', 2, 14, 14, 14, 14, 30,
  'Luciana analyzed participation as a right that requires conditions to be effective.',
  null, ['Participating is a right, but it needs conditions: information, time, and real channels'], 82, [],
  [['msg-lp-1', 0, 'assistant', 'Have you ever tried to change something that did not seem fair to you?', 'anchoring'],
   ['msg-lp-2', 1, 'student', 'Yes, we made a petition at school. But not everyone could participate because they did not have information.', 'anchoring'],
   ['msg-lp-3', 2, 'assistant', 'What is needed for participation to work?', 'exploration'],
   ['msg-lp-4', 3, 'student', 'Information, time to think, and that they actually listen to you. If any of the three is missing, it does not work.', 'exploration'],
   ['msg-lp-5', 4, 'assistant', 'Can you think of a case where those three conditions are not met?', 'tension'],
   ['msg-lp-6', 5, 'student', 'Yes, when they hold a public hearing and notify you one day before. Technically you can go, but in practice you cannot prepare.', 'consolidation']]
);

// ═══════════════════════════════════════════════════════════════════════════════
// SESSIONS — act-igualdad (closed, ciud-4b) — 5 students completed
// ═══════════════════════════════════════════════════════════════════════════════

seedSession('sess-sofia-igualdad', 'act-igualdad', 'sofiam', 'completed',
  'consolidation', 2, 7, 9, 7, 9, 28,
  'Sofía quickly distinguished equality from equity and applied it to school examples.',
  null, ['Treating everyone equally can be unfair if they started in different conditions'], 91, [],
  [['msg-si-1', 0, 'assistant', 'Is treating everyone equally the same as treating everyone with justice?', 'anchoring'],
   ['msg-si-2', 1, 'student', 'No. Because if someone has more difficulties, treating them equally is leaving them behind.', 'anchoring'],
   ['msg-si-3', 2, 'assistant', 'Can you give an example?', 'exploration'],
   ['msg-si-4', 3, 'student', 'If you give the same exam to someone with dyslexia without adapting it, it is "equal" but it is not fair.', 'exploration'],
   ['msg-si-5', 4, 'assistant', 'And how do you decide when to treat equally and when differently?', 'tension'],
   ['msg-si-6', 5, 'student', 'Depending on the needs. Equity is adapting according to what each person needs to reach the same place.', 'consolidation']]
);

seedSession('sess-mateo-igualdad', 'act-igualdad', 'mateol', 'completed',
  'consolidation', 3, 7, 10, 7, 10, 38,
  'Mateo needed a concrete soccer example to understand the difference between equality and equity.',
  null, ['Giving the same thing to everyone is not the same as giving each person what they need'], 52, ['applying abstract concepts without examples'],
  [['msg-mi-1', 0, 'assistant', 'Is treating everyone equally the same as treating everyone with justice?', 'anchoring'],
   ['msg-mi-2', 1, 'student', 'Yes, right? If you treat everyone equally you are being fair.', 'anchoring'],
   ['msg-mi-3', 2, 'assistant', 'Imagine a soccer match. Is it fair that all players wear the same size cleats?', 'exploration'],
   ['msg-mi-4', 3, 'student', 'No, because everyone has a different foot. You need the right size.', 'exploration'],
   ['msg-mi-5', 4, 'assistant', 'Now apply that to school.', 'tension'],
   ['msg-mi-6', 5, 'student', 'Oh. Not everyone needs the same thing. Giving the same to everyone is not always fair.', 'consolidation']]
);

seedSession('sess-milag-igualdad', 'act-igualdad', 'milag', 'completed',
  'consolidation', 2, 7, 11, 7, 11, 25,
  'Milagros connected it with her personal experience of having a sister with a disability.',
  null, ['Equity is my sister having a ramp, not using the stairs like everyone else'], 85, [],
  [['msg-mgi-1', 0, 'assistant', 'Is treating everyone equally the same as treating everyone with justice?', 'anchoring'],
   ['msg-mgi-2', 1, 'student', 'No. My sister uses a wheelchair. If you treat her "equally" you leave her downstairs because there is no ramp.', 'anchoring'],
   ['msg-mgi-3', 2, 'assistant', 'So what would be fair then?', 'exploration'],
   ['msg-mgi-4', 3, 'student', 'Putting in a ramp. It is not the same as the stairs but it allows her to reach the same place.', 'exploration'],
   ['msg-mgi-5', 4, 'assistant', 'Is that treating differently or treating fairly?', 'consolidation'],
   ['msg-mgi-6', 5, 'student', 'It is treating fairly. Different but fair. It is called equity.', 'consolidation']]
);

seedSession('sess-facur-igualdad', 'act-igualdad', 'facur', 'completed',
  'consolidation', 2, 7, 12, 7, 12, 30,
  'Facundo argued that equity can be used as an excuse to grant privileges. Productive debate about the limits of the concept.',
  null, ['Equity must have limits, otherwise it becomes disguised privilege'], 73, [],
  [['msg-fi-1', 0, 'assistant', 'Is treating everyone equally the same as treating everyone with justice?', 'anchoring'],
   ['msg-fi-2', 1, 'student', 'No. But who decides what is fair? Sometimes "equity" is giving more to the friends of whoever decides.', 'anchoring'],
   ['msg-fi-3', 2, 'assistant', 'Good point. How do we prevent equity from being an excuse for privileges?', 'exploration'],
   ['msg-fi-4', 3, 'student', 'With clear rules. So that people know why someone receives something different.', 'exploration'],
   ['msg-fi-5', 4, 'assistant', 'So equity needs transparency?', 'tension'],
   ['msg-fi-6', 5, 'student', 'Yes. If it is not transparent, it is not equity. It is favoritism.', 'consolidation']]
);

seedSession('sess-luciana-igualdad', 'act-igualdad', 'lucianaa', 'completed',
  'consolidation', 2, 7, 13, 7, 13, 28,
  'Luciana made a precise distinction between formal equality (before the law) and real equality (of opportunity).',
  null, ['Formal equality without real equality is an empty promise'], 87, [],
  [['msg-li-1', 0, 'assistant', 'Is treating everyone equally the same as treating everyone with justice?', 'anchoring'],
   ['msg-li-2', 1, 'student', 'It depends on what type of equality. Before the law, we are all equal. But in practice not everyone starts from the same place.', 'anchoring'],
   ['msg-li-3', 2, 'assistant', 'And what do we do about that difference?', 'exploration'],
   ['msg-li-4', 3, 'student', 'Compensate. Give more to those who have less so they can compete on equal terms. That is equity.', 'exploration'],
   ['msg-li-5', 4, 'assistant', 'Is there any risk in that?', 'tension'],
   ['msg-li-6', 5, 'student', 'Yes, that it becomes welfare dependency or that the underlying inequality is never resolved. But without equity, formal equality is an empty promise.', 'consolidation']]
);

// ═══════════════════════════════════════════════════════════════════════════════
// SESSIONS — act-revolucion (active, hist-3a) — some completed, some not_started
// ═══════════════════════════════════════════════════════════════════════════════

seedSession('sess-sofia-rev', 'act-revolucion', 'sofiam', 'completed',
  'exploration', 2, 1, 14, 1, 14, 20,
  'Sofía identified the economic asymmetry between Buenos Aires and the interior as the central axis of 1810.',
  null, [], 82, ['role of the Cabildo', 'interests of the interior'],
  [['msg-sr-1', 0, 'assistant', 'Why do you think that in 1810 not everyone agreed on the same thing?', 'anchoring'],
   ['msg-sr-2', 1, 'student', 'I think it depended on where you lived. Buenos Aires wanted to control everything and the interior did not want to be left out.', 'anchoring'],
   ['msg-sr-3', 2, 'assistant', 'And what did Buenos Aires have that the other cities did not?', 'exploration'],
   ['msg-sr-4', 3, 'student', 'The port. All the trade money passed through there. Buenos Aires had more economic power.', 'exploration']]
);

seedSession('sess-vale-rev', 'act-revolucion', 'valentinag', 'completed',
  'tension', 3, 1, 15, 1, 15, 25,
  'Valentina analyzed the Buenos Aires-interior tension in depth.',
  null, [], 90, ['post-revolution distribution of power'],
  [['msg-vr-1', 0, 'assistant', 'Why do you think not everyone agreed in 1810?', 'anchoring'],
   ['msg-vr-2', 1, 'student', 'There were different interests depending on the region. The interior produced raw materials and Buenos Aires concentrated foreign trade.', 'anchoring'],
   ['msg-vr-3', 2, 'assistant', 'What consequences did that have for the interior?', 'exploration'],
   ['msg-vr-4', 3, 'student', 'That the taxes stayed in Buenos Aires. The interior did not receive its proportional share.', 'exploration'],
   ['msg-vr-5', 4, 'assistant', 'So why did the interior participate in the revolution?', 'tension'],
   ['msg-vr-6', 5, 'student', 'Maybe they thought that removing the Spaniards was a first step and afterwards they would negotiate the distribution of power.', 'tension']]
);

seedSession('sess-camila-rev', 'act-revolucion', 'camilaf', 'completed',
  'consolidation', 1, 2, 9, 2, 9, 32,
  'Camila articulated that the revolution changed who was in charge but did not resolve who was in charge internally.',
  null, ['The revolution removed Spain but left unresolved who was in charge internally'], 65, ['perspective of the interior in 1810'],
  [['msg-cr-1', 0, 'assistant', 'Why do you think not everyone agreed in 1810?', 'anchoring'],
   ['msg-cr-2', 1, 'student', 'Because each region had its own economic interests. Buenos Aires controlled the port.', 'anchoring'],
   ['msg-cr-3', 2, 'assistant', 'And what did the interior want?', 'exploration'],
   ['msg-cr-4', 3, 'student', 'More autonomy and a fairer distribution of resources.', 'exploration'],
   ['msg-cr-5', 4, 'assistant', 'Could those two projects coexist?', 'tension'],
   ['msg-cr-6', 5, 'student', 'They were incompatible. Someone had to give in and neither wanted to.', 'tension'],
   ['msg-cr-7', 6, 'assistant', 'How would you summarize the central tension of 1810?', 'consolidation'],
   ['msg-cr-8', 7, 'student', 'It was a dispute over who controlled the resources. The revolution removed Spain but left unresolved who was in charge internally.', 'consolidation']]
);

// not_started sessions for remaining students
for (const sid of ['mateol', 'thiagor', 'benjamind', 'lucianaa', 'santip']) {
  insertSession.run(
    `sess-${sid}-rev`, 'act-revolucion', sid, 'not_started', 'anchoring', 0,
    null, null, null, null, JSON.stringify([]), null, 0, '[]'
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SESSIONS — act-derechos (active, ciud-4b) — some not_started
// ═══════════════════════════════════════════════════════════════════════════════

for (const sid of ['sofiam', 'mateol', 'benjamind', 'milag', 'facur', 'lucianaa']) {
  insertSession.run(
    `sess-${sid}-der`, 'act-derechos', sid, 'not_started', 'anchoring', 0,
    null, null, null, null, JSON.stringify([]), null, 0, '[]'
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// STUDENT IDEAS
// ═══════════════════════════════════════════════════════════════════════════════

const ideas: Array<[string, string, string, string, string, string, string, string[], number]> = [
  // Sofia
  ['idea-sofia-1', 'sofiam', 'hist-3a', 'act-ciudades', 'sess-sofia-ciudades', 'The agricultural surplus allowed not everyone to have to produce food', 'What would need to happen first?', ['Division of labor', 'Urban revolution'], 20],
  ['idea-sofia-2', 'sofiam', 'hist-3a', 'act-ciudades', 'sess-sofia-ciudades', 'Specialization creates interdependence that makes living together more convenient', 'How would you summarize the chain?', ['Origin of cities', 'Social cooperation'], 20],
  ['idea-sofia-3', 'sofiam', 'hist-3a', 'act-mesopotamia', 'sess-sofia-meso', 'Controlling irrigation is controlling food, and controlling food is controlling people', 'Who decided how the water was distributed?', ['Political power', 'Natural resources'], 13],
  ['idea-sofia-4', 'sofiam', 'hist-3a', 'act-egipto', 'sess-sofia-egipto', 'The pharaoh was powerful because he guaranteed the Nile floods', 'And did people believe him?', ['Legitimation of power', 'Social contract'], 6],
  ['idea-sofia-5', 'sofiam', 'ciud-4b', 'act-participar', 'sess-sofia-participar', 'Participating is not just expressing opinions, it is influencing decisions', 'What would participating be?', ['Active citizenship', 'Democracy'], 14],
  ['idea-sofia-6', 'sofiam', 'ciud-4b', 'act-igualdad', 'sess-sofia-igualdad', 'Treating everyone equally can be unfair if they started in different conditions', 'How do you decide when to treat equally and when differently?', ['Equity', 'Social justice'], 7],
  // Mateo
  ['idea-mateo-1', 'mateol', 'hist-3a', 'act-ciudades', 'sess-mateo-ciudades', 'Living together also served for defense', 'What would need to exist first?', ['Collective security'], 20],
  ['idea-mateo-2', 'mateol', 'ciud-4b', 'act-participar', 'sess-mateo-participar', 'Not participating is also a decision, and it has consequences', 'If they had not done that, would there be a traffic light?', ['Civic participation'], 14],
  // Valentina
  ['idea-vale-1', 'valentinag', 'hist-3a', 'act-ciudades', 'sess-vale-ciudades', 'The city is possible when production surpasses individual subsistence', 'And how would you summarize what conditions are necessary?', ['Agricultural surplus'], 20],
  ['idea-vale-2', 'valentinag', 'hist-3a', 'act-mesopotamia', 'sess-vale-meso', 'The State emerges when a critical resource requires collective management', 'Does that thesis always hold?', ['State formation'], 13],
  ['idea-vale-3', 'valentinag', 'hist-3a', 'act-egipto', 'sess-vale-egipto', 'The predictable Nile allows for stable centralized power', 'Does geography determine politics?', ['Geographic determinism'], 6],
  // Luciana
  ['idea-luciana-1', 'lucianaa', 'hist-3a', 'act-ciudades', 'sess-luciana-ciudades', 'Order matters: surplus first, specialization second, city as the result', 'What is the order?', ['Historical causality'], 20],
  ['idea-luciana-2', 'lucianaa', 'hist-3a', 'act-mesopotamia', 'sess-luciana-meso', 'Unpredictable rivers produce city-states, predictable rivers produce empires', 'Would it be the same for all rivers?', ['Geography and politics'], 13],
  ['idea-luciana-3', 'lucianaa', 'ciud-4b', 'act-igualdad', 'sess-luciana-igualdad', 'Formal equality without real equality is an empty promise', 'Is there any risk in compensating?', ['Equality', 'Equity'], 7],
  // Facundo
  ['idea-facur-1', 'facur', 'ciud-4b', 'act-participar', 'sess-facur-participar', 'Participation can be real or a facade', 'Is there a difference between real and fake participation?', ['Democracy', 'Participation'], 14],
  ['idea-facur-2', 'facur', 'ciud-4b', 'act-igualdad', 'sess-facur-igualdad', 'Equity without transparency is favoritism', 'Does equity need transparency?', ['Transparency', 'Justice'], 7],
  // Milagros
  ['idea-milag-1', 'milag', 'ciud-4b', 'act-igualdad', 'sess-milag-igualdad', 'Equity is my sister having a ramp, not using the stairs like everyone else', 'So what would be fair?', ['Accessibility', 'Equity'], 7],
  // Santiago
  ['idea-santi-1', 'santip', 'hist-3a', 'act-mesopotamia', 'sess-santi-meso', 'Rivers were like the internet of antiquity: infrastructure that concentrates power', 'Is there a difference between controlling water and technology?', ['Historical analogies'], 13],
  // Camila
  ['idea-camila-1', 'camilaf', 'hist-3a', 'act-ciudades', 'sess-camila-ciudades', 'Division of labor only works if there is a surplus to sustain it', 'What is needed for it to work?', ['Division of labor'], 20],
  ['idea-camila-2', 'camilaf', 'hist-3a', 'act-egipto', 'sess-camila-egipto', 'The pharaoh was an intermediary between the Nile and the people', 'Was there another reason to obey him?', ['Religious legitimation'], 6],
];

for (const [id, sid, cid, aid, sessId, text, question, connections, dAgo] of ideas) {
  insertIdea.run(id, sid, cid, aid, sessId, text, question, JSON.stringify(connections), daysAgo(dAgo, 10, 0));
}

// ═══════════════════════════════════════════════════════════════════════════════
// ACTIVITY SUMMARIES
// ═══════════════════════════════════════════════════════════════════════════════

const insertSummary = db.prepare(
  `INSERT INTO activity_summaries (id, activity_id, course_id, summary, understanding_avg, analysis, created_at)
   VALUES (?, ?, ?, ?, ?, ?, ?)`
);

insertSummary.run(
  'summ-ciudades', 'act-ciudades', 'hist-3a',
  'The class of 8 students shows an average comprehension of 66%, with significant dispersion between the strongest students and those who need more support. Valentina, Sofía, and Luciana built complete causal chains autonomously, clearly identifying the relationship between agricultural surplus, specialization, and urban emergence. Santiago and Thiago contributed creative connections with other eras and disciplines, though they needed redirection to stay focused. Camila was precise but needed more external validation. Mateo progressed well once given a concrete example (his neighborhood), but struggles to start without scaffolding. Benjamín is the most concerning case: he participated with monosyllables, grasped the idea of surplus but could not articulate the complete causal chain. It remains pending to explore historical cases that challenge the simple model for advanced students.',
  66,
  JSON.stringify({
    class_comprehension_avg: 66,
    class_summary: 'Acceptable overall comprehension but with very high dispersion (25% to 92%). The concept of agricultural surplus was consolidated in 6 of 8 students, but the ability to articulate the complete causal chain (surplus → specialization → interdependence → city) was only achieved by half the group. A clear pattern emerges: students who hypothesize before the tutor guides them (Valentina, Sofía, Luciana) advance much faster than those who wait for instructions (Benjamín, Mateo). This suggests the next activity should encourage formulating their own hypotheses.',
    difficult_topics: [
      { topic: 'Complete causal chain', student_count: 3, description: 'Benjamín, Mateo, and to a lesser extent Thiago could not articulate the complete sequence surplus → specialization → city. They understand the individual concepts but do not connect them into a coherent argument. Benjamín stopped at "food comes from the countryside" without taking the next step.' },
      { topic: 'Causation vs. correlation', student_count: 2, description: 'Thiago confused defense (walls) with a cause of urban emergence, when it is actually a consequence. Santiago did something similar with the industrial revolution. Both need to practice distinguishing what comes first from what comes after.' },
    ],
    struggling_students: [
      { student_id: 'benjamind', name: 'Benjamín Díaz', comprehension_pct: 25, main_difficulty: 'Cannot integrate individual concepts into an argument. Very low participation — responds with monosyllables and needs each question to be extremely concrete to make progress.' },
      { student_id: 'mateol', name: 'Mateo López', comprehension_pct: 45, main_difficulty: 'Has the ability but freezes up when faced with open-ended questions. Once the tutor anchors him in something concrete (his neighborhood, his experience), he reasons well. The problem is he cannot make that anchor on his own.' },
      { student_id: 'thiagor', name: 'Thiago Rodríguez', comprehension_pct: 55, main_difficulty: 'Gets sidetracked with tangential connections (castles, movies) and confuses causes with consequences. When redirected he is productive, but needs more practice in causal reasoning.' },
    ],
    suggested_groups: [
      { group_name: 'Causal reinforcement', student_ids: ['benjamind', 'mateol', 'thiagor'], topic: 'Building causal chains', rationale: 'The three have different but complementary difficulties in articulating cause-effect sequences. Mateo can anchor in the concrete, Thiago brings creativity, and Benjamín benefits from hearing his peers\' reasoning.' },
      { group_name: 'Advanced challenge', student_ids: ['valentinag', 'sofiam', 'lucianaa'], topic: 'Exceptions to the urban model', rationale: 'They already master the basic model. They can work with Çatalhöyük (a city without intensive agriculture) or Mayan cities (without rivers) to add complexity to their understanding.' },
      { group_name: 'Directed creativity', student_ids: ['santip', 'camilaf'], topic: 'Controlled historical analogies', rationale: 'Santiago has the creativity and Camila the rigor. Together they can produce analogies that are both original AND precise.' },
    ],
    suggested_plan: '• Open the next class with a brief exercise where each student orders 4 events in causal sequence (5 min, individual, corrected as a group)\n• Reinforcement group: give them 3 "pieces" (surplus, specialization, concentration) and ask them to build the chain with their own examples\n• Advanced group: present the case of Çatalhöyük and ask them to explain why it emerged without the factors they identified. Does it break the model or add complexity?\n• Santiago and Camila: have them choose a modern city and apply the ancient model. Does it work? What changes?\n• Group closing: each group presents their conclusions in 3 minutes. The focus is for the reinforcement group to hear how the others articulate the chains.',
  }),
  daysAgo(19)
);

insertSummary.run(
  'summ-mesopotamia', 'act-mesopotamia', 'hist-3a',
  'The class showed improvement compared to the previous activity (72% vs 66%). The relationship between control of natural resources and political power was understood by most, with Valentina reaching a university-level response by mentioning the hydraulic despotism thesis. The creative students (Thiago, Santiago) made valuable contributions: Thiago connected the priests with the planting calendar, and Santiago compared Mesopotamia with Silicon Valley. Luciana contributed the comparison between predictable and unpredictable rivers and their effect on political structure. Mateo remains the most challenging case in the group: he understands that water is used for irrigation but does not make the leap to the concept that controlling a resource means controlling people.',
  72,
  JSON.stringify({
    class_comprehension_avg: 72,
    class_summary: 'The group is consolidating the idea that resource control generates political power. The improvement compared to "The origin of cities" is visible: more students articulate arguments without scaffolding. However, the gap between strong students and those falling behind persists. Mateo made concrete progress (he now understands surplus) but still cannot connect resources with power autonomously.',
    difficult_topics: [
      { topic: 'Resource-political power relationship', student_count: 2, description: 'Mateo understood that water enables agriculture but could not articulate why controlling water gives power over people. He stayed at the material dimension (water = food) without moving to the political dimension (water = social control). Santiago understood the idea with his tech analogy but struggled to sustain it in the Mesopotamian context.' },
      { topic: 'Difference between religion and politics in ancient societies', student_count: 3, description: 'Thiago, Mateo, and to a lesser extent Santiago tend to treat religion and politics as separate things, when in Mesopotamia they were inseparable. Thiago intuited this with the priests but did not fully articulate it.' },
    ],
    struggling_students: [
      { student_id: 'mateol', name: 'Mateo López', comprehension_pct: 42, main_difficulty: 'The concept that controlling a resource gives political power is too abstract for him. He understands the concrete parts (water, food, canals) but not the underlying power mechanism. He needs to be shown the intermediate step with examples he is familiar with.' },
    ],
    suggested_groups: [
      { group_name: 'Comparative deep dive', student_ids: ['valentinag', 'lucianaa'], topic: 'Mesopotamia vs Egypt: different rivers, different politics', rationale: 'Luciana already raised the comparison and Valentina knows the Wittfogel thesis. They can prepare a presentation that helps the rest of the group understand how geography conditions politics.' },
      { group_name: 'Analogies as a bridge', student_ids: ['santip', 'thiagor'], topic: 'From Mesopotamia to today: who controls what', rationale: 'Santiago with his tech analogy and Thiago with the priests have good starting points. If they combine them they can build an argument about how power is always associated with control of a key resource.' },
    ],
    suggested_plan: '• Start the class with the question: "Who has power in your neighborhood and why?" to anchor the concept of resource→power in everyday experience\n• Ask Valentina and Luciana to present their comparison Mesopotamia vs Egypt (10 min). Have the group identify what is the same and what is different\n• Santiago and Thiago: have them present their analogy "resources of yesterday vs resources of today" and the group debates whether the mechanism is the same\n• With Mateo: work separately with a concrete example — "If you controlled the only water tap in the neighborhood, what happens?" — and from there scale up to the Mesopotamian concept\n• Closing: each student writes in one sentence the relationship between resource and power. They are shared and the differences are discussed.',
  }),
  daysAgo(12)
);

insertSummary.run(
  'summ-egipto', 'act-egipto', 'hist-3a',
  'This was the third activity in the ancient civilizations block and the accumulation of learning is noticeable. Average comprehension rose slightly to 68%, with 7 students completing the activity. Sofía articulated the idea of an "implicit contract" between pharaoh and people, an important conceptual leap. Valentina compared Egypt with Mesopotamia rigorously, arguing that the regularity of the Nile enabled political unification. Thiago got hooked on the pyramids and from there came to understand the pharaoh as a mobilizer of labor, correcting his earlier error about slaves. Camila was cautious but precise in describing the pharaoh as an intermediary between nature and society. Luciana analyzed Egyptian stability by linking it to climate crises. Benjamín participated more than in previous activities, understood that the pharaoh controlled food, but still cannot articulate the idea of legitimation. Mateo grasped the material dimension of pharaonic power but not the religious one.',
  68,
  JSON.stringify({
    class_comprehension_avg: 68,
    class_summary: 'A positive trend is observed in the group: the resources→power model that began to be built in "The origin of cities" and was deepened in "Mesopotamia" is maturing. Students no longer start from scratch but bring concepts from previous activities. The gap remains concerning: Valentina and Sofía operate at a level that could be upper secondary, while Benjamín and Mateo still need a lot of scaffolding for basic concepts.',
    difficult_topics: [
      { topic: 'Religious legitimation of power', student_count: 3, description: 'Benjamín, Mateo, and partially Thiago could not articulate how the religious dimension sustained the pharaoh beyond material control. They understand that the pharaoh "was like a god" but do not connect that with the stability of the political system. It is a concept that requires thinking on two levels simultaneously (material and symbolic), which is difficult for students who are still consolidating the first level.' },
      { topic: 'Comparison between political systems', student_count: 4, description: 'Only Valentina, Luciana, and partially Sofía could compare Egypt with Mesopotamia rigorously. The rest of the group tends to analyze each civilization in isolation without seeing common patterns or significant differences. This suggests that the skill of historical comparison needs explicit work.' },
    ],
    struggling_students: [
      { student_id: 'benjamind', name: 'Benjamín Díaz', comprehension_pct: 30, main_difficulty: 'Slight improvement: he now participates more and grasps individual concrete concepts (the pharaoh controlled food). But he still cannot integrate multiple concepts or make abstract leaps. The progress is that he no longer says "no idea" but tries to answer, which is a foundation to build on.' },
      { student_id: 'mateol', name: 'Mateo López', comprehension_pct: 38, main_difficulty: 'The concept of centralization of power remains too abstract. Mateo understands that "the pharaoh organized everything" but does not articulate WHY that made him powerful. When asked directly, he resorts to fear or force as an explanation, without considering symbolic legitimation.' },
      { student_id: 'thiagor', name: 'Thiago Rodríguez', comprehension_pct: 62, main_difficulty: 'Improved significantly compared to the previous activity. Corrected his error about slaves in the pyramids, which shows willingness to revise his ideas. His challenge remains distinguishing the interesting anecdotal fact from the historically relevant concept.' },
    ],
    suggested_groups: [
      { group_name: 'Peer tutoring', student_ids: ['sofiam', 'mateol'], topic: 'Legitimation of power', rationale: 'Sofía has the ability to explain with concrete analogies (her "implicit contract") that can help Mateo, who needs exactly that kind of bridge between the concrete and the abstract.' },
      { group_name: 'Comparative analysis', student_ids: ['valentinag', 'lucianaa', 'camilaf'], topic: 'Power patterns in ancient civilizations', rationale: 'All three have the rigor needed for a serious comparison. Camila will benefit from the working model of the other two and will gain confidence seeing that her contributions are valued.' },
      { group_name: 'The visual as a bridge', student_ids: ['thiagor', 'santip', 'benjamind'], topic: 'Visual representation of power', rationale: 'Thiago and Santiago are visual and creative. If they graphically represent the relationship river→power→legitimation, Benjamín can follow the argument more concretely than with text alone.' },
    ],
    suggested_plan: '• Open with a comparison exercise: project images of a ziggurat and a pyramid and ask "What do they have in common and what is different?"\n• Tutoring group (Sofía + Mateo): Sofía explains to Mateo her idea of the "implicit contract" and together they apply it to the pharaoh. Goal: have Mateo articulate why the people obeyed without it being just out of fear\n• Comparative group (Valentina, Luciana, Camila): have them complete a comparative chart Mesopotamia vs Egypt across 5 dimensions (geography, government, religion, economy, legacy). They present to the group\n• Visual group (Thiago, Santiago, Benjamín): have them draw or diagram the pharaoh\'s "power system." Who depends on whom, what flows in each direction (food, obedience, protection, legitimacy)\n• Closing: each student writes a response to "Was the pharaoh powerful because of force or because of something else?" — shared anonymously and discussed',
  }),
  daysAgo(5)
);

insertSummary.run(
  'summ-participar', 'act-participar', 'ciud-4b',
  'The activity produced an exceptionally rich debate, with 6 students completing it. The group approached participation from very diverse angles: Sofía from real advocacy and the power to change rules, Mateo from a skepticism that transformed into recognition, Facundo from constructive distrust distinguishing real from symbolic participation, Milagros from empathy and solidarity action, Luciana from analyzing the conditions necessary to participate, and Benjamín with minimal participation that only reached voting as a form of citizenship. The diversity of perspectives is a group strength that can be leveraged in future activities.',
  64,
  JSON.stringify({
    class_comprehension_avg: 64,
    class_summary: 'The group has a heterogeneous but complementary understanding of civic participation. Students who already have personal experiences of participation (Sofía, Milagros) articulate the concept better. Those who are skeptical (Mateo, Facundo) contribute a valuable critical perspective but one that can block them if not channeled well. The main gap is not in comprehension but in personal connection with the topic: those who feel it as their own understand it better.',
    difficult_topics: [
      { topic: 'Participation beyond voting', student_count: 2, description: 'Benjamín and partially Mateo have a very limited view of what it means to participate. For Benjamín, participating is voting and nothing else. Mateo at least recognizes that the neighbors with the traffic light "participated," but does not generalize. They lack a broader map of forms of participation: from student councils to social media, including volunteering and protest.' },
      { topic: 'Structural conditions that limit participation', student_count: 3, description: 'Mateo, Benjamín, and Facundo could not identify what structural factors limit real participation. Facundo senses that "those in charge do what they want" but does not articulate concrete mechanisms. Luciana did succeed (information, time, real channels), which makes her a good resource for the group.' },
    ],
    struggling_students: [
      { student_id: 'benjamind', name: 'Benjamín Díaz', comprehension_pct: 22, main_difficulty: 'Minimal participation is a pattern that repeats across all activities. On this occasion, not even the active resistance of Mateo or Facundo: simply disinterest or disconnection. The only progress was that he mentioned "voting" as a form of participation, which at least shows he has some notion of the concept.' },
      { student_id: 'mateol', name: 'Mateo López', comprehension_pct: 48, main_difficulty: 'Mateo\'s skepticism ("what\'s the point, nothing changes") blocks him before he even tries. However, when the tutor showed him a concrete example of successful participation (the traffic light), he had a genuine breakthrough. The challenge is that he needs that kind of concrete evidence for each new concept.' },
    ],
    suggested_groups: [
      { group_name: 'Structured debate', student_ids: ['facur', 'sofiam', 'lucianaa'], topic: 'Real vs. symbolic participation', rationale: 'Facundo brings the skeptical perspective, Sofía the advocacy experience, and Luciana the necessary conditions. A debate among the three would be productive and high-level.' },
      { group_name: 'Personal experience as a bridge', student_ids: ['milag', 'mateol', 'benjamind'], topic: 'Everyday forms of participation', rationale: 'Milagros has the empathy and concrete examples (her marginalized classmate) that can connect with Mateo and Benjamín. The goal is for them to identify forms of participation they already practice without knowing it.' },
    ],
    suggested_plan: '• Open with a brainstorm: "In how many different ways can you participate in your community?" — each person writes at least 3 and shares them\n• Debate group (Facundo, Sofía, Luciana): prepare a 10-minute mini-debate. Thesis: "Civic participation in Argentina is more symbolic than real." Facundo in favor, Sofía against, Luciana moderates with data\n• Experience group (Milagros, Mateo, Benjamín): each one tells about a time they "did something" for someone else. It does not matter if it is big or small. Then they classify that as a form of participation\n• Group closing: each student chooses ONE form of participation they would like to try and explains why. A "class participation map" is built\n• Homework for next time: ask at home if any family member ever participated in something collective (a petition, an association, a school cooperative). Bring the story.',
  }),
  daysAgo(13)
);

insertSummary.run(
  'summ-igualdad', 'act-igualdad', 'ciud-4b',
  'This was probably the best activity in the course so far, with an average comprehension of 77%. All students managed to distinguish equality from equity, and several contributed important nuances: Sofía with adaptation according to needs, Milagros with the vivid example of the ramp for her sister, Facundo with the tension between equity and favoritism, and Luciana with the distinction between formal and real equality. Mateo needed a soccer example to grasp the difference but once he understood it he expressed it clearly. It is notable that even the students who are usually most behind achieved an acceptable level of comprehension in this activity, probably because the topic has direct connections to their everyday experience.',
  77,
  JSON.stringify({
    class_comprehension_avg: 77,
    class_summary: 'Excellent group level. The equality/equity distinction was understood by everyone, and the group showed maturity in debating the risks of the concept (Facundo argued that equity can disguise favoritism, Luciana pointed out the risk of welfarism). The fact that Mateo and even Milagros were able to articulate their ideas clearly suggests that topics with a direct connection to personal experience produce better comprehension. This is a methodological lesson for upcoming activities.',
    difficult_topics: [
      { topic: 'Limits of equity', student_count: 2, description: 'Sofía and Mateo understood the concept well but did not explore its limits. When does equity become privilege? Who decides what each person needs? Facundo and Luciana did enter this zone, but it is a topic that deserves more group-level exploration.' },
    ],
    struggling_students: [
      { student_id: 'mateol', name: 'Mateo López', comprehension_pct: 52, main_difficulty: 'Improved compared to other activities. Grasped the equality/equity difference with the soccer example. His difficulty remains abstraction: he needed the concrete example to understand, and it is unclear whether he can transfer the concept to other contexts without help.' },
    ],
    suggested_groups: [
      { group_name: 'Ethical deep dive', student_ids: ['facur', 'lucianaa', 'sofiam'], topic: 'The dilemmas of equity', rationale: 'All three showed the ability to think about the limits and risks of the concept. They can work with dilemmas where equity comes into tension with other values (merit, efficiency, freedom).' },
      { group_name: 'From experience to concept', student_ids: ['milag', 'mateol'], topic: 'Equity in everyday life', rationale: 'Milagros has a life experience (her sister\'s wheelchair) that is a perfect anchor for Mateo. Together they can map cases of equity in their surroundings and practice transferring the concept.' },
    ],
    suggested_plan: '• Take advantage of the group\'s good momentum to introduce distributive justice: how are resources distributed when there are not enough for everyone?\n• Open with the lifeboat dilemma: 10 people, boat for 6. How do you decide who gets on?\n• Deep dive group: present them with 3 distribution criteria (need, merit, chance) and have them debate which is fairest and in what context\n• Milagros can share her sister\'s experience with the whole group as a conversation starter (if she wants to, do not force it)\n• Facundo: assign him the role of "devil\'s advocate" in the debate — have him find the flaws in each criterion\n• Closing: "If you were a legislator and had to write ONE law about equity, what would it say?" Each student writes their own.',
  }),
  daysAgo(6)
);

console.log(
  'seed done: 2 teachers, 10 students, 4 courses, 9 activities, ' +
  `${ideas.length} ideas, 10 rich profiles, 5 activity summaries`
);
