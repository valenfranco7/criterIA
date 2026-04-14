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

// 6 students
insertUser.run('sofiam',    'student', 'Sofía Martínez',    'sofiam@criteria.dev',    'SM', now());
insertUser.run('mateol',    'student', 'Mateo López',       'mateol@criteria.dev',    'ML', now());
insertUser.run('valentinag','student', 'Valentina García',  'valentinag@criteria.dev','VG', now());
insertUser.run('thiagor',   'student', 'Thiago Rodríguez',  'thiagor@criteria.dev',   'TR', now());
insertUser.run('camilaf',   'student', 'Camila Fernández',  'camilaf@criteria.dev',   'CF', now());
insertUser.run('benjamind', 'student', 'Benjamín Díaz',     'benjamind@criteria.dev', 'BD', now());

// ── courses ───────────────────────────────────────────────────────────────────
const insertCourse = db.prepare(
  `INSERT INTO courses (id, teacher_id, name, year_or_level, created_at)
   VALUES (?, ?, ?, ?, ?)`
);
insertCourse.run('hist-3a', 'yairp',    'Historia 3ro A',     '3ro A', now());
insertCourse.run('ciud-4b', 'yairp',    'Ciudadanía 4to B',   '4to B', now());
insertCourse.run('hist-2c', 'rosariom', 'Historia 2do C',     '2do C', now());
insertCourse.run('ciud-3a', 'rosariom', 'Ciudadanía 3ro A',   '3ro A', now());

// ── course members ────────────────────────────────────────────────────────────
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

// ── student profiles ──────────────────────────────────────────────────────────
const insertProfile = db.prepare(
  `INSERT INTO student_profiles (student_id, summary, updated_at) VALUES (?, ?, ?)`
);

insertProfile.run(
  'sofiam',
  'Sofía demuestra una capacidad notable para conectar conceptos abstractos con analogías espaciales y visuales: cuando discute el surgimiento de las ciudades la compara con anillos que se expanden, y al hablar de participación usa metáforas de corrientes de agua. Tiene iniciativa para hipotetizar antes de que el tutor la guíe, lo que acelera el ciclo socrático. Su punto de mejora es la tendencia a generalizar sin revisar excepciones; cuando se la invita a buscar contraejemplos, los encuentra con facilidad pero rara vez los propone por cuenta propia. Muestra alta motivación intrínseca y persiste ante preguntas difíciles sin señales de frustración.',
  daysAgo(1)
);

insertProfile.run(
  'mateol',
  'Mateo aprende mejor cuando los conceptos se anclan en situaciones concretas y cercanas a su experiencia cotidiana: necesita ejemplos físicos o narrativos antes de poder abstraer. En las sesiones sobre ciudades respondió con monosílabos hasta que el tutor lo invitó a pensar en su propio barrio, momento a partir del cual la conversación se volvió fluida. Presenta resistencia inicial ante preguntas abiertas —interpreta la incertidumbre como falta de información— pero una vez que comprende que se busca su opinión, sus respuestas son sólidas y bien razonadas. Su ritmo de consolidación es más lento que el promedio del curso, aunque las conclusiones a las que llega suelen ser más matizadas.',
  daysAgo(1)
);

for (const id of ['valentinag', 'thiagor', 'camilaf', 'benjamind']) {
  insertProfile.run(id, '', now());
}

// ── activities ────────────────────────────────────────────────────────────────
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
  daysAgo(3)
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
  daysAgo(2)
);

insertActivity.run(
  'act-ciudades',
  'yairp',
  'hist-3a',
  null,
  'El origen de las ciudades',
  'Que el alumno explique por qué surgieron las primeras ciudades y qué condiciones lo hicieron posible.',
  'Historia antigua — revolución urbana',
  30,
  'closed',
  JSON.stringify({
    initial_question: '¿Por qué te parece que la gente empezó a vivir junta en lugares grandes en vez de seguir en grupos pequeños?',
    success_criteria: 'El alumno identifica al menos dos factores (excedente agrícola, división del trabajo, defensa) y los relaciona entre sí.',
    agent_tone: 'socrático, cercano, sin dar respuestas',
  }),
  daysAgo(14)
);

insertActivity.run(
  'act-derechos',
  'yairp',
  'ciud-4b',
  null,
  '¿Qué significa tener derechos?',
  'Que el alumno explore el concepto de derecho partiendo de su experiencia personal y llegue a una definición fundamentada.',
  'Ciudadanía — derechos y obligaciones',
  30,
  'active',
  JSON.stringify({
    initial_question: '¿Alguna vez sentiste que algo que te correspondía no te lo dieron? ¿Cómo supiste que te correspondía?',
    success_criteria: 'El alumno distingue derecho de privilegio y menciona al menos un mecanismo de garantía.',
    agent_tone: 'socrático, cercano, sin dar respuestas',
  }),
  daysAgo(5)
);

insertActivity.run(
  'act-participar',
  'yairp',
  'ciud-4b',
  null,
  'Participar, ¿para qué?',
  'Que el alumno reflexione sobre el sentido de la participación ciudadana y evalúe sus límites y posibilidades.',
  'Ciudadanía — participación democrática',
  30,
  'closed',
  JSON.stringify({
    initial_question: '¿Alguna vez intentaste cambiar algo que no te parecía justo? ¿Qué hiciste?',
    success_criteria: 'El alumno reconoce la participación como herramienta de cambio y menciona al menos una condición que la limita.',
    agent_tone: 'socrático, cercano, sin dar respuestas',
  }),
  daysAgo(10)
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

// ═══════════════════════════════════════════════════════════════════════════════
// SESSIONS — act-ciudades (closed)
// ═══════════════════════════════════════════════════════════════════════════════

// ── sess-sofia-ciudades ───────────────────────────────────────────────────────
insertSession.run(
  'sess-sofia-ciudades',
  'act-ciudades',
  'sofiam',
  'completed',
  'consolidation',
  2,
  daysAgo(13, 9, 0),
  daysAgo(13, 9, 28),
  'Sofía llegó rápidamente a la idea de excedente agrícola como condición necesaria y la articuló con la división del trabajo usando una analogía de anillos concéntricos. Mostró capacidad para conectar causas sin que el tutor se las enumerara.',
  `## Informe de sesión — Sofía Martínez\n\n### Fortalezas\n- Construyó la cadena causal (excedente → especialización → ciudad) de forma autónoma.\n- Usó analogías espaciales originales que evidencian pensamiento relacional.\n- Respondió a las preguntas de cierre con síntesis precisas y sin apoyo.\n\n### Áreas de mejora\n- Tendencia a generalizar: no exploró excepciones (ciudades sin agricultura intensa).\n- Conviene invitarla a buscar contraejemplos antes de cerrar conclusiones.`,
  JSON.stringify(['El excedente agrícola permitió que no todos tuvieran que producir alimentos', 'La especialización crea interdependencia que hace que vivir juntos sea más conveniente']),
  null,
  85,
  '[]'
);

{
  const msgs: Array<[string, number, string, string, string]> = [
    ['msg-sc-1', 0, 'assistant', '¿Por qué te parece que la gente empezó a vivir junta en lugares grandes en vez de seguir en grupos pequeños?', 'anchoring'],
    ['msg-sc-2', 1, 'student',   'Y… supongo que era más fácil. Si estás con más gente podés ayudarte entre todos.', 'anchoring'],
    ['msg-sc-3', 2, 'assistant', 'Interesante. ¿Más fácil para qué, específicamente? ¿Qué cambia cuando hay más personas viviendo en el mismo lugar?', 'exploration'],
    ['msg-sc-4', 3, 'student',   'Mmm, podés tener alguien que cure a los enfermos, otro que construya, otro que plante. No todos tienen que hacer todo.', 'exploration'],
    ['msg-sc-5', 4, 'assistant', 'Eso que describís —que cada uno se especializa en algo— ¿cómo funciona si no hay suficiente comida para todos? ¿Qué necesitaría pasar primero?', 'tension'],
    ['msg-sc-6', 5, 'student',   'Ah, claro. Tiene que haber comida de sobra, si no el que no planta no come. O sea, primero tenés que poder producir más de lo que necesitás vos solo.', 'tension'],
    ['msg-sc-7', 6, 'assistant', 'Exacto. Entonces, ¿cómo resumirías la cadena que lleva a que surja una ciudad?', 'consolidation'],
    ['msg-sc-8', 7, 'student',   'Primero producís más comida de la que necesitás. Eso te permite que algunos no planten y se dediquen a otras cosas. Y si todos dependen de los demás, tiene sentido vivir cerca. Es como anillos que se van sumando.', 'consolidation'],
  ];
  for (const [id, idx, role, content, phase] of msgs) {
    insertMessage.run(id, 'sess-sofia-ciudades', idx, role, content, phase, null, daysAgo(13, 9, idx * 3));
  }
}

// ── sess-mateo-ciudades ───────────────────────────────────────────────────────
insertSession.run(
  'sess-mateo-ciudades',
  'act-ciudades',
  'mateol',
  'completed',
  'consolidation',
  3,
  daysAgo(13, 10, 0),
  daysAgo(13, 10, 35),
  'Mateo arrancó con respuestas cortas y esquivas hasta que el tutor lo ancló en su propio barrio. A partir de ese momento construyó el argumento paso a paso y llegó a identificar el excedente y la defensa colectiva como factores clave.',
  `## Informe de sesión — Mateo López\n\n### Fortalezas\n- Una vez anclado en lo concreto, razonó con solidez y sin apresuramiento.\n- Identificó espontáneamente la defensa como motivación para agruparse, factor que otros alumnos no mencionaron.\n- Sus conclusiones finales fueron matizadas y consideraron más de un factor.\n\n### Áreas de mejora\n- Necesita andamiaje concreto para iniciar: preguntas abiertas sin contexto lo bloquean.\n- Conviene comenzar siempre desde un ejemplo cercano antes de escalar a lo histórico.`,
  JSON.stringify(['Vivir juntos también servía para defenderse, no solo para trabajar mejor', 'El excedente de comida es la condición previa sin la cual nada más puede pasar']),
  null,
  45,
  '["excedente agrícola","división del trabajo"]'
);

{
  const msgs: Array<[string, number, string, string, string]> = [
    ['msg-mc-1', 0, 'assistant', '¿Por qué te parece que la gente empezó a vivir junta en lugares grandes en vez de seguir en grupos pequeños?', 'anchoring'],
    ['msg-mc-2', 1, 'student',   'No sé. Porque querían, supongo.', 'anchoring'],
    ['msg-mc-3', 2, 'assistant', 'Pensá en tu barrio: ¿por qué vivís ahí con otras personas en vez de vivir solo en el campo?', 'anchoring'],
    ['msg-mc-4', 3, 'student',   'Ah, bueno, porque hay negocios, escuelas, está todo cerca. Y mis viejos trabajan acá.', 'exploration'],
    ['msg-mc-5', 4, 'assistant', 'Eso mismo. ¿Y qué tendría que existir antes para que pueda haber negocios y escuelas en un lugar?', 'exploration'],
    ['msg-mc-6', 5, 'student',   'Que haya gente. Y que tengan para comer, sino no se pueden quedar a hacer otras cosas. También que alguien los defienda si viene otro grupo a atacarlos.', 'tension'],
    ['msg-mc-7', 6, 'assistant', 'Muy bien. Mencionaste tres cosas: comida suficiente, poder hacer otras tareas y defensa. ¿Cuál de las tres creés que tiene que venir primero?', 'tension'],
    ['msg-mc-8', 7, 'student',   'La comida. Sin comida no podés hacer nada más. Después viene lo otro.', 'consolidation'],
  ];
  for (const [id, idx, role, content, phase] of msgs) {
    insertMessage.run(id, 'sess-mateo-ciudades', idx, role, content, phase, null, daysAgo(13, 10, idx * 4));
  }
}

// ── sess-vale-ciudades ────────────────────────────────────────────────────────
insertSession.run(
  'sess-vale-ciudades',
  'act-ciudades',
  'valentinag',
  'completed',
  'consolidation',
  1,
  daysAgo(13, 11, 0),
  daysAgo(13, 11, 20),
  'Valentina alcanzó la síntesis en pocas intervenciones, anticipando los conceptos de excedente y división del trabajo antes de que el tutor los sugiriera. La sesión fue breve pero demostró comprensión cabal del tema.',
  `## Informe de sesión — Valentina García\n\n### Fortalezas\n- Capacidad de síntesis muy por encima del promedio: llegó sola al modelo causal completo.\n- Formuló la conclusión en términos generales aplicables a cualquier sociedad, no solo a la antigua.\n- Ritmo de trabajo eficiente; no necesita muchos turnos para consolidar.\n\n### Áreas de mejora\n- La rapidez puede esconder supuestos no revisados; vale la pena pedirle que justifique cada paso.\n- Podría beneficiarse de problemas más desafiantes o casos históricos que rompan el modelo simple.`,
  JSON.stringify(['La ciudad es posible cuando la producción supera la subsistencia individual', 'La especialización y la ciudad se retroalimentan mutuamente']),
  null,
  92,
  '[]'
);

{
  const msgs: Array<[string, number, string, string, string]> = [
    ['msg-vc-1', 0, 'assistant', '¿Por qué te parece que la gente empezó a vivir junta en lugares grandes en vez de seguir en grupos pequeños?', 'anchoring'],
    ['msg-vc-2', 1, 'student',   'Porque cuando empezaron a cultivar produjeron más comida de la que necesitaban, entonces no todos tenían que dedicarse a eso. Algunos podían hacer cerámica, construir, gobernar. Y para coordinar todo eso, lo más práctico era vivir cerca.', 'exploration'],
    ['msg-vc-3', 2, 'assistant', 'Muy completo. ¿Podés pensar en algún caso donde haya habido excedente pero no surgiera una ciudad?', 'tension'],
    ['msg-vc-4', 3, 'student',   'Sí, si el grupo era demasiado pequeño o si el excedente no era estable —por ejemplo, si la cosecha era irregular— no podías planificar y no se formaba una ciudad estable.', 'tension'],
    ['msg-vc-5', 4, 'assistant', '¿Y cómo resumirías entonces qué condiciones son necesarias?', 'consolidation'],
    ['msg-vc-6', 5, 'student',   'Excedente alimentario estable, suficiente cantidad de personas, y alguna forma de organización que coordine las distintas tareas. Sin las tres juntas no hay ciudad.', 'consolidation'],
  ];
  for (const [id, idx, role, content, phase] of msgs) {
    insertMessage.run(id, 'sess-vale-ciudades', idx, role, content, phase, null, daysAgo(13, 11, idx * 3));
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SESSIONS — act-participar (closed)
// ═══════════════════════════════════════════════════════════════════════════════

// ── sess-sofia-participar ─────────────────────────────────────────────────────
insertSession.run(
  'sess-sofia-participar',
  'act-participar',
  'sofiam',
  'completed',
  'consolidation',
  2,
  daysAgo(9, 9, 0),
  daysAgo(9, 9, 30),
  'Sofía conectó rápidamente la participación con la posibilidad de cambiar reglas y exploró la tensión entre participar dentro de las reglas y cuestionarlas. Llegó a una noción de participación como práctica transformadora.',
  `## Informe de sesión — Sofía Martínez\n\n### Fortalezas\n- Distinguió con claridad entre cumplir reglas y tener poder para cambiarlas.\n- Usó el ejemplo del reglamento escolar de forma pertinente y lo generalizó bien.\n- Mostró disposición para sostener posturas incómodas bajo presión socrática.\n\n### Áreas de mejora\n- Tiende a ver la participación en términos optimistas; conviene desafiarla con casos donde participar no cambia nada.\n- Podría profundizar en condiciones estructurales que limitan la participación real.`,
  JSON.stringify(['Participar no es solo opinar, es incidir en las decisiones', 'Para cambiar una regla también hay que participar dentro del sistema, aunque la regla te parezca injusta']),
  null,
  88,
  '["participación desde afuera del sistema"]'
);

{
  const msgs: Array<[string, number, string, string, string]> = [
    ['msg-sp-1', 0, 'assistant', '¿Alguna vez intentaste cambiar algo que no te parecía justo? ¿Qué hiciste?', 'anchoring'],
    ['msg-sp-2', 1, 'student',   'Sí, en la escuela queríamos cambiar el reglamento de celulares. Juntamos firmas y pedimos una reunión con el director.', 'anchoring'],
    ['msg-sp-3', 2, 'assistant', '¿Y funcionó? ¿Qué aprendiste de eso?', 'exploration'],
    ['msg-sp-4', 3, 'student',   'Más o menos. Cambiaron una parte. Aprendí que para cambiar algo tenés que seguir las reglas del lugar, aunque las reglas te parezcan injustas.', 'exploration'],
    ['msg-sp-5', 4, 'assistant', 'Eso es una tensión interesante. ¿Qué pasa si las reglas que existen no te permiten cambiarlas? ¿Seguiría siendo participación?', 'tension'],
    ['msg-sp-6', 5, 'student',   'Hmm. Si no podés cambiarlas por dentro, quizás tenés que presionar desde afuera. Como hacer una huelga o una marcha. Eso también es participar, aunque sea más ruidoso.', 'tension'],
    ['msg-sp-7', 6, 'assistant', 'Entonces, ¿qué sería participar, en definitiva?', 'consolidation'],
    ['msg-sp-8', 7, 'student',   'Es involucrarse en las decisiones que te afectan, con el objetivo de influir en ellas. Puede ser dentro de las reglas o cuestionándolas, pero siempre buscando incidir.', 'consolidation'],
  ];
  for (const [id, idx, role, content, phase] of msgs) {
    insertMessage.run(id, 'sess-sofia-participar', idx, role, content, phase, null, daysAgo(9, 9, idx * 3));
  }
}

// ── sess-mateo-participar ─────────────────────────────────────────────────────
insertSession.run(
  'sess-mateo-participar',
  'act-participar',
  'mateol',
  'completed',
  'consolidation',
  3,
  daysAgo(9, 10, 0),
  daysAgo(9, 10, 40),
  'Mateo mostró resistencia inicial al tema, argumentando que participar "no sirve para nada". Tras explorar ejemplos concretos de su entorno, tuvo un quiebre conceptual y reconoció la participación como herramienta real aunque imperfecta.',
  `## Informe de sesión — Mateo López\n\n### Fortalezas\n- La resistencia inicial fue productiva: cuando la trabó, su razonamiento se volvió más sólido.\n- Reconoció espontáneamente que su escepticismo era también una forma de posicionarse políticamente.\n- La conclusión final fue honesta y matizada: valora la participación sin idealizarla.\n\n### Áreas de mejora\n- El escepticismo puede volverse un escudo; conviene desafiarlo con ejemplos de participación exitosa.\n- Necesita más ejemplos históricos para ver que la participación tiene antecedentes concretos de éxito.`,
  JSON.stringify(['No participar también es una decisión, y tiene consecuencias', 'La participación puede no cambiar todo, pero sin ella las cosas cambian sin vos']),
  null,
  48,
  '["condiciones estructurales que limitan la participación","ejemplos históricos de participación exitosa"]'
);

{
  const msgs: Array<[string, number, string, string, string]> = [
    ['msg-mp-1', 0, 'assistant', '¿Alguna vez intentaste cambiar algo que no te parecía justo? ¿Qué hiciste?', 'anchoring'],
    ['msg-mp-2', 1, 'student',   'No. Para qué, si igual no cambia nada.', 'anchoring'],
    ['msg-mp-3', 2, 'assistant', 'Interesante esa postura. ¿Recordás algún caso en que algo cambió en tu barrio o escuela? ¿Cómo pasó?', 'exploration'],
    ['msg-mp-4', 3, 'student',   'Bueno, una vez los vecinos se quejaron y pusieron un semáforo que faltaba. Pero eso es diferente.', 'exploration'],
    ['msg-mp-5', 4, 'assistant', '¿Por qué sería diferente? ¿Qué hicieron los vecinos exactamente?', 'tension'],
    ['msg-mp-6', 5, 'student',   'Se organizaron, fueron a la municipalidad, insistieron. Supongo que eso es participar… pero por algo chico.', 'tension'],
    ['msg-mp-7', 6, 'assistant', 'Si no hubieran hecho eso, ¿habría semáforo?', 'tension'],
    ['msg-mp-8', 7, 'student',   'No, probablemente no. Está bien, entiendo. Si no participás, otros deciden por vos. No es que no cambia nada; es que cambia sin que vos puedas opinar.', 'consolidation'],
  ];
  for (const [id, idx, role, content, phase] of msgs) {
    insertMessage.run(id, 'sess-mateo-participar', idx, role, content, phase, null, daysAgo(9, 10, idx * 4));
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SESSIONS — act-revolucion (active)
// ═══════════════════════════════════════════════════════════════════════════════

// ── sess-sofia-rev (completed / exploration) ──────────────────────────────────
insertSession.run(
  'sess-sofia-rev',
  'act-revolucion',
  'sofiam',
  'completed',
  'exploration',
  2,
  daysAgo(1, 14, 0),
  daysAgo(1, 14, 20),
  'Sofía identificó la asimetría económica entre Buenos Aires y el interior como eje central de los conflictos de 1810, destacando el rol del puerto como fuente de poder.',
  null,
  JSON.stringify([]),
  null,
  82,
  '["rol del Cabildo","intereses del interior"]'
);

{
  const msgs: Array<[string, number, string, string, string]> = [
    ['msg-sr-1', 0, 'assistant', '¿Por qué te parece que en 1810 no todos estaban de acuerdo con lo mismo?', 'anchoring'],
    ['msg-sr-2', 1, 'student',   'Creo que dependía de dónde vivías. Buenos Aires quería manejar todo y el interior no quería quedar afuera.', 'anchoring'],
    ['msg-sr-3', 2, 'assistant', '¿Y qué tenía Buenos Aires que no tenían las otras ciudades?', 'exploration'],
    ['msg-sr-4', 3, 'student',   'El puerto. Toda la plata del comercio pasaba por ahí. Entonces Buenos Aires tenía más poder económico.', 'exploration'],
  ];
  for (const [id, idx, role, content, phase] of msgs) {
    insertMessage.run(id, 'sess-sofia-rev', idx, role, content, phase, null, daysAgo(1, 14, idx * 5));
  }
}

// ── sess-mateo-rev (not_started) ──────────────────────────────────────────────
insertSession.run(
  'sess-mateo-rev',
  'act-revolucion',
  'mateol',
  'not_started',
  'anchoring',
  0,
  null,
  null,
  null,
  null,
  JSON.stringify([]),
  null,
  0,
  '[]'
);

// ── sess-vale-rev (completed / tension) ───────────────────────────────────────
insertSession.run(
  'sess-vale-rev',
  'act-revolucion',
  'valentinag',
  'completed',
  'tension',
  3,
  daysAgo(1, 15, 0),
  daysAgo(1, 15, 25),
  'Valentina analizó la tensión entre Buenos Aires y el interior con profundidad, cuestionando por qué el interior participó en la revolución si Buenos Aires iba a concentrar el poder.',
  null,
  JSON.stringify([]),
  null,
  90,
  '["distribución del poder post-revolución"]'
);

{
  const msgs: Array<[string, number, string, string, string]> = [
    ['msg-vr-1', 0, 'assistant', '¿Por qué te parece que en 1810 no todos estaban de acuerdo con lo mismo?', 'anchoring'],
    ['msg-vr-2', 1, 'student',   'Había intereses distintos según la región. El interior producía materias primas y Buenos Aires concentraba el comercio exterior.', 'anchoring'],
    ['msg-vr-3', 2, 'assistant', 'Bien. ¿Qué consecuencias tenía para el interior que el comercio pasara por Buenos Aires?', 'exploration'],
    ['msg-vr-4', 3, 'student',   'Que los impuestos y las ganancias quedaban en Buenos Aires. El interior no recibía proporcionalmente lo que producía.', 'exploration'],
    ['msg-vr-5', 4, 'assistant', '¿Y entonces por qué el interior participó en la revolución si Buenos Aires iba a ganar poder?', 'tension'],
    ['msg-vr-6', 5, 'student',   'Mmm… quizás pensaron que sacar a los españoles era un primer paso, y después negociarían la distribución del poder. O quizás no todos en el interior pensaban lo mismo.', 'tension'],
  ];
  for (const [id, idx, role, content, phase] of msgs) {
    insertMessage.run(id, 'sess-vale-rev', idx, role, content, phase, null, daysAgo(1, 15, idx * 4));
  }
}

// ── sess-thiago-rev (not_started) ─────────────────────────────────────────────
insertSession.run(
  'sess-thiago-rev',
  'act-revolucion',
  'thiagor',
  'not_started',
  'anchoring',
  0,
  null,
  null,
  null,
  null,
  JSON.stringify([]),
  null,
  0,
  '[]'
);

// ── sess-camila-rev (completed) ───────────────────────────────────────────────
insertSession.run(
  'sess-camila-rev',
  'act-revolucion',
  'camilaf',
  'completed',
  'consolidation',
  1,
  daysAgo(2, 9, 0),
  daysAgo(2, 9, 32),
  'Camila identificó con claridad la tensión entre Buenos Aires y el interior, relacionando el control del puerto con el poder político. Pudo articular que los distintos grupos tenían proyectos de país incompatibles.',
  `## Informe de sesión — Camila Fernández\n\n### Fortalezas\n- Conectó economía y política sin que el tutor lo sugiriera explícitamente.\n- Usó vocabulario histórico preciso (libre comercio, virreinato, autonomía).\n- La síntesis final fue clara y mostró comprensión de múltiples perspectivas.\n\n### Áreas de mejora\n- Podría profundizar en las voces del interior: tendió a describir el conflicto desde la perspectiva de Buenos Aires.\n- Vale explorar con ella qué pasó después de 1810 para ver si sus hipótesis se sostienen.`,
  JSON.stringify(['El control del puerto era control del flujo económico del virreinato', 'La revolución no resolvió la tensión entre Buenos Aires y el interior, solo cambió quién mandaba']),
  null,
  65,
  '["perspectiva del interior en 1810"]'
);

{
  const msgs: Array<[string, number, string, string, string]> = [
    ['msg-cr-1', 0, 'assistant', '¿Por qué te parece que en 1810 no todos estaban de acuerdo con lo mismo?', 'anchoring'],
    ['msg-cr-2', 1, 'student',   'Porque cada región tenía sus propios intereses económicos. Buenos Aires controlaba el puerto y quería seguir haciéndolo.', 'anchoring'],
    ['msg-cr-3', 2, 'assistant', '¿Y qué quería el interior?', 'exploration'],
    ['msg-cr-4', 3, 'student',   'El interior quería más autonomía y una distribución más justa de los recursos. Algunos también querían seguir comerciando directamente sin pagar derechos en Buenos Aires.', 'exploration'],
    ['msg-cr-5', 4, 'assistant', '¿Esos dos proyectos podían coexistir, o eran incompatibles?', 'tension'],
    ['msg-cr-6', 5, 'student',   'Creo que eran básicamente incompatibles. Si el interior tenía más poder, Buenos Aires perdía privilegios. Alguien tenía que ceder y ninguno quería.', 'tension'],
    ['msg-cr-7', 6, 'assistant', '¿Cómo resumirías entonces la tensión central de 1810?', 'consolidation'],
    ['msg-cr-8', 7, 'student',   'Era una disputa por quién iba a controlar los recursos y el poder en el nuevo orden. La revolución sacó a España pero dejó sin resolver quién mandaba adentro.', 'consolidation'],
  ];
  for (const [id, idx, role, content, phase] of msgs) {
    insertMessage.run(id, 'sess-camila-rev', idx, role, content, phase, null, daysAgo(2, 9, idx * 4));
  }
}

// ── sess-benjamin-rev (not_started) ───────────────────────────────────────────
insertSession.run(
  'sess-benjamin-rev',
  'act-revolucion',
  'benjamind',
  'not_started',
  'anchoring',
  0,
  null,
  null,
  null,
  null,
  JSON.stringify([]),
  null,
  0,
  '[]'
);

// ═══════════════════════════════════════════════════════════════════════════════
// STUDENT IDEAS
// ═══════════════════════════════════════════════════════════════════════════════

insertIdea.run(
  'idea-sofia-1',
  'sofiam',
  'hist-3a',
  'act-ciudades',
  'sess-sofia-ciudades',
  'El excedente agrícola permitió que no todos tuvieran que producir alimentos',
  '¿Qué necesitaría pasar primero para que alguien no tuviera que plantar?',
  JSON.stringify(['División del trabajo', 'Origen de la especialización']),
  daysAgo(13, 9, 18)
);

insertIdea.run(
  'idea-sofia-2',
  'sofiam',
  'hist-3a',
  'act-ciudades',
  'sess-sofia-ciudades',
  'La especialización crea interdependencia que hace que vivir juntos sea más conveniente',
  '¿Cómo resumirías la cadena que lleva a que surja una ciudad?',
  JSON.stringify(['Origen de las ciudades', 'Cooperación social']),
  daysAgo(13, 9, 25)
);

insertIdea.run(
  'idea-sofia-3',
  'sofiam',
  'ciud-4b',
  'act-participar',
  'sess-sofia-participar',
  'Participar no es solo opinar, es incidir en las decisiones',
  '¿Qué sería participar, en definitiva?',
  JSON.stringify(['Ciudadanía activa', 'Democracia']),
  daysAgo(9, 9, 25)
);

insertIdea.run(
  'idea-mateo-1',
  'mateol',
  'hist-3a',
  'act-ciudades',
  'sess-mateo-ciudades',
  'Vivir juntos también servía para defenderse, no solo para trabajar mejor',
  '¿Qué tendría que existir antes para que pueda haber negocios y escuelas en un lugar?',
  JSON.stringify(['Origen de las ciudades', 'Seguridad colectiva']),
  daysAgo(13, 10, 22)
);

insertIdea.run(
  'idea-mateo-2',
  'mateol',
  'ciud-4b',
  'act-participar',
  'sess-mateo-participar',
  'No participar también es una decisión, y tiene consecuencias',
  'Si no hubieran hecho eso, ¿habría semáforo?',
  JSON.stringify(['Participación ciudadana', 'Responsabilidad cívica']),
  daysAgo(9, 10, 30)
);

insertIdea.run(
  'idea-vale-1',
  'valentinag',
  'hist-3a',
  'act-ciudades',
  'sess-vale-ciudades',
  'La ciudad es posible cuando la producción supera la subsistencia individual',
  '¿Y cómo resumirías entonces qué condiciones son necesarias?',
  JSON.stringify(['Excedente agrícola', 'Revolución urbana']),
  daysAgo(13, 11, 15)
);

insertIdea.run(
  'idea-vale-2',
  'valentinag',
  'hist-3a',
  'act-ciudades',
  'sess-vale-ciudades',
  'La especialización y la ciudad se retroalimentan mutuamente',
  '¿Podés pensar en algún caso donde haya habido excedente pero no surgiera una ciudad?',
  JSON.stringify(['División del trabajo', 'Sistemas complejos']),
  daysAgo(13, 11, 18)
);

// ═══════════════════════════════════════════════════════════════════════════════
// ACTIVITY SUMMARY — act-ciudades
// ═══════════════════════════════════════════════════════════════════════════════

const insertSummary = db.prepare(
  `INSERT INTO activity_summaries (id, activity_id, course_id, summary, understanding_avg, created_at)
   VALUES (?, ?, ?, ?, ?, ?)`
);

insertSummary.run(
  'summ-ciudades',
  'act-ciudades',
  'hist-3a',
  'La mayoría del grupo logró identificar el excedente agrícola como condición necesaria para el surgimiento de las ciudades. Valentina y Sofía construyeron cadenas causales completas de forma autónoma; Mateo necesitó andamiaje concreto pero llegó a conclusiones sólidas y añadió el factor de defensa colectiva que otros no mencionaron. El concepto de especialización quedó bien asentado en los tres. Queda pendiente explorar casos que desafíen el modelo simple (ciudades sin agricultura intensa o con excedentes inestables).',
  78,
  daysAgo(12)
);

console.log(
  'seed done: 2 teachers, 6 students, 4 courses, 5 activities, ' +
  '11 sessions, 56 messages, 7 ideas, 2 rich profiles, 1 activity summary'
);
