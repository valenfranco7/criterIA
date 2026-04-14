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
insertCourse.run('hist-3a', 'yairp',    'Historia 3ro A',     '3ro A', now());
insertCourse.run('ciud-4b', 'yairp',    'Ciudadanía 4to B',   '4to B', now());
insertCourse.run('hist-2c', 'rosariom', 'Historia 2do C',     '2do C', now());
insertCourse.run('ciud-3a', 'rosariom', 'Ciudadanía 3ro A',   '3ro A', now());

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
  'Sofía demuestra una capacidad notable para conectar conceptos abstractos con analogías espaciales y visuales: cuando discute el surgimiento de las ciudades la compara con anillos que se expanden, y al hablar de participación usa metáforas de corrientes de agua. Tiene iniciativa para hipotetizar antes de que el tutor la guíe, lo que acelera el ciclo socrático. Su punto de mejora es la tendencia a generalizar sin revisar excepciones; cuando se la invita a buscar contraejemplos, los encuentra con facilidad pero rara vez los propone por cuenta propia. Muestra alta motivación intrínseca y persiste ante preguntas difíciles sin señales de frustración.',
  daysAgo(1)
);

insertProfile.run(
  'mateol',
  'Mateo aprende mejor cuando los conceptos se anclan en situaciones concretas y cercanas a su experiencia cotidiana: necesita ejemplos físicos o narrativos antes de poder abstraer. Presenta resistencia inicial ante preguntas abiertas —interpreta la incertidumbre como falta de información— pero una vez que comprende que se busca su opinión, sus respuestas son sólidas y bien razonadas. Su ritmo de consolidación es más lento que el promedio del curso, aunque las conclusiones a las que llega suelen ser más matizadas.',
  daysAgo(1)
);

insertProfile.run(
  'valentinag',
  'Valentina es la alumna con mayor capacidad de síntesis del grupo. Llega a modelos causales completos con pocas intervenciones del tutor. Tiene vocabulario amplio y formula conclusiones generalizables. Su riesgo es la rapidez: a veces salta pasos sin verificar supuestos. Se beneficia de desafíos que rompan modelos simples.',
  daysAgo(2)
);

insertProfile.run(
  'thiagor',
  'Thiago participa con entusiasmo pero tiende a dispersarse. Se engancha con detalles anecdóticos y le cuesta abstraer. Responde bien cuando el tutor lo reconduce con preguntas cerradas y luego reabre gradualmente. Tiene buena memoria para datos específicos y hace conexiones inesperadas con cultura popular.',
  daysAgo(3)
);

insertProfile.run(
  'camilaf',
  'Camila tiene un pensamiento analítico sólido pero baja confianza. Duda mucho antes de responder y prefiere que le confirmen si va bien. Cuando se le da espacio y se le devuelve lo que dijo reformulado, gana confianza y profundiza. Sus mejores respuestas llegan cuando no siente presión de tiempo.',
  daysAgo(2)
);

insertProfile.run(
  'benjamind',
  'Benjamín es el alumno con menor participación del curso. Responde con monosílabos y requiere mucho andamiaje para avanzar. No muestra resistencia sino más bien desinterés o dificultad para conectar con temas abstractos. Funciona mejor con preguntas que se conecten con su vida cotidiana y tecnología.',
  daysAgo(4)
);

insertProfile.run(
  'lucianaa',
  'Luciana es metódica y organizada en su razonamiento. Construye argumentos paso a paso y le gusta verificar cada etapa antes de avanzar. Tiene facilidad para identificar contradicciones en los textos. Su desafío es ganar velocidad sin perder rigurosidad, y animarse a hipotetizar sin tener toda la información.',
  daysAgo(3)
);

insertProfile.run(
  'santip',
  'Santiago es creativo y hace conexiones originales entre temas aparentemente no relacionados. Tiene tendencia a irse por las ramas pero sus digresiones suelen ser productivas si el tutor las redirige. Funciona especialmente bien en actividades donde puede debatir o defender una posición.',
  daysAgo(3)
);

insertProfile.run(
  'milag',
  'Milagros muestra una comprensión intuitiva fuerte pero le cuesta verbalizar sus ideas. Cuando el tutor parafrasea lo que ella dijo, responde "sí, eso" y puede profundizar a partir de ahí. Tiene empatía natural que la ayuda a entender perspectivas múltiples en temas de ciudadanía.',
  daysAgo(5)
);

insertProfile.run(
  'facur',
  'Facundo tiene un estilo confrontativo que puede ser productivo: cuestiona premisas y no acepta respuestas fáciles. Necesita sentir que el tema importa para engancharse. Cuando está motivado su razonamiento es agudo; cuando no, se desconecta rápido. Funciona bien con dilemas morales y temas polémicos.',
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
  'El origen de las ciudades',
  'Que el alumno explique por qué surgieron las primeras ciudades y qué condiciones lo hicieron posible.',
  'Historia antigua — revolución urbana',
  30, 'closed',
  JSON.stringify({ initial_question: '¿Por qué te parece que la gente empezó a vivir junta en lugares grandes en vez de seguir en grupos pequeños?', success_criteria: 'El alumno identifica al menos dos factores (excedente agrícola, división del trabajo, defensa) y los relaciona entre sí.' }),
  daysAgo(21)
);

// hist-3a — closed
insertActivity.run(
  'act-mesopotamia', 'yairp', 'hist-3a', null,
  'Mesopotamia: entre ríos y poder',
  'Que el alumno comprenda cómo la geografía condicionó la organización política en Mesopotamia.',
  'Historia antigua — civilizaciones fluviales',
  30, 'closed',
  JSON.stringify({ initial_question: '¿Por qué te parece que las primeras civilizaciones surgieron al lado de ríos y no en cualquier otro lugar?', success_criteria: 'El alumno relaciona control del agua con poder político y excedente agrícola.' }),
  daysAgo(14)
);

// hist-3a — closed
insertActivity.run(
  'act-egipto', 'yairp', 'hist-3a', null,
  'Egipto: el faraón y el Nilo',
  'Que el alumno explique la relación entre el control del Nilo y la centralización del poder en Egipto.',
  'Historia antigua — Egipto',
  30, 'closed',
  JSON.stringify({ initial_question: '¿Por qué un solo gobernante pudo controlar todo Egipto durante miles de años?', success_criteria: 'El alumno conecta el control de la irrigación con la legitimación del poder faraónico.' }),
  daysAgo(7)
);

// hist-3a — active
insertActivity.run(
  'act-revolucion', 'yairp', 'hist-3a', null,
  'La Revolución de Mayo',
  'Que el alumno explique por qué hubo tensiones entre Buenos Aires y el interior.',
  'Semana de Mayo y el Cabildo Abierto',
  30, 'active',
  JSON.stringify({ initial_question: '¿Por qué te parece que en 1810 no todos estaban de acuerdo con lo mismo?', success_criteria: 'El alumno identifica al menos dos intereses en tensión.' }),
  daysAgo(3)
);

// hist-3a — draft
insertActivity.run(
  'act-independencia', 'yairp', 'hist-3a', null,
  'El camino a la independencia',
  'Que el alumno analice por qué pasaron 6 años entre la Revolución de Mayo y la declaración de independencia.',
  'Proceso independentista 1810-1816',
  30, 'draft',
  JSON.stringify({ initial_question: '¿Por qué te parece que tardaron 6 años en declarar la independencia si ya habían hecho la revolución?' }),
  daysAgo(1)
);

// ciud-4b — closed
insertActivity.run(
  'act-participar', 'yairp', 'ciud-4b', null,
  'Participar, ¿para qué?',
  'Que el alumno reflexione sobre el sentido de la participación ciudadana y evalúe sus límites y posibilidades.',
  'Ciudadanía — participación democrática',
  30, 'closed',
  JSON.stringify({ initial_question: '¿Alguna vez intentaste cambiar algo que no te parecía justo? ¿Qué hiciste?' }),
  daysAgo(15)
);

// ciud-4b — closed
insertActivity.run(
  'act-igualdad', 'yairp', 'ciud-4b', null,
  'Igualdad vs. equidad',
  'Que el alumno distinga entre igualdad formal y equidad, usando ejemplos concretos.',
  'Ciudadanía — igualdad y equidad',
  30, 'closed',
  JSON.stringify({ initial_question: '¿Es lo mismo tratar a todos igual que tratar a todos con justicia?' }),
  daysAgo(8)
);

// ciud-4b — active
insertActivity.run(
  'act-derechos', 'yairp', 'ciud-4b', null,
  '¿Qué significa tener derechos?',
  'Que el alumno explore el concepto de derecho partiendo de su experiencia personal y llegue a una definición fundamentada.',
  'Ciudadanía — derechos y obligaciones',
  30, 'active',
  JSON.stringify({ initial_question: '¿Alguna vez sentiste que algo que te correspondía no te lo dieron? ¿Cómo supiste que te correspondía?' }),
  daysAgo(5)
);

// ciud-4b — draft
insertActivity.run(
  'act-justicia', 'yairp', 'ciud-4b', null,
  'Qué es la justicia',
  'Que el alumno formule una definición propia de justicia contrastando dos ejemplos.',
  'Ética — concepto de justicia',
  30, 'draft',
  JSON.stringify({ initial_question: '¿Te parece justo que dos personas que hicieron lo mismo reciban castigos distintos?' }),
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
  'Sofía llegó rápidamente a la idea de excedente agrícola y la articuló con la división del trabajo usando una analogía de anillos concéntricos.',
  '## Informe — Sofía Martínez\n### Fortalezas\n- Construyó la cadena causal de forma autónoma.\n- Usó analogías espaciales originales.\n### Áreas de mejora\n- Tendencia a generalizar sin explorar excepciones.',
  ['El excedente agrícola permitió que no todos tuvieran que producir alimentos', 'La especialización crea interdependencia'], 85, [],
  [['msg-sc-1', 0, 'assistant', '¿Por qué te parece que la gente empezó a vivir junta en lugares grandes en vez de seguir en grupos pequeños?', 'anchoring'],
   ['msg-sc-2', 1, 'student', 'Y… supongo que era más fácil. Si estás con más gente podés ayudarte entre todos.', 'anchoring'],
   ['msg-sc-3', 2, 'assistant', 'Interesante. ¿Más fácil para qué, específicamente?', 'exploration'],
   ['msg-sc-4', 3, 'student', 'Mmm, podés tener alguien que cure a los enfermos, otro que construya, otro que plante.', 'exploration'],
   ['msg-sc-5', 4, 'assistant', '¿Cómo funciona eso si no hay suficiente comida para todos? ¿Qué necesitaría pasar primero?', 'tension'],
   ['msg-sc-6', 5, 'student', 'Tiene que haber comida de sobra. Primero tenés que poder producir más de lo que necesitás vos solo.', 'tension'],
   ['msg-sc-7', 6, 'assistant', '¿Cómo resumirías la cadena que lleva a que surja una ciudad?', 'consolidation'],
   ['msg-sc-8', 7, 'student', 'Primero producís más comida. Eso permite especialización. Y si todos dependen de los demás, tiene sentido vivir cerca. Como anillos que se van sumando.', 'consolidation']]
);

seedSession('sess-mateo-ciudades', 'act-ciudades', 'mateol', 'completed',
  'consolidation', 3, 20, 10, 20, 10, 35,
  'Mateo arrancó con respuestas cortas hasta que el tutor lo ancló en su barrio. A partir de ahí construyó el argumento paso a paso.',
  '## Informe — Mateo López\n### Fortalezas\n- Identificó espontáneamente la defensa como motivación.\n### Áreas de mejora\n- Necesita andamiaje concreto para iniciar.',
  ['Vivir juntos también servía para defenderse'], 45, ['excedente agrícola', 'división del trabajo'],
  [['msg-mc-1', 0, 'assistant', '¿Por qué te parece que la gente empezó a vivir junta en lugares grandes?', 'anchoring'],
   ['msg-mc-2', 1, 'student', 'No sé. Porque querían, supongo.', 'anchoring'],
   ['msg-mc-3', 2, 'assistant', 'Pensá en tu barrio: ¿por qué vivís ahí con otras personas en vez de vivir solo en el campo?', 'anchoring'],
   ['msg-mc-4', 3, 'student', 'Ah, bueno, porque hay negocios, escuelas, está todo cerca.', 'exploration'],
   ['msg-mc-5', 4, 'assistant', '¿Y qué tendría que existir antes para que pueda haber negocios y escuelas?', 'exploration'],
   ['msg-mc-6', 5, 'student', 'Que haya gente. Y que tengan para comer. También que alguien los defienda si viene otro grupo.', 'tension'],
   ['msg-mc-7', 6, 'assistant', '¿Cuál de esas tres cosas tiene que venir primero?', 'tension'],
   ['msg-mc-8', 7, 'student', 'La comida. Sin comida no podés hacer nada más.', 'consolidation']]
);

seedSession('sess-vale-ciudades', 'act-ciudades', 'valentinag', 'completed',
  'consolidation', 1, 20, 11, 20, 11, 20,
  'Valentina alcanzó la síntesis en pocas intervenciones, anticipando los conceptos antes de que el tutor los sugiriera.',
  '## Informe — Valentina García\n### Fortalezas\n- Capacidad de síntesis muy por encima del promedio.\n### Áreas de mejora\n- La rapidez puede esconder supuestos no revisados.',
  ['La ciudad es posible cuando la producción supera la subsistencia individual'], 92, [],
  [['msg-vc-1', 0, 'assistant', '¿Por qué te parece que la gente empezó a vivir junta en lugares grandes?', 'anchoring'],
   ['msg-vc-2', 1, 'student', 'Porque cuando empezaron a cultivar produjeron más comida de la que necesitaban. Algunos podían hacer cerámica, construir, gobernar. Y para coordinar todo eso, lo más práctico era vivir cerca.', 'exploration'],
   ['msg-vc-3', 2, 'assistant', '¿Podés pensar en algún caso donde haya habido excedente pero no surgiera una ciudad?', 'tension'],
   ['msg-vc-4', 3, 'student', 'Sí, si el grupo era demasiado pequeño o si el excedente no era estable. Sin las tres condiciones juntas no hay ciudad.', 'consolidation']]
);

seedSession('sess-thiago-ciudades', 'act-ciudades', 'thiagor', 'completed',
  'consolidation', 2, 20, 12, 20, 12, 30,
  'Thiago se enganchó con la idea de la defensa y la relacionó con fortalezas medievales. Costó reconducirlo al excedente agrícola como causa primaria.',
  '## Informe — Thiago Rodríguez\n### Fortalezas\n- Conexiones creativas con cultura popular y otras épocas.\n### Áreas de mejora\n- Tiende a dispersarse, necesita reconducción frecuente.',
  ['Las murallas son consecuencia de la ciudad, no su causa'], 55, ['causalidad vs. correlación'],
  [['msg-tc-1', 0, 'assistant', '¿Por qué te parece que la gente empezó a vivir junta en lugares grandes?', 'anchoring'],
   ['msg-tc-2', 1, 'student', 'Para defenderse. Como los castillos medievales, ¿no? Se juntaban para estar más seguros.', 'anchoring'],
   ['msg-tc-3', 2, 'assistant', 'Interesante. ¿Pero qué necesitás antes de poder juntar a tanta gente en un lugar? ¿Cómo los alimentás?', 'exploration'],
   ['msg-tc-4', 3, 'student', 'Ah, cierto. Necesitás comida. Bastante comida. O sea, primero plantás, después te defendés.', 'exploration'],
   ['msg-tc-5', 4, 'assistant', 'Entonces, ¿las murallas son la causa de la ciudad o una consecuencia?', 'tension'],
   ['msg-tc-6', 5, 'student', 'Son consecuencia. Primero surgió la ciudad por la comida y después la protegiste. Flasheé con lo de los castillos.', 'consolidation']]
);

seedSession('sess-camila-ciudades', 'act-ciudades', 'camilaf', 'completed',
  'consolidation', 2, 20, 13, 20, 13, 35,
  'Camila fue cautelosa pero precisa. Pidió confirmación varias veces pero sus respuestas finales fueron sólidas.',
  '## Informe — Camila Fernández\n### Fortalezas\n- Razonamiento metódico y cuidadoso.\n### Áreas de mejora\n- Baja confianza: necesita validación externa frecuente.',
  ['La división del trabajo solo funciona si hay excedente que la sostenga'], 70, ['confianza en sus respuestas'],
  [['msg-cc-1', 0, 'assistant', '¿Por qué te parece que la gente empezó a vivir junta en lugares grandes?', 'anchoring'],
   ['msg-cc-2', 1, 'student', 'No estoy segura… ¿puede ser porque era más práctico para trabajar juntos?', 'anchoring'],
   ['msg-cc-3', 2, 'assistant', '¿Qué tipo de trabajo sería más práctico hacer juntos?', 'exploration'],
   ['msg-cc-4', 3, 'student', 'Si uno se especializa en algo, como hacer herramientas, y otro planta… ¿eso está bien?', 'exploration'],
   ['msg-cc-5', 4, 'assistant', '¡Exacto! Eso se llama división del trabajo. ¿Qué se necesita para que funcione?', 'tension'],
   ['msg-cc-6', 5, 'student', 'Que el que planta produzca suficiente para los dos. Sino el que hace herramientas se muere de hambre.', 'tension'],
   ['msg-cc-7', 6, 'assistant', '¿Cómo lo resumirías?', 'consolidation'],
   ['msg-cc-8', 7, 'student', 'Primero necesitás excedente de comida, eso permite que algunos hagan otras cosas, y conviene estar juntos para coordinarse. ¿Está bien así?', 'consolidation']]
);

seedSession('sess-benjamin-ciudades', 'act-ciudades', 'benjamind', 'completed',
  'tension', 3, 20, 14, 20, 14, 40,
  'Benjamín participó mínimamente. Llegó a entender el excedente pero no pudo articular la cadena causal completa.',
  '## Informe — Benjamín Díaz\n### Fortalezas\n- Con mucho andamiaje logra captar conceptos individuales.\n### Áreas de mejora\n- No integra los conceptos en un argumento coherente. Participación muy baja.',
  [], 25, ['cadena causal', 'síntesis'],
  [['msg-bc-1', 0, 'assistant', '¿Por qué te parece que la gente empezó a vivir junta en lugares grandes?', 'anchoring'],
   ['msg-bc-2', 1, 'student', 'Ni idea.', 'anchoring'],
   ['msg-bc-3', 2, 'assistant', '¿Vos podrías vivir solo sin necesitar nada de nadie?', 'anchoring'],
   ['msg-bc-4', 3, 'student', 'No, necesito comida y eso.', 'exploration'],
   ['msg-bc-5', 4, 'assistant', '¿Y de dónde sale esa comida?', 'exploration'],
   ['msg-bc-6', 5, 'student', 'Del campo. Alguien la planta.', 'tension']]
);

seedSession('sess-luciana-ciudades', 'act-ciudades', 'lucianaa', 'completed',
  'consolidation', 2, 20, 15, 20, 15, 30,
  'Luciana construyó el argumento de forma metódica, verificando cada paso. Llegó a una síntesis precisa aunque le llevó más turnos que a Valentina.',
  '## Informe — Luciana Álvarez\n### Fortalezas\n- Razonamiento riguroso y verificable.\n### Áreas de mejora\n- Podría arriesgarse más a hipotetizar sin tener toda la información.',
  ['El orden importa: excedente primero, especialización después, ciudad como resultado'], 80, [],
  [['msg-lc-1', 0, 'assistant', '¿Por qué te parece que la gente empezó a vivir junta en lugares grandes?', 'anchoring'],
   ['msg-lc-2', 1, 'student', 'Tiene que haber habido algún cambio que lo hiciera posible. Antes de la agricultura no podían.', 'anchoring'],
   ['msg-lc-3', 2, 'assistant', '¿Qué cambió exactamente con la agricultura?', 'exploration'],
   ['msg-lc-4', 3, 'student', 'Podían producir más comida de la que necesitaban. Eso liberó gente para hacer otras cosas.', 'exploration'],
   ['msg-lc-5', 4, 'assistant', '¿Y eso automáticamente crea una ciudad?', 'tension'],
   ['msg-lc-6', 5, 'student', 'No, necesitás también organización. Alguien que coordine quién hace qué. Y conviene estar juntos para eso.', 'tension'],
   ['msg-lc-7', 6, 'assistant', '¿Cuál es el orden entonces?', 'consolidation'],
   ['msg-lc-8', 7, 'student', 'Primero excedente agrícola, después especialización, después organización, y la ciudad es el resultado de todo eso junto.', 'consolidation']]
);

seedSession('sess-santi-ciudades', 'act-ciudades', 'santip', 'completed',
  'consolidation', 2, 20, 16, 20, 16, 28,
  'Santiago hizo una conexión original con la revolución industrial y tuvo que ser reconducido al período antiguo. Una vez enfocado, su razonamiento fue sólido.',
  '## Informe — Santiago Pereyra\n### Fortalezas\n- Conexiones interdisciplinarias originales.\n### Áreas de mejora\n- Se desvía del tema, necesita reconducción.',
  ['La concentración de recursos genera concentración de personas, en cualquier época'], 72, ['mantener foco temporal'],
  [['msg-spc-1', 0, 'assistant', '¿Por qué te parece que la gente empezó a vivir junta en lugares grandes?', 'anchoring'],
   ['msg-spc-2', 1, 'student', 'Es como la revolución industrial, ¿no? La gente iba a las ciudades por trabajo.', 'anchoring'],
   ['msg-spc-3', 2, 'assistant', 'Buen paralelo. Pero estamos hablando de miles de años antes. ¿Qué "trabajo" habría en esa época que atrajera gente?', 'exploration'],
   ['msg-spc-4', 3, 'student', 'Ah, bueno, en esa época lo que importaba era la comida. Si alguien tenía mucha comida, otros iban ahí.', 'exploration'],
   ['msg-spc-5', 4, 'assistant', '¿Y qué pasaba cuando llegaban?', 'tension'],
   ['msg-spc-6', 5, 'student', 'Cada uno hacía algo distinto. Uno construía, otro hacía armas. Y así se formaba una ciudad.', 'tension'],
   ['msg-spc-7', 6, 'assistant', '¿Podés resumir qué hace falta para que surja una ciudad antigua?', 'consolidation'],
   ['msg-spc-8', 7, 'student', 'Comida de sobra, gente que se especialice, y alguna forma de organizarse. Es lo mismo de siempre: donde hay recursos, se junta gente.', 'consolidation']]
);

// ═══════════════════════════════════════════════════════════════════════════════
// SESSIONS — act-mesopotamia (closed, hist-3a) — 6 students completed
// ═══════════════════════════════════════════════════════════════════════════════

seedSession('sess-sofia-meso', 'act-mesopotamia', 'sofiam', 'completed',
  'consolidation', 2, 13, 9, 13, 9, 30,
  'Sofía conectó rápidamente el control del agua con el poder político. Usó la metáfora de "quien controla la canilla, controla a la gente".',
  null, ['Controlar el riego es controlar la comida, y controlar la comida es controlar a la gente'], 88, [],
  [['msg-sm-1', 0, 'assistant', '¿Por qué te parece que las primeras civilizaciones surgieron al lado de ríos?', 'anchoring'],
   ['msg-sm-2', 1, 'student', 'Porque necesitaban agua para regar los cultivos. Sin río no hay comida suficiente.', 'anchoring'],
   ['msg-sm-3', 2, 'assistant', '¿Y quién decidía cómo se repartía el agua?', 'exploration'],
   ['msg-sm-4', 3, 'student', 'Alguien tenía que organizar eso. Y el que organizaba el riego tenía poder sobre los demás. Es como: quien controla la canilla, controla a la gente.', 'exploration'],
   ['msg-sm-5', 4, 'assistant', '¿Eso significa que el poder político surgió del control del agua?', 'tension'],
   ['msg-sm-6', 5, 'student', 'Sí, al menos en Mesopotamia. El rey no era rey porque sí, era rey porque manejaba la infraestructura.', 'consolidation']]
);

seedSession('sess-mateo-meso', 'act-mesopotamia', 'mateol', 'completed',
  'tension', 3, 13, 10, 13, 10, 40,
  'Mateo entendió la relación agua-comida pero le costó dar el salto a la relación agua-poder.',
  null, ['El río daba comida pero también problemas: había que organizarse para las inundaciones'], 42, ['relación entre recursos naturales y poder político'],
  [['msg-mm-1', 0, 'assistant', '¿Por qué te parece que las primeras civilizaciones surgieron al lado de ríos?', 'anchoring'],
   ['msg-mm-2', 1, 'student', 'Porque el agua sirve para todo: tomar, regar, bañarse.', 'anchoring'],
   ['msg-mm-3', 2, 'assistant', '¿Pero por qué al lado de un río surgió una civilización y en una laguna no?', 'exploration'],
   ['msg-mm-4', 3, 'student', 'Porque el río tenía más agua. Podías regar más.', 'exploration'],
   ['msg-mm-5', 4, 'assistant', '¿Y si el río se inundaba? ¿Qué hacías?', 'tension'],
   ['msg-mm-6', 5, 'student', 'Tenías que organizarte con los demás para controlar el agua. Hacer canales o algo.', 'tension'],
   ['msg-mm-7', 6, 'assistant', '¿Y quién mandaba en esa organización?', 'tension'],
   ['msg-mm-8', 7, 'student', 'El que sabía del agua, supongo. O el más fuerte. No sé.', 'tension']]
);

seedSession('sess-vale-meso', 'act-mesopotamia', 'valentinag', 'completed',
  'consolidation', 1, 13, 11, 13, 11, 18,
  'Valentina articuló la relación recursos-poder-Estado con mucha rapidez y lo generalizó a otras civilizaciones.',
  null, ['El Estado surge cuando un recurso crítico necesita gestión colectiva'], 95, [],
  [['msg-vm-1', 0, 'assistant', '¿Por qué te parece que las primeras civilizaciones surgieron al lado de ríos?', 'anchoring'],
   ['msg-vm-2', 1, 'student', 'Porque el río permitía agricultura a gran escala, pero requería obras de riego coordinadas. Esa coordinación generó estructuras de poder. Es la tesis de Wittfogel, ¿no? El despotismo hidráulico.', 'exploration'],
   ['msg-vm-3', 2, 'assistant', 'Impresionante que conozcas eso. ¿Funciona siempre o hay excepciones?', 'tension'],
   ['msg-vm-4', 3, 'student', 'No siempre. Hay civilizaciones que surgieron sin ríos grandes, como los mayas con cenotes. Pero el principio es similar: un recurso crítico que necesita gestión colectiva genera poder centralizado.', 'consolidation']]
);

seedSession('sess-thiago-meso', 'act-mesopotamia', 'thiagor', 'completed',
  'consolidation', 2, 13, 12, 13, 12, 35,
  'Thiago se entusiasmó con los zigurats y la religión pero logró conectar el poder religioso con el control del agua.',
  null, ['Los sacerdotes controlaban el calendario de siembra porque sabían cuándo venía la crecida'], 60, ['distinguir religión de política en Mesopotamia'],
  [['msg-tm-1', 0, 'assistant', '¿Por qué te parece que las primeras civilizaciones surgieron al lado de ríos?', 'anchoring'],
   ['msg-tm-2', 1, 'student', 'Porque los dioses vivían en el río. Los templos estaban al lado del agua. Vi fotos de los zigurats.', 'anchoring'],
   ['msg-tm-3', 2, 'assistant', 'Interesante. ¿Y por qué los sacerdotes tenían tanto poder?', 'exploration'],
   ['msg-tm-4', 3, 'student', 'Porque sabían cuándo venía la crecida del río. Podían predecir las estaciones.', 'exploration'],
   ['msg-tm-5', 4, 'assistant', '¿Y eso qué les daba?', 'tension'],
   ['msg-tm-6', 5, 'student', 'Poder. Porque si sabés cuándo plantar, controlás la comida. Y si controlás la comida...', 'tension'],
   ['msg-tm-7', 6, 'assistant', '¿Controlás qué?', 'consolidation'],
   ['msg-tm-8', 7, 'student', 'Controlás a la gente. El sacerdote era poderoso porque tenía conocimiento útil sobre el río.', 'consolidation']]
);

seedSession('sess-luciana-meso', 'act-mesopotamia', 'lucianaa', 'completed',
  'consolidation', 2, 13, 14, 13, 14, 28,
  'Luciana analizó con precisión la cadena agua→excedente→Estado y la comparó con el caso de Egipto.',
  null, ['Mesopotamia tenía ríos impredecibles, Egipto tenía el Nilo regular; eso dio estructuras de poder distintas'], 83, [],
  [['msg-lm-1', 0, 'assistant', '¿Por qué te parece que las primeras civilizaciones surgieron al lado de ríos?', 'anchoring'],
   ['msg-lm-2', 1, 'student', 'El río daba agua para riego. Más riego, más comida, más gente, más organización necesaria.', 'anchoring'],
   ['msg-lm-3', 2, 'assistant', '¿Qué tipo de organización?', 'exploration'],
   ['msg-lm-4', 3, 'student', 'Había que construir canales, mantenerlos, decidir quién usaba cuánta agua. Eso requiere un gobierno.', 'exploration'],
   ['msg-lm-5', 4, 'assistant', '¿Sería igual en todos los ríos?', 'tension'],
   ['msg-lm-6', 5, 'student', 'No. El Tigris y el Éufrates eran impredecibles, por eso Mesopotamia tenía muchas ciudades-estado compitiendo. El Nilo era regular, por eso Egipto fue un reino unificado.', 'consolidation']]
);

seedSession('sess-santi-meso', 'act-mesopotamia', 'santip', 'completed',
  'consolidation', 2, 13, 15, 13, 15, 30,
  'Santiago comparó Mesopotamia con Silicon Valley: la concentración de un recurso clave atrae gente y genera poder.',
  null, ['Los ríos eran como el internet de la antigüedad: infraestructura que concentra poder'], 68, ['analogías anacrónicas'],
  [['msg-spm-1', 0, 'assistant', '¿Por qué te parece que las primeras civilizaciones surgieron al lado de ríos?', 'anchoring'],
   ['msg-spm-2', 1, 'student', 'Es como Silicon Valley. Donde hay un recurso clave, se junta toda la gente y alguien termina mandando.', 'anchoring'],
   ['msg-spm-3', 2, 'assistant', 'Interesante paralelo. ¿Cuál era el "recurso clave" en Mesopotamia?', 'exploration'],
   ['msg-spm-4', 3, 'student', 'El agua del río. Y la tierra fértil al lado. Los que controlaban los canales de riego eran como los dueños de las empresas tech.', 'exploration'],
   ['msg-spm-5', 4, 'assistant', '¿Hay alguna diferencia entre controlar agua y controlar tecnología?', 'tension'],
   ['msg-spm-6', 5, 'student', 'Sí, el agua es de vida o muerte. La tecnología no. Eso le daba más poder al que controlaba el agua.', 'tension'],
   ['msg-spm-7', 6, 'assistant', '¿Cómo lo resumirías?', 'consolidation'],
   ['msg-spm-8', 7, 'student', 'El control de un recurso vital genera poder político. En Mesopotamia era el agua, hoy son los datos. El mecanismo es parecido.', 'consolidation']]
);

// ═══════════════════════════════════════════════════════════════════════════════
// SESSIONS — act-egipto (closed, hist-3a) — 7 students completed
// ═══════════════════════════════════════════════════════════════════════════════

seedSession('sess-sofia-egipto', 'act-egipto', 'sofiam', 'completed',
  'consolidation', 2, 6, 9, 6, 9, 25,
  'Sofía entendió la legitimación del faraón como gestor del Nilo y la conectó con la idea de contrato social.',
  null, ['El faraón era poderoso porque garantizaba las crecidas del Nilo — era un contrato implícito'], 90, [],
  [['msg-se-1', 0, 'assistant', '¿Por qué un solo gobernante pudo controlar todo Egipto durante miles de años?', 'anchoring'],
   ['msg-se-2', 1, 'student', 'Porque todos dependían del Nilo y el faraón se presentaba como el que hacía que el Nilo funcionara.', 'anchoring'],
   ['msg-se-3', 2, 'assistant', '¿Y la gente le creía?', 'exploration'],
   ['msg-se-4', 3, 'student', 'Le convenía creerle. Si el faraón organiza el riego y la cosecha sale bien, ¿para qué cuestionarlo? Es como un contrato: yo te obedezco, vos me das comida.', 'exploration'],
   ['msg-se-5', 4, 'assistant', '¿Qué pasa cuando el Nilo no crece?', 'tension'],
   ['msg-se-6', 5, 'student', 'Ahí el faraón tiene un problema. Si no puede cumplir su parte, pierde legitimidad. Como pasó con algunos faraones débiles.', 'consolidation']]
);

seedSession('sess-mateo-egipto', 'act-egipto', 'mateol', 'completed',
  'tension', 3, 6, 10, 6, 10, 40,
  'Mateo entendió que el Nilo daba comida pero no logró articular por qué eso centralizaba el poder en una persona.',
  null, [], 38, ['centralización del poder', 'legitimación política'],
  [['msg-me-1', 0, 'assistant', '¿Por qué un solo gobernante pudo controlar todo Egipto durante miles de años?', 'anchoring'],
   ['msg-me-2', 1, 'student', 'Porque era el faraón y todos le tenían miedo.', 'anchoring'],
   ['msg-me-3', 2, 'assistant', '¿Solo miedo? ¿No había ningún beneficio en obedecer?', 'exploration'],
   ['msg-me-4', 3, 'student', 'Bueno, el faraón organizaba todo. Los canales, las construcciones.', 'exploration'],
   ['msg-me-5', 4, 'assistant', '¿Y eso por qué lo hacía poderoso? Cualquiera podía organizar canales, ¿no?', 'tension'],
   ['msg-me-6', 5, 'student', 'No, porque hacía falta mucha gente y alguien que mandara. Y la religión lo ayudaba.', 'tension']]
);

seedSession('sess-vale-egipto', 'act-egipto', 'valentinag', 'completed',
  'consolidation', 1, 6, 11, 6, 11, 15,
  'Valentina comparó Egipto con Mesopotamia y argumentó que la regularidad del Nilo permitió la unificación política.',
  null, ['El Nilo predecible = poder centralizado estable; ríos impredecibles = ciudades-estado en competencia'], 95, [],
  [['msg-ve-1', 0, 'assistant', '¿Por qué un solo gobernante pudo controlar todo Egipto durante miles de años?', 'anchoring'],
   ['msg-ve-2', 1, 'student', 'Porque el Nilo era predecible. Crecía todos los años igual. Eso le permitía al faraón planificar y cumplir. En Mesopotamia era distinto: los ríos eran caóticos y por eso no hubo un solo gobernante estable.', 'exploration'],
   ['msg-ve-3', 2, 'assistant', '¿Entonces la geografía determina la política?', 'tension'],
   ['msg-ve-4', 3, 'student', 'No la determina, pero la condiciona fuertemente. El Nilo hizo posible la centralización, pero alguien tuvo que aprovecharla.', 'consolidation']]
);

seedSession('sess-thiago-egipto', 'act-egipto', 'thiagor', 'completed',
  'consolidation', 2, 6, 12, 6, 12, 30,
  'Thiago se fascinó con las pirámides y desde ahí llegó a entender el poder del faraón como movilizador de mano de obra.',
  null, ['Las pirámides no las construyeron esclavos sino trabajadores organizados por el faraón — eso muestra su poder'], 62, ['distinguir mito de evidencia histórica'],
  [['msg-te-1', 0, 'assistant', '¿Por qué un solo gobernante pudo controlar todo Egipto durante miles de años?', 'anchoring'],
   ['msg-te-2', 1, 'student', 'Porque construyó las pirámides. Si podés hacer eso, podés hacer cualquier cosa.', 'anchoring'],
   ['msg-te-3', 2, 'assistant', 'Buen punto. ¿Cómo hizo para que miles de personas trabajaran en eso?', 'exploration'],
   ['msg-te-4', 3, 'student', '¿Con esclavos? Ah no, leí que no eran esclavos. Eran campesinos que trabajaban cuando el Nilo crecía y no podían plantar.', 'exploration'],
   ['msg-te-5', 4, 'assistant', '¿Y por qué obedecían?', 'tension'],
   ['msg-te-6', 5, 'student', 'Porque el faraón era como un dios. Y además les daba comida y techo. Era un trato.', 'consolidation']]
);

seedSession('sess-camila-egipto', 'act-egipto', 'camilaf', 'completed',
  'consolidation', 2, 6, 13, 6, 13, 35,
  'Camila articuló bien la relación Nilo-poder pero necesitó más turnos y validación para llegar a la síntesis.',
  null, ['El faraón era intermediario entre el Nilo (naturaleza) y el pueblo (sociedad)'], 68, [],
  [['msg-ce-1', 0, 'assistant', '¿Por qué un solo gobernante pudo controlar todo Egipto durante miles de años?', 'anchoring'],
   ['msg-ce-2', 1, 'student', 'Porque el Nilo era muy importante y alguien tenía que manejarlo... ¿puede ser?', 'anchoring'],
   ['msg-ce-3', 2, 'assistant', 'Vas muy bien. ¿Qué tenía que "manejar" exactamente?', 'exploration'],
   ['msg-ce-4', 3, 'student', 'El riego. Los canales. Cuándo plantar. Y la gente le hacía caso porque sin eso no comían.', 'exploration'],
   ['msg-ce-5', 4, 'assistant', '¿Había algún otro motivo para obedecerlo, además de la comida?', 'tension'],
   ['msg-ce-6', 5, 'student', 'La religión. El faraón era un dios viviente. Entonces era como que el Nilo crecía porque él lo pedía. Era intermediario entre la naturaleza y la gente.', 'consolidation']]
);

seedSession('sess-benjamin-egipto', 'act-egipto', 'benjamind', 'completed',
  'exploration', 4, 6, 14, 6, 14, 45,
  'Benjamín participó más que en otras actividades. Entendió que el faraón tenía poder por la comida pero no llegó a la idea de legitimación.',
  null, [], 30, ['legitimación religiosa', 'síntesis de conceptos'],
  [['msg-be-1', 0, 'assistant', '¿Por qué un solo gobernante pudo controlar todo Egipto durante miles de años?', 'anchoring'],
   ['msg-be-2', 1, 'student', 'Porque era el jefe.', 'anchoring'],
   ['msg-be-3', 2, 'assistant', '¿Pero por qué ÉL era el jefe y no otro? ¿Qué hacía?', 'exploration'],
   ['msg-be-4', 3, 'student', 'Controlaba la comida. O sea, los cultivos del Nilo.', 'exploration'],
   ['msg-be-5', 4, 'assistant', '¿Y la gente estaba de acuerdo con eso?', 'exploration'],
   ['msg-be-6', 5, 'student', 'Supongo que sí, si tenían comida.', 'exploration']]
);

seedSession('sess-luciana-egipto', 'act-egipto', 'lucianaa', 'completed',
  'consolidation', 2, 6, 15, 6, 15, 25,
  'Luciana analizó la estabilidad del poder faraónico comparándola con otros sistemas de gobierno.',
  null, ['La estabilidad del Nilo generó estabilidad política; los dos se reforzaban'], 85, [],
  [['msg-le-1', 0, 'assistant', '¿Por qué un solo gobernante pudo controlar todo Egipto durante miles de años?', 'anchoring'],
   ['msg-le-2', 1, 'student', 'Porque el sistema funcionaba. El Nilo era predecible, las cosechas salían bien, y nadie tenía motivos para rebelarse.', 'anchoring'],
   ['msg-le-3', 2, 'assistant', '¿Y cuándo el sistema dejaba de funcionar?', 'exploration'],
   ['msg-le-4', 3, 'student', 'Cuando había sequías o el Nilo no crecía. Ahí empezaban los problemas políticos. Los períodos intermedios de Egipto coinciden con crisis climáticas.', 'tension'],
   ['msg-le-5', 4, 'assistant', '¿Entonces qué sostenía realmente al faraón: el miedo, la religión o la economía?', 'consolidation'],
   ['msg-le-6', 5, 'student', 'Las tres, pero la economía era la base. Sin el Nilo funcionando, ni la religión ni el miedo alcanzaban.', 'consolidation']]
);

// ═══════════════════════════════════════════════════════════════════════════════
// SESSIONS — act-participar (closed, ciud-4b) — 5 students completed
// ═══════════════════════════════════════════════════════════════════════════════

seedSession('sess-sofia-participar', 'act-participar', 'sofiam', 'completed',
  'consolidation', 2, 14, 9, 14, 9, 30,
  'Sofía conectó participación con poder de incidencia y exploró la tensión entre participar dentro de las reglas y cuestionarlas.',
  null, ['Participar no es solo opinar, es incidir en las decisiones'], 88, ['participación desde afuera del sistema'],
  [['msg-sp-1', 0, 'assistant', '¿Alguna vez intentaste cambiar algo que no te parecía justo?', 'anchoring'],
   ['msg-sp-2', 1, 'student', 'Sí, en la escuela queríamos cambiar el reglamento de celulares. Juntamos firmas.', 'anchoring'],
   ['msg-sp-3', 2, 'assistant', '¿Y funcionó?', 'exploration'],
   ['msg-sp-4', 3, 'student', 'Más o menos. Cambiaron una parte. Aprendí que tenés que seguir las reglas del lugar, aunque te parezcan injustas.', 'exploration'],
   ['msg-sp-5', 4, 'assistant', '¿Y si las reglas no te permiten cambiarlas?', 'tension'],
   ['msg-sp-6', 5, 'student', 'Quizás tenés que presionar desde afuera. Como una marcha. Eso también es participar.', 'tension'],
   ['msg-sp-7', 6, 'assistant', '¿Qué sería participar, en definitiva?', 'consolidation'],
   ['msg-sp-8', 7, 'student', 'Involucrarse en las decisiones que te afectan, buscando incidir. Dentro o fuera de las reglas.', 'consolidation']]
);

seedSession('sess-mateo-participar', 'act-participar', 'mateol', 'completed',
  'consolidation', 3, 14, 10, 14, 10, 40,
  'Mateo mostró resistencia inicial pero tuvo un quiebre conceptual con el ejemplo del semáforo del barrio.',
  null, ['No participar también es una decisión, y tiene consecuencias'], 48, ['condiciones estructurales que limitan participación'],
  [['msg-mp-1', 0, 'assistant', '¿Alguna vez intentaste cambiar algo que no te parecía justo?', 'anchoring'],
   ['msg-mp-2', 1, 'student', 'No. Para qué, si igual no cambia nada.', 'anchoring'],
   ['msg-mp-3', 2, 'assistant', '¿Recordás algún caso en que algo cambió en tu barrio?', 'exploration'],
   ['msg-mp-4', 3, 'student', 'Los vecinos consiguieron un semáforo. Fueron a la municipalidad e insistieron.', 'exploration'],
   ['msg-mp-5', 4, 'assistant', 'Si no hubieran hecho eso, ¿habría semáforo?', 'tension'],
   ['msg-mp-6', 5, 'student', 'No. Entiendo. Si no participás, otros deciden por vos.', 'consolidation']]
);

seedSession('sess-benjamin-participar', 'act-participar', 'benjamind', 'completed',
  'exploration', 4, 14, 11, 14, 11, 45,
  'Benjamín participó poco pero reconoció que votar es una forma de participación.',
  null, [], 22, ['participación más allá del voto', 'concepto de ciudadanía activa'],
  [['msg-bp-1', 0, 'assistant', '¿Alguna vez intentaste cambiar algo que no te parecía justo?', 'anchoring'],
   ['msg-bp-2', 1, 'student', 'No.', 'anchoring'],
   ['msg-bp-3', 2, 'assistant', '¿Conocés alguna forma de participar en las decisiones de tu comunidad?', 'exploration'],
   ['msg-bp-4', 3, 'student', 'Votar. Cuando seas grande votás.', 'exploration'],
   ['msg-bp-5', 4, 'assistant', '¿Y antes de votar? ¿No hay otras formas?', 'exploration'],
   ['msg-bp-6', 5, 'student', 'No sé. Quejarse, supongo.', 'exploration']]
);

seedSession('sess-milag-participar', 'act-participar', 'milag', 'completed',
  'consolidation', 2, 14, 12, 14, 12, 30,
  'Milagros conectó participación con empatía: participás porque te importa lo que les pasa a los demás, no solo a vos.',
  null, ['Participar es ponerse en el lugar del otro y actuar'], 75, [],
  [['msg-mgp-1', 0, 'assistant', '¿Alguna vez intentaste cambiar algo que no te parecía justo?', 'anchoring'],
   ['msg-mgp-2', 1, 'student', 'Sí, cuando una compañera la estaban dejando de lado. Hablé con las otras chicas.', 'anchoring'],
   ['msg-mgp-3', 2, 'assistant', '¿Eso es participar?', 'exploration'],
   ['msg-mgp-4', 3, 'student', 'Creo que sí. Es hacer algo cuando ves que algo está mal. No quedarte callada.', 'exploration'],
   ['msg-mgp-5', 4, 'assistant', '¿Y si hacer algo te trae problemas a vos?', 'tension'],
   ['msg-mgp-6', 5, 'student', 'A veces pasa. Pero si no hacés nada, el problema sigue. Participar es ponerte en el lugar del otro y actuar.', 'consolidation']]
);

seedSession('sess-facur-participar', 'act-participar', 'facur', 'completed',
  'consolidation', 2, 14, 13, 14, 13, 28,
  'Facundo cuestionó si la participación realmente cambia algo o es solo una ilusión de democracia. Debate productivo.',
  null, ['La participación puede ser real o puede ser una pantalla. Hay que distinguirlas.'], 70, ['cinismo vs. pensamiento crítico'],
  [['msg-fp-1', 0, 'assistant', '¿Alguna vez intentaste cambiar algo que no te parecía justo?', 'anchoring'],
   ['msg-fp-2', 1, 'student', 'Sí, pero para qué te cuento si al final los que mandan hacen lo que quieren.', 'anchoring'],
   ['msg-fp-3', 2, 'assistant', '¿Entonces la participación es inútil?', 'exploration'],
   ['msg-fp-4', 3, 'student', 'A veces sí. Hacen como que te escuchan pero ya decidieron todo.', 'exploration'],
   ['msg-fp-5', 4, 'assistant', '¿Hay alguna diferencia entre participación real y participación de mentira?', 'tension'],
   ['msg-fp-6', 5, 'student', 'Sí. La real es cuando tu voz cambia algo. La otra es marketing. Hay que saber distinguirlas.', 'consolidation']]
);

seedSession('sess-luciana-participar', 'act-participar', 'lucianaa', 'completed',
  'consolidation', 2, 14, 14, 14, 14, 30,
  'Luciana analizó la participación como un derecho que requiere condiciones para ser efectivo.',
  null, ['Participar es un derecho, pero necesita condiciones: información, tiempo y canales reales'], 82, [],
  [['msg-lp-1', 0, 'assistant', '¿Alguna vez intentaste cambiar algo que no te parecía justo?', 'anchoring'],
   ['msg-lp-2', 1, 'student', 'Sí, hicimos una petición en la escuela. Pero no todos podían participar porque no tenían información.', 'anchoring'],
   ['msg-lp-3', 2, 'assistant', '¿Qué hace falta para que la participación funcione?', 'exploration'],
   ['msg-lp-4', 3, 'student', 'Información, tiempo para pensar, y que realmente te escuchen. Si falta alguna de las tres, no funciona.', 'exploration'],
   ['msg-lp-5', 4, 'assistant', '¿Podés pensar en un caso donde esas tres condiciones no se cumplan?', 'tension'],
   ['msg-lp-6', 5, 'student', 'Sí, cuando hacen una audiencia pública y te avisan un día antes. Técnicamente podés ir, pero en la práctica no podés prepararte.', 'consolidation']]
);

// ═══════════════════════════════════════════════════════════════════════════════
// SESSIONS — act-igualdad (closed, ciud-4b) — 5 students completed
// ═══════════════════════════════════════════════════════════════════════════════

seedSession('sess-sofia-igualdad', 'act-igualdad', 'sofiam', 'completed',
  'consolidation', 2, 7, 9, 7, 9, 28,
  'Sofía distinguió igualdad de equidad rápidamente y lo aplicó a ejemplos escolares.',
  null, ['Tratar a todos igual puede ser injusto si empezaron en condiciones distintas'], 91, [],
  [['msg-si-1', 0, 'assistant', '¿Es lo mismo tratar a todos igual que tratar a todos con justicia?', 'anchoring'],
   ['msg-si-2', 1, 'student', 'No. Porque si uno tiene más dificultades, tratarlo igual es dejarlo atrás.', 'anchoring'],
   ['msg-si-3', 2, 'assistant', '¿Podés dar un ejemplo?', 'exploration'],
   ['msg-si-4', 3, 'student', 'Si le dás el mismo examen a alguien que tiene dislexia sin adaptarlo, es "igual" pero no es justo.', 'exploration'],
   ['msg-si-5', 4, 'assistant', '¿Y cómo decidís cuándo tratar igual y cuándo diferente?', 'tension'],
   ['msg-si-6', 5, 'student', 'Dependiendo de las necesidades. La equidad es adaptar según lo que cada uno necesita para llegar al mismo lugar.', 'consolidation']]
);

seedSession('sess-mateo-igualdad', 'act-igualdad', 'mateol', 'completed',
  'consolidation', 3, 7, 10, 7, 10, 38,
  'Mateo necesitó un ejemplo concreto del fútbol para entender la diferencia entre igualdad y equidad.',
  null, ['No es lo mismo dar lo mismo a todos que dar a cada uno lo que necesita'], 52, ['aplicar conceptos abstractos sin ejemplos'],
  [['msg-mi-1', 0, 'assistant', '¿Es lo mismo tratar a todos igual que tratar a todos con justicia?', 'anchoring'],
   ['msg-mi-2', 1, 'student', 'Sí, ¿no? Si tratás a todos igual sos justo.', 'anchoring'],
   ['msg-mi-3', 2, 'assistant', 'Imaginá un partido de fútbol. ¿Es justo que todos los jugadores usen el mismo talle de botines?', 'exploration'],
   ['msg-mi-4', 3, 'student', 'No, porque cada uno tiene un pie distinto. Necesitás el talle correcto.', 'exploration'],
   ['msg-mi-5', 4, 'assistant', 'Ahora aplicá eso a la escuela.', 'tension'],
   ['msg-mi-6', 5, 'student', 'Ah. No todos necesitan lo mismo. Dar lo mismo a todos no siempre es justo.', 'consolidation']]
);

seedSession('sess-milag-igualdad', 'act-igualdad', 'milag', 'completed',
  'consolidation', 2, 7, 11, 7, 11, 25,
  'Milagros lo conectó con su experiencia personal de tener una hermana con discapacidad.',
  null, ['Equidad es que mi hermana tenga rampa, no que use la escalera como todos'], 85, [],
  [['msg-mgi-1', 0, 'assistant', '¿Es lo mismo tratar a todos igual que tratar a todos con justicia?', 'anchoring'],
   ['msg-mgi-2', 1, 'student', 'No. Mi hermana usa silla de ruedas. Si la tratás "igual" la dejás abajo porque no hay rampa.', 'anchoring'],
   ['msg-mgi-3', 2, 'assistant', '¿Y qué sería lo justo entonces?', 'exploration'],
   ['msg-mgi-4', 3, 'student', 'Ponerle una rampa. No es lo mismo que la escalera pero le permite llegar al mismo lugar.', 'exploration'],
   ['msg-mgi-5', 4, 'assistant', '¿Eso es tratar diferente o tratar justo?', 'consolidation'],
   ['msg-mgi-6', 5, 'student', 'Es tratar justo. Diferente pero justo. Equidad se llama.', 'consolidation']]
);

seedSession('sess-facur-igualdad', 'act-igualdad', 'facur', 'completed',
  'consolidation', 2, 7, 12, 7, 12, 30,
  'Facundo planteó que la equidad puede usarse como excusa para dar privilegios. Debate productivo sobre los límites del concepto.',
  null, ['La equidad tiene que tener límites, sino se convierte en privilegio disfrazado'], 73, [],
  [['msg-fi-1', 0, 'assistant', '¿Es lo mismo tratar a todos igual que tratar a todos con justicia?', 'anchoring'],
   ['msg-fi-2', 1, 'student', 'No. Pero ¿quién decide qué es justo? A veces la "equidad" es dar más a los amigos del que decide.', 'anchoring'],
   ['msg-fi-3', 2, 'assistant', 'Buen punto. ¿Cómo evitamos que la equidad sea una excusa para privilegios?', 'exploration'],
   ['msg-fi-4', 3, 'student', 'Con reglas claras. Que se sepa por qué alguien recibe algo diferente.', 'exploration'],
   ['msg-fi-5', 4, 'assistant', '¿Entonces equidad necesita transparencia?', 'tension'],
   ['msg-fi-6', 5, 'student', 'Sí. Si no es transparente, no es equidad. Es favoritismo.', 'consolidation']]
);

seedSession('sess-luciana-igualdad', 'act-igualdad', 'lucianaa', 'completed',
  'consolidation', 2, 7, 13, 7, 13, 28,
  'Luciana hizo una distinción precisa entre igualdad formal (ante la ley) e igualdad real (de oportunidades).',
  null, ['Igualdad formal sin igualdad real es una promesa vacía'], 87, [],
  [['msg-li-1', 0, 'assistant', '¿Es lo mismo tratar a todos igual que tratar a todos con justicia?', 'anchoring'],
   ['msg-li-2', 1, 'student', 'Depende de qué tipo de igualdad. Ante la ley, todos somos iguales. Pero en la práctica no todos empiezan desde el mismo lugar.', 'anchoring'],
   ['msg-li-3', 2, 'assistant', '¿Y qué hacemos con esa diferencia?', 'exploration'],
   ['msg-li-4', 3, 'student', 'Compensar. Dar más al que tiene menos para que pueda competir en igualdad de condiciones. Eso es equidad.', 'exploration'],
   ['msg-li-5', 4, 'assistant', '¿Hay algún riesgo en eso?', 'tension'],
   ['msg-li-6', 5, 'student', 'Sí, que se vuelva asistencialismo o que nunca se resuelva la desigualdad de base. Pero sin equidad, la igualdad formal es una promesa vacía.', 'consolidation']]
);

// ═══════════════════════════════════════════════════════════════════════════════
// SESSIONS — act-revolucion (active, hist-3a) — some completed, some not_started
// ═══════════════════════════════════════════════════════════════════════════════

seedSession('sess-sofia-rev', 'act-revolucion', 'sofiam', 'completed',
  'exploration', 2, 1, 14, 1, 14, 20,
  'Sofía identificó la asimetría económica entre Buenos Aires y el interior como eje central de 1810.',
  null, [], 82, ['rol del Cabildo', 'intereses del interior'],
  [['msg-sr-1', 0, 'assistant', '¿Por qué te parece que en 1810 no todos estaban de acuerdo con lo mismo?', 'anchoring'],
   ['msg-sr-2', 1, 'student', 'Creo que dependía de dónde vivías. Buenos Aires quería manejar todo y el interior no quería quedar afuera.', 'anchoring'],
   ['msg-sr-3', 2, 'assistant', '¿Y qué tenía Buenos Aires que no tenían las otras ciudades?', 'exploration'],
   ['msg-sr-4', 3, 'student', 'El puerto. Toda la plata del comercio pasaba por ahí. Buenos Aires tenía más poder económico.', 'exploration']]
);

seedSession('sess-vale-rev', 'act-revolucion', 'valentinag', 'completed',
  'tension', 3, 1, 15, 1, 15, 25,
  'Valentina analizó la tensión Buenos Aires-interior con profundidad.',
  null, [], 90, ['distribución del poder post-revolución'],
  [['msg-vr-1', 0, 'assistant', '¿Por qué te parece que en 1810 no todos estaban de acuerdo?', 'anchoring'],
   ['msg-vr-2', 1, 'student', 'Había intereses distintos según la región. El interior producía materias primas y Buenos Aires concentraba el comercio exterior.', 'anchoring'],
   ['msg-vr-3', 2, 'assistant', '¿Qué consecuencias tenía eso para el interior?', 'exploration'],
   ['msg-vr-4', 3, 'student', 'Que los impuestos quedaban en Buenos Aires. El interior no recibía proporcionalmente.', 'exploration'],
   ['msg-vr-5', 4, 'assistant', '¿Entonces por qué el interior participó en la revolución?', 'tension'],
   ['msg-vr-6', 5, 'student', 'Quizás pensaron que sacar a los españoles era un primer paso y después negociarían la distribución del poder.', 'tension']]
);

seedSession('sess-camila-rev', 'act-revolucion', 'camilaf', 'completed',
  'consolidation', 1, 2, 9, 2, 9, 32,
  'Camila articuló que la revolución cambió quién mandaba pero no resolvió quién mandaba adentro.',
  null, ['La revolución sacó a España pero dejó sin resolver quién mandaba adentro'], 65, ['perspectiva del interior en 1810'],
  [['msg-cr-1', 0, 'assistant', '¿Por qué te parece que en 1810 no todos estaban de acuerdo?', 'anchoring'],
   ['msg-cr-2', 1, 'student', 'Porque cada región tenía sus propios intereses económicos. Buenos Aires controlaba el puerto.', 'anchoring'],
   ['msg-cr-3', 2, 'assistant', '¿Y qué quería el interior?', 'exploration'],
   ['msg-cr-4', 3, 'student', 'Más autonomía y una distribución más justa de los recursos.', 'exploration'],
   ['msg-cr-5', 4, 'assistant', '¿Esos dos proyectos podían coexistir?', 'tension'],
   ['msg-cr-6', 5, 'student', 'Eran incompatibles. Alguien tenía que ceder y ninguno quería.', 'tension'],
   ['msg-cr-7', 6, 'assistant', '¿Cómo resumirías la tensión central de 1810?', 'consolidation'],
   ['msg-cr-8', 7, 'student', 'Era una disputa por quién controlaba los recursos. La revolución sacó a España pero dejó sin resolver quién mandaba adentro.', 'consolidation']]
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
  ['idea-sofia-1', 'sofiam', 'hist-3a', 'act-ciudades', 'sess-sofia-ciudades', 'El excedente agrícola permitió que no todos tuvieran que producir alimentos', '¿Qué necesitaría pasar primero?', ['División del trabajo', 'Revolución urbana'], 20],
  ['idea-sofia-2', 'sofiam', 'hist-3a', 'act-ciudades', 'sess-sofia-ciudades', 'La especialización crea interdependencia que hace que vivir juntos sea más conveniente', '¿Cómo resumirías la cadena?', ['Origen de las ciudades', 'Cooperación social'], 20],
  ['idea-sofia-3', 'sofiam', 'hist-3a', 'act-mesopotamia', 'sess-sofia-meso', 'Controlar el riego es controlar la comida, y controlar la comida es controlar a la gente', '¿Quién decidía cómo se repartía el agua?', ['Poder político', 'Recursos naturales'], 13],
  ['idea-sofia-4', 'sofiam', 'hist-3a', 'act-egipto', 'sess-sofia-egipto', 'El faraón era poderoso porque garantizaba las crecidas del Nilo', '¿Y la gente le creía?', ['Legitimación del poder', 'Contrato social'], 6],
  ['idea-sofia-5', 'sofiam', 'ciud-4b', 'act-participar', 'sess-sofia-participar', 'Participar no es solo opinar, es incidir en las decisiones', '¿Qué sería participar?', ['Ciudadanía activa', 'Democracia'], 14],
  ['idea-sofia-6', 'sofiam', 'ciud-4b', 'act-igualdad', 'sess-sofia-igualdad', 'Tratar a todos igual puede ser injusto si empezaron en condiciones distintas', '¿Cómo decidís cuándo tratar igual y cuándo diferente?', ['Equidad', 'Justicia social'], 7],
  // Mateo
  ['idea-mateo-1', 'mateol', 'hist-3a', 'act-ciudades', 'sess-mateo-ciudades', 'Vivir juntos también servía para defenderse', '¿Qué tendría que existir antes?', ['Seguridad colectiva'], 20],
  ['idea-mateo-2', 'mateol', 'ciud-4b', 'act-participar', 'sess-mateo-participar', 'No participar también es una decisión, y tiene consecuencias', 'Si no hubieran hecho eso, ¿habría semáforo?', ['Participación ciudadana'], 14],
  // Valentina
  ['idea-vale-1', 'valentinag', 'hist-3a', 'act-ciudades', 'sess-vale-ciudades', 'La ciudad es posible cuando la producción supera la subsistencia individual', '¿Y cómo resumirías qué condiciones son necesarias?', ['Excedente agrícola'], 20],
  ['idea-vale-2', 'valentinag', 'hist-3a', 'act-mesopotamia', 'sess-vale-meso', 'El Estado surge cuando un recurso crítico necesita gestión colectiva', '¿Funciona siempre esa tesis?', ['Formación del Estado'], 13],
  ['idea-vale-3', 'valentinag', 'hist-3a', 'act-egipto', 'sess-vale-egipto', 'El Nilo predecible permite poder centralizado estable', '¿La geografía determina la política?', ['Determinismo geográfico'], 6],
  // Luciana
  ['idea-luciana-1', 'lucianaa', 'hist-3a', 'act-ciudades', 'sess-luciana-ciudades', 'El orden importa: excedente primero, especialización después, ciudad como resultado', '¿Cuál es el orden?', ['Causalidad histórica'], 20],
  ['idea-luciana-2', 'lucianaa', 'hist-3a', 'act-mesopotamia', 'sess-luciana-meso', 'Ríos impredecibles dan ciudades-estado, ríos predecibles dan imperios', '¿Sería igual en todos los ríos?', ['Geografía y política'], 13],
  ['idea-luciana-3', 'lucianaa', 'ciud-4b', 'act-igualdad', 'sess-luciana-igualdad', 'Igualdad formal sin igualdad real es una promesa vacía', '¿Hay algún riesgo en compensar?', ['Igualdad', 'Equidad'], 7],
  // Facundo
  ['idea-facur-1', 'facur', 'ciud-4b', 'act-participar', 'sess-facur-participar', 'La participación puede ser real o una pantalla', '¿Hay diferencia entre participación real y de mentira?', ['Democracia', 'Participación'], 14],
  ['idea-facur-2', 'facur', 'ciud-4b', 'act-igualdad', 'sess-facur-igualdad', 'La equidad sin transparencia es favoritismo', '¿Equidad necesita transparencia?', ['Transparencia', 'Justicia'], 7],
  // Milagros
  ['idea-milag-1', 'milag', 'ciud-4b', 'act-igualdad', 'sess-milag-igualdad', 'Equidad es que mi hermana tenga rampa, no que use la escalera como todos', '¿Y qué sería lo justo?', ['Accesibilidad', 'Equidad'], 7],
  // Santiago
  ['idea-santi-1', 'santip', 'hist-3a', 'act-mesopotamia', 'sess-santi-meso', 'Los ríos eran como el internet de la antigüedad: infraestructura que concentra poder', '¿Hay diferencia entre controlar agua y tecnología?', ['Analogías históricas'], 13],
  // Camila
  ['idea-camila-1', 'camilaf', 'hist-3a', 'act-ciudades', 'sess-camila-ciudades', 'La división del trabajo solo funciona si hay excedente que la sostenga', '¿Qué se necesita para que funcione?', ['División del trabajo'], 20],
  ['idea-camila-2', 'camilaf', 'hist-3a', 'act-egipto', 'sess-camila-egipto', 'El faraón era intermediario entre el Nilo y el pueblo', '¿Había otro motivo para obedecerlo?', ['Legitimación religiosa'], 6],
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
  'La clase de 8 alumnos muestra una comprensión promedio del 66%, con una dispersión importante entre los alumnos más fuertes y los que necesitan más acompañamiento. Valentina, Sofía y Luciana construyeron cadenas causales completas de forma autónoma, identificando con claridad la relación entre excedente agrícola, especialización y surgimiento urbano. Santiago y Thiago aportaron conexiones creativas con otras épocas y disciplinas, aunque necesitaron reconducción para mantener el foco. Camila fue precisa pero necesitó más validación externa. Mateo avanzó bien una vez que se le dio un ejemplo concreto (su barrio), pero le cuesta arrancar sin andamiaje. Benjamín es el caso que más preocupa: participó con monosílabos, captó la idea del excedente pero no logró articular la cadena causal completa. Queda pendiente explorar casos históricos que desafíen el modelo simple para los alumnos avanzados.',
  66,
  JSON.stringify({
    class_comprehension_avg: 66,
    class_summary: 'Comprensión general aceptable pero con dispersión muy alta (25% a 92%). El concepto de excedente agrícola quedó asentado en 6 de 8 alumnos, pero la capacidad de articular la cadena causal completa (excedente → especialización → interdependencia → ciudad) solo se logró en la mitad del grupo. Se observa un patrón claro: los alumnos que hipotetizan antes de que el tutor los guíe (Valentina, Sofía, Luciana) avanzan mucho más rápido que los que esperan instrucciones (Benjamín, Mateo). Esto sugiere que la próxima actividad debería fomentar la formulación de hipótesis propias.',
    difficult_topics: [
      { topic: 'Cadena causal completa', student_count: 3, description: 'Benjamín, Mateo y en menor medida Thiago no lograron articular la secuencia completa excedente → especialización → ciudad. Entienden los conceptos individuales pero no los conectan en un argumento coherente. Benjamín se quedó en "del campo sale la comida" sin dar el siguiente paso.' },
      { topic: 'Causalidad vs. correlación', student_count: 2, description: 'Thiago confundió la defensa (murallas) con causa del surgimiento urbano, cuando en realidad es consecuencia. Santiago hizo algo similar con la revolución industrial. Ambos necesitan practicar la distinción entre lo que viene primero y lo que viene después.' },
    ],
    struggling_students: [
      { student_id: 'benjamind', name: 'Benjamín Díaz', comprehension_pct: 25, main_difficulty: 'No logra integrar conceptos individuales en un argumento. Participación muy baja — responde con monosílabos y necesita que cada pregunta sea extremadamente concreta para avanzar.' },
      { student_id: 'mateol', name: 'Mateo López', comprehension_pct: 45, main_difficulty: 'Tiene la capacidad pero arranca bloqueado ante preguntas abiertas. Una vez que el tutor lo ancla en algo concreto (su barrio, su experiencia), razona bien. El problema es que no puede hacer ese anclaje solo.' },
      { student_id: 'thiagor', name: 'Thiago Rodríguez', comprehension_pct: 55, main_difficulty: 'Se dispersa con conexiones tangenciales (castillos, películas) y confunde causas con consecuencias. Cuando se lo reconduce es productivo, pero necesita más práctica en razonamiento causal.' },
    ],
    suggested_groups: [
      { group_name: 'Refuerzo causal', student_ids: ['benjamind', 'mateol', 'thiagor'], topic: 'Construcción de cadenas causales', rationale: 'Los tres tienen dificultades diferentes pero complementarias para articular secuencias de causa-efecto. Mateo puede anclar en lo concreto, Thiago aporta creatividad, y Benjamín se beneficia de escuchar el razonamiento de sus compañeros.' },
      { group_name: 'Desafío avanzado', student_ids: ['valentinag', 'sofiam', 'lucianaa'], topic: 'Excepciones al modelo urbano', rationale: 'Ya dominan el modelo básico. Pueden trabajar con Çatalhöyük (ciudad sin agricultura intensiva) o las ciudades maya (sin ríos) para complejizar su comprensión.' },
      { group_name: 'Creatividad dirigida', student_ids: ['santip', 'camilaf'], topic: 'Analogías históricas controladas', rationale: 'Santiago tiene la creatividad y Camila la rigurosidad. Juntos pueden producir analogías que sean originales Y precisas.' },
    ],
    suggested_plan: '• Abrir la próxima clase con un ejercicio breve donde cada alumno ordene 4 eventos en secuencia causal (5 min, individual, corrige en grupo)\n• Grupo de refuerzo: darles 3 "piezas" (excedente, especialización, concentración) y pedirles que armen la cadena con ejemplos propios\n• Grupo avanzado: presentarles el caso de Çatalhöyük y pedirles que expliquen por qué surgió sin los factores que identificaron. ¿Rompe el modelo o lo complejiza?\n• Santiago y Camila: que elijan una ciudad moderna y apliquen el modelo antiguo. ¿Funciona? ¿Qué cambia?\n• Cierre grupal: cada grupo presenta sus conclusiones en 3 minutos. El foco es que los del grupo de refuerzo escuchen cómo los otros articulan las cadenas.',
  }),
  daysAgo(19)
);

insertSummary.run(
  'summ-mesopotamia', 'act-mesopotamia', 'hist-3a',
  'La clase mostró una mejora respecto a la actividad anterior (72% vs 66%). La relación entre control de recursos naturales y poder político fue comprendida por la mayoría, con Valentina alcanzando una respuesta de nivel universitario al mencionar la tesis del despotismo hidráulico. Los alumnos creativos (Thiago, Santiago) hicieron aportes valiosos: Thiago conectó los sacerdotes con el calendario de siembra, y Santiago comparó Mesopotamia con Silicon Valley. Luciana aportó la comparación entre ríos predecibles e impredecibles y su efecto en la estructura política. Mateo sigue siendo el caso más difícil del grupo: entiende que el agua sirve para regar pero no da el salto al concepto de que controlar un recurso es controlar a las personas.',
  72,
  JSON.stringify({
    class_comprehension_avg: 72,
    class_summary: 'El grupo está consolidando la idea de que el control de recursos genera poder político. La mejora respecto a "El origen de las ciudades" es visible: más alumnos articulan argumentos sin andamiaje. Sin embargo, la brecha entre los alumnos fuertes y los rezagados se mantiene. Mateo logró avances concretos (ahora entiende el excedente) pero sigue sin conectar recursos con poder de forma autónoma.',
    difficult_topics: [
      { topic: 'Relación recursos-poder político', student_count: 2, description: 'Mateo comprendió que el agua permite la agricultura pero no logró articular por qué controlar el agua da poder sobre las personas. Se quedó en la dimensión material (agua = comida) sin pasar a la dimensión política (agua = control social). Santiago entendió la idea con su analogía tech pero le costó sostenerla en el contexto mesopotámico.' },
      { topic: 'Diferencia entre religión y política en sociedades antiguas', student_count: 3, description: 'Thiago, Mateo y en menor medida Santiago tienden a tratar religión y política como cosas separadas, cuando en Mesopotamia eran inseparables. Thiago lo intuyó con los sacerdotes pero no lo articuló completamente.' },
    ],
    struggling_students: [
      { student_id: 'mateol', name: 'Mateo López', comprehension_pct: 42, main_difficulty: 'El concepto de que controlar un recurso da poder político le resulta demasiado abstracto. Entiende las partes concretas (agua, comida, canales) pero no el mecanismo de poder subyacente. Necesita que le muestren el paso intermedio con ejemplos que él conozca.' },
    ],
    suggested_groups: [
      { group_name: 'Profundización comparativa', student_ids: ['valentinag', 'lucianaa'], topic: 'Mesopotamia vs Egipto: ríos distintos, políticas distintas', rationale: 'Luciana ya planteó la comparación y Valentina conoce la tesis de Wittfogel. Pueden preparar una presentación que ayude al resto del grupo a entender cómo la geografía condiciona la política.' },
      { group_name: 'Analogías como puente', student_ids: ['santip', 'thiagor'], topic: 'De Mesopotamia a hoy: quién controla qué', rationale: 'Santiago con su analogía tech y Thiago con los sacerdotes tienen buenos disparadores. Si los combinan pueden construir un argumento sobre cómo el poder siempre se asocia al control de un recurso clave.' },
    ],
    suggested_plan: '• Arrancar la clase con la pregunta: "¿Quién tiene poder en tu barrio y por qué?" para anclar el concepto de recurso→poder en la experiencia cotidiana\n• Pedirle a Valentina y Luciana que presenten su comparación Mesopotamia vs Egipto (10 min). Que el grupo identifique qué es igual y qué es diferente\n• Santiago y Thiago: que presenten su analogía "recursos de ayer vs recursos de hoy" y el grupo debata si el mecanismo es el mismo\n• Con Mateo: trabajar aparte con un ejemplo concreto — "Si vos controlás la única canilla de agua del barrio, ¿qué pasa?" — y de ahí escalar al concepto mesopotámico\n• Cierre: cada alumno escribe en una oración la relación entre recurso y poder. Se comparten y se discuten las diferencias.',
  }),
  daysAgo(12)
);

insertSummary.run(
  'summ-egipto', 'act-egipto', 'hist-3a',
  'Esta fue la tercera actividad del bloque de civilizaciones antiguas y se nota la acumulación de aprendizajes. La comprensión promedio subió levemente a 68%, con 7 alumnos que completaron la actividad. Sofía articuló la idea de "contrato implícito" entre faraón y pueblo, un salto conceptual importante. Valentina comparó Egipto con Mesopotamia de forma rigurosa, argumentando que la regularidad del Nilo permitió la unificación política. Thiago se enganchó con las pirámides y desde ahí llegó a entender al faraón como movilizador de mano de obra, corrigiendo su error anterior sobre esclavos. Camila fue cautelosa pero precisa al describir al faraón como intermediario entre naturaleza y sociedad. Luciana analizó la estabilidad egipcia vinculándola con crisis climáticas. Benjamín participó más que en actividades anteriores, entendió que el faraón controlaba la comida, pero sigue sin articular la idea de legitimación. Mateo captó la dimensión material del poder faraónico pero no la religiosa.',
  68,
  JSON.stringify({
    class_comprehension_avg: 68,
    class_summary: 'Se observa una tendencia positiva en el grupo: el modelo recursos→poder que se empezó a construir en "El origen de las ciudades" y se profundizó en "Mesopotamia" está madurando. Los alumnos ya no parten de cero sino que traen conceptos de actividades anteriores. La brecha sigue siendo preocupante: Valentina y Sofía operan a un nivel que podría ser de secundaria superior, mientras que Benjamín y Mateo todavía necesitan mucho andamiaje para los conceptos básicos.',
    difficult_topics: [
      { topic: 'Legitimación religiosa del poder', student_count: 3, description: 'Benjamín, Mateo y parcialmente Thiago no lograron articular cómo la dimensión religiosa sostenía al faraón más allá del control material. Entienden que el faraón "era como un dios" pero no conectan eso con la estabilidad del sistema político. Es un concepto que requiere pensar en dos niveles simultáneamente (material y simbólico), lo cual es difícil para alumnos que todavía están consolidando el primer nivel.' },
      { topic: 'Comparación entre sistemas políticos', student_count: 4, description: 'Solo Valentina, Luciana y parcialmente Sofía pudieron comparar Egipto con Mesopotamia de forma rigurosa. El resto del grupo tiende a analizar cada civilización de forma aislada sin ver los patrones comunes ni las diferencias significativas. Esto sugiere que la habilidad de comparación histórica necesita trabajo explícito.' },
    ],
    struggling_students: [
      { student_id: 'benjamind', name: 'Benjamín Díaz', comprehension_pct: 30, main_difficulty: 'Mejora leve: ahora participa más y capta conceptos concretos individuales (el faraón controlaba la comida). Pero sigue sin poder integrar múltiples conceptos o dar saltos abstractos. El avance es que ya no dice "ni idea" sino que intenta responder, lo cual es una base sobre la que construir.' },
      { student_id: 'mateol', name: 'Mateo López', comprehension_pct: 38, main_difficulty: 'El concepto de centralización del poder sigue siendo demasiado abstracto. Mateo entiende que "el faraón organizaba todo" pero no articula POR QUÉ eso lo hacía poderoso. Cuando se le pregunta directamente, recurre al miedo o la fuerza como explicación, sin considerar la legitimación simbólica.' },
      { student_id: 'thiagor', name: 'Thiago Rodríguez', comprehension_pct: 62, main_difficulty: 'Mejoró significativamente respecto a la actividad anterior. Corrigió su error sobre esclavos en las pirámides, lo cual muestra disposición a revisar sus ideas. Su desafío sigue siendo distinguir el dato anecdótico interesante del concepto históricamente relevante.' },
    ],
    suggested_groups: [
      { group_name: 'Tutoría entre pares', student_ids: ['sofiam', 'mateol'], topic: 'Legitimación del poder', rationale: 'Sofía tiene la habilidad de explicar con analogías concretas (su "contrato implícito") que pueden servirle a Mateo, que necesita exactamente ese tipo de puente entre lo concreto y lo abstracto.' },
      { group_name: 'Análisis comparativo', student_ids: ['valentinag', 'lucianaa', 'camilaf'], topic: 'Patrones de poder en civilizaciones antiguas', rationale: 'Las tres tienen la rigurosidad necesaria para una comparación seria. Camila se beneficiará del modelo de trabajo de las otras dos y ganará confianza al ver que sus aportes son valorados.' },
      { group_name: 'Lo visual como puente', student_ids: ['thiagor', 'santip', 'benjamind'], topic: 'Representación visual del poder', rationale: 'Thiago y Santiago son visuales y creativos. Si representan gráficamente la relación río→poder→legitimación, Benjamín puede seguir el argumento de forma más concreta que con solo texto.' },
    ],
    suggested_plan: '• Abrir con un ejercicio de comparación: proyectar imágenes de un zigurat y una pirámide y preguntar "¿qué tienen en común y qué tienen de diferente?"\n• Grupo de tutoría (Sofía + Mateo): Sofía le explica a Mateo su idea del "contrato implícito" y juntos la aplican al faraón. Objetivo: que Mateo articule por qué el pueblo obedecía sin que fuera solo por miedo\n• Grupo comparativo (Valentina, Luciana, Camila): que completen un cuadro comparativo Mesopotamia vs Egipto en 5 dimensiones (geografía, gobierno, religión, economía, legado). Presentan al grupo\n• Grupo visual (Thiago, Santiago, Benjamín): que dibujen o esquematicen el "sistema de poder" del faraón. Quién depende de quién, qué fluye en cada dirección (comida, obediencia, protección, legitimidad)\n• Cierre: cada alumno escribe una respuesta a "¿El faraón era poderoso por la fuerza o por otra cosa?" — se comparten anónimamente y se discuten',
  }),
  daysAgo(5)
);

insertSummary.run(
  'summ-participar', 'act-participar', 'ciud-4b',
  'La actividad produjo un debate excepcionalmente rico, con 6 alumnos que la completaron. El grupo abordó la participación desde ángulos muy diversos: Sofía desde la incidencia real y el poder de cambiar reglas, Mateo desde un escepticismo que se transformó en reconocimiento, Facundo desde la desconfianza constructiva distinguiendo participación real de simbólica, Milagros desde la empatía y la acción solidaria, Luciana desde el análisis de las condiciones necesarias para participar, y Benjamín con una participación mínima que solo llegó al voto como forma de ciudadanía. La diversidad de perspectivas es una fortaleza del grupo que puede aprovecharse en futuras actividades.',
  64,
  JSON.stringify({
    class_comprehension_avg: 64,
    class_summary: 'El grupo tiene una comprensión heterogénea pero complementaria de la participación ciudadana. Los alumnos que ya tienen experiencias personales de participación (Sofía, Milagros) articulan mejor el concepto. Los que son escépticos (Mateo, Facundo) aportan una mirada crítica valiosa pero que puede bloquearlos si no se canaliza bien. La brecha principal no es de comprensión sino de conexión personal con el tema: los que lo sienten propio lo entienden mejor.',
    difficult_topics: [
      { topic: 'Participación más allá del voto', student_count: 2, description: 'Benjamín y parcialmente Mateo tienen una visión muy limitada de qué significa participar. Para Benjamín, participar es votar y nada más. Mateo al menos reconoce que los vecinos del semáforo "participaron", pero no generaliza. Les falta un mapa más amplio de formas de participación: desde el centro de estudiantes hasta las redes sociales, pasando por el voluntariado y la protesta.' },
      { topic: 'Condiciones estructurales que limitan la participación', student_count: 3, description: 'Mateo, Benjamín y Facundo no lograron identificar qué factores estructurales limitan la participación real. Facundo intuye que "los que mandan hacen lo que quieren" pero no articula mecanismos concretos. Luciana sí lo logró (información, tiempo, canales reales), lo cual la convierte en un buen recurso para el grupo.' },
    ],
    struggling_students: [
      { student_id: 'benjamind', name: 'Benjamín Díaz', comprehension_pct: 22, main_difficulty: 'La participación mínima es un patrón que se repite en todas las actividades. En esta ocasión ni siquiera la resistencia activa de Mateo o Facundo: simplemente desinterés o desconexión. El único avance fue que mencionó "votar" como forma de participación, lo cual al menos muestra que tiene alguna noción del concepto.' },
      { student_id: 'mateol', name: 'Mateo López', comprehension_pct: 48, main_difficulty: 'El escepticismo de Mateo ("para qué, si no cambia nada") lo bloquea antes de intentar. Sin embargo, cuando el tutor le mostró un ejemplo concreto de participación exitosa (el semáforo), tuvo un quiebre genuino. El desafío es que necesita ese tipo de evidencia concreta para cada nuevo concepto.' },
    ],
    suggested_groups: [
      { group_name: 'Debate estructurado', student_ids: ['facur', 'sofiam', 'lucianaa'], topic: 'Participación real vs. simbólica', rationale: 'Facundo aporta la mirada escéptica, Sofía la experiencia de incidencia, y Luciana las condiciones necesarias. Un debate entre los tres sería productivo y de alto nivel.' },
      { group_name: 'Experiencia personal como puente', student_ids: ['milag', 'mateol', 'benjamind'], topic: 'Formas cotidianas de participación', rationale: 'Milagros tiene la empatía y los ejemplos concretos (su compañera marginada) que pueden conectar con Mateo y Benjamín. El objetivo es que identifiquen formas de participación que ya practican sin saberlo.' },
    ],
    suggested_plan: '• Abrir con una lluvia de ideas: "¿De cuántas formas distintas podés participar en tu comunidad?" — que cada uno escriba al menos 3 y se las comparta\n• Grupo de debate (Facundo, Sofía, Luciana): preparar un mini-debate de 10 minutos. Tesis: "La participación ciudadana en Argentina es más simbólica que real." Facundo a favor, Sofía en contra, Luciana modera con datos\n• Grupo de experiencia (Milagros, Mateo, Benjamín): que cada uno cuente una vez que "hizo algo" por alguien más. No importa si es grande o chico. Después clasifican eso como forma de participación\n• Cierre grupal: cada alumno elige UNA forma de participación que le gustaría probar y explica por qué. Se arma un "mapa de participación del curso"\n• Tarea para la próxima: preguntar en su casa si algún familiar alguna vez participó en algo colectivo (reclamo, asociación, cooperadora). Traer la historia.',
  }),
  daysAgo(13)
);

insertSummary.run(
  'summ-igualdad', 'act-igualdad', 'ciud-4b',
  'Esta fue probablemente la mejor actividad del curso hasta el momento, con una comprensión promedio de 77%. Todos los alumnos lograron distinguir igualdad de equidad, y varios aportaron matices importantes: Sofía con la adaptación según necesidades, Milagros con el ejemplo vívido de la rampa para su hermana, Facundo con la tensión entre equidad y favoritismo, y Luciana con la distinción entre igualdad formal y real. Mateo necesitó un ejemplo del fútbol para captar la diferencia pero una vez que la entendió la expresó con claridad. Es notable que incluso los alumnos habitualmente más rezagados lograron un nivel de comprensión aceptable en esta actividad, probablemente porque el tema tiene conexiones directas con su experiencia cotidiana.',
  77,
  JSON.stringify({
    class_comprehension_avg: 77,
    class_summary: 'Excelente nivel grupal. La distinción igualdad/equidad fue comprendida por todos, y el grupo mostró madurez al debatir los riesgos del concepto (Facundo planteó que la equidad puede disfrazar favoritismo, Luciana señaló el riesgo de asistencialismo). El hecho de que Mateo y hasta Milagros hayan podido articular sus ideas con claridad sugiere que los temas con conexión directa a la experiencia personal producen mejor comprensión. Esta es una lección metodológica para las próximas actividades.',
    difficult_topics: [
      { topic: 'Límites de la equidad', student_count: 2, description: 'Sofía y Mateo comprendieron bien el concepto pero no exploraron sus límites. ¿Cuándo la equidad se convierte en privilegio? ¿Quién decide qué necesita cada uno? Facundo y Luciana sí entraron en esta zona, pero es un tema que merece más profundización grupal.' },
    ],
    struggling_students: [
      { student_id: 'mateol', name: 'Mateo López', comprehension_pct: 52, main_difficulty: 'Mejoró respecto a otras actividades. Captó la diferencia igualdad/equidad con el ejemplo del fútbol. Su dificultad sigue siendo la abstracción: necesitó el ejemplo concreto para entender, y no está claro si puede transferir el concepto a otros contextos sin ayuda.' },
    ],
    suggested_groups: [
      { group_name: 'Profundización ética', student_ids: ['facur', 'lucianaa', 'sofiam'], topic: 'Los dilemas de la equidad', rationale: 'Los tres mostraron capacidad de pensar en los límites y riesgos del concepto. Pueden trabajar con dilemas donde la equidad entre en tensión con otros valores (mérito, eficiencia, libertad).' },
      { group_name: 'De la experiencia al concepto', student_ids: ['milag', 'mateol'], topic: 'Equidad en la vida cotidiana', rationale: 'Milagros tiene una experiencia de vida (la silla de ruedas de su hermana) que es un ancla perfecta para Mateo. Juntos pueden mapear casos de equidad en su entorno y practicar la transferencia del concepto.' },
    ],
    suggested_plan: '• Aprovechar el buen momento del grupo para introducir justicia distributiva: ¿cómo se reparten los recursos cuando no alcanzan para todos?\n• Abrir con el dilema del bote salvavidas: 10 personas, bote para 6. ¿Cómo decidís quién sube?\n• Grupo de profundización: presentarles 3 criterios de distribución (necesidad, mérito, azar) y que debatan cuál es más justo y en qué contexto\n• Milagros puede compartir la experiencia de su hermana con todo el grupo como disparador (si quiere, no forzar)\n• Facundo: asignarle el rol de "abogado del diablo" en el debate — que busque las fallas de cada criterio\n• Cierre: "Si fueras legislador y tuvieras que escribir UNA ley sobre equidad, ¿qué diría?" Cada alumno escribe la suya.',
  }),
  daysAgo(6)
);

console.log(
  'seed done: 2 teachers, 10 students, 4 courses, 9 activities, ' +
  `${ideas.length} ideas, 10 rich profiles, 5 activity summaries`
);
