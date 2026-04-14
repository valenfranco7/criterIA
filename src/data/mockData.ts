// ===== MOCK DATA =====

export const teacherName = "Yair";
export const studentName = "Sofía";

export const courses = [
  {
    id: "hist-3a",
    name: "Historia 3ro A",
    students: 28,
    lastActivity: "Revolución de Mayo",
    nextClass: "Miércoles 14/05, 10:00hs",
  },
  {
    id: "ciud-4b",
    name: "Ciudadanía 4to B",
    students: 31,
    lastActivity: "Derechos Humanos",
    nextClass: "Jueves 15/05, 14:00hs",
  },
  {
    id: "hist-2c",
    name: "Historia 2do C",
    students: 25,
    lastActivity: "Pueblos originarios",
    nextClass: "Viernes 16/05, 8:00hs",
  },
  {
    id: "ciud-3a",
    name: "Ciudadanía 3ro A",
    students: 28,
    lastActivity: "Participación ciudadana",
    nextClass: "Lunes 19/05, 11:00hs",
  },
];

export const students = [
  { id: "s1", name: "Sofía Martínez", avatar: "SM", progress: 85, lastActivity: "Revolución de Mayo", status: "active" },
  { id: "s2", name: "Mateo López", avatar: "ML", progress: 72, lastActivity: "Causas de la revolución", status: "needs-attention" },
  { id: "s3", name: "Valentina García", avatar: "VG", progress: 91, lastActivity: "Revolución de Mayo", status: "active" },
  { id: "s4", name: "Thiago Rodríguez", avatar: "TR", progress: 45, lastActivity: "Virreinato", status: "needs-attention" },
  { id: "s5", name: "Camila Fernández", avatar: "CF", progress: 78, lastActivity: "Revolución de Mayo", status: "active" },
  { id: "s6", name: "Benjamín Díaz", avatar: "BD", progress: 65, lastActivity: "Causas de la revolución", status: "active" },
  { id: "s7", name: "Emma Sánchez", avatar: "ES", progress: 88, lastActivity: "Revolución de Mayo", status: "active" },
  { id: "s8", name: "Lautaro Pérez", avatar: "LP", progress: 52, lastActivity: "Virreinato", status: "needs-attention" },
];

export const activities = {
  pending: [
    {
      id: "a1",
      title: "La Revolución de Mayo desde tu mirada",
      course: "Historia 3ro A",
      courseId: "hist-3a",
      datePlanned: "14/05/2026",
      completed: 0,
      total: 28,
      objective: "Que los alumnos reconstruyan las motivaciones de los criollos en 1810 a partir de preguntas guiadas.",
      duration: "30 min",
    },
    {
      id: "a2",
      title: "¿Qué significa tener derechos?",
      course: "Ciudadanía 4to B",
      courseId: "ciud-4b",
      datePlanned: "15/05/2026",
      completed: 0,
      total: 31,
      objective: "Explorar el concepto de derechos desde la experiencia personal del alumno.",
      duration: "25 min",
    },
  ],
  active: [
    {
      id: "a3",
      title: "Pensá como un historiador",
      course: "Historia 2do C",
      courseId: "hist-2c",
      datePlanned: "12/05/2026",
      completed: 18,
      total: 25,
      objective: "Introducir el pensamiento crítico histórico mediante análisis de fuentes.",
      duration: "35 min",
    },
  ],
  finished: [
    {
      id: "a4",
      title: "El origen de las ciudades",
      course: "Historia 2do C",
      courseId: "hist-2c",
      datePlanned: "05/05/2026",
      completed: 25,
      total: 25,
      objective: "Comprender por qué surgen las primeras ciudades.",
      duration: "30 min",
    },
    {
      id: "a5",
      title: "Participar, ¿para qué?",
      course: "Ciudadanía 3ro A",
      courseId: "ciud-3a",
      datePlanned: "02/05/2026",
      completed: 26,
      total: 28,
      objective: "Reflexionar sobre el valor de la participación ciudadana.",
      duration: "25 min",
    },
  ],
};

export const studentProfile = {
  id: "s1",
  name: "Sofía Martínez",
  summary:
    "Sofía tiene una forma de pensar muy visual: conecta ideas a través de imágenes y analogías espaciales. Le interesan las historias de personas concretas más que los procesos abstractos. Cuando se traba, suele ser porque intenta encontrar una lógica causal lineal donde hay multicausalidad. Las analogías con situaciones cotidianas le funcionan muy bien: la última vez que comparamos el Cabildo con una asamblea de su club, hizo click inmediato. Necesita que le devuelvan sus propias ideas reformuladas para avanzar.",
  activities: [
    {
      id: "sa1",
      title: "La Revolución de Mayo desde tu mirada",
      date: "12/05/2026",
      summaryText:
        "Sofía logró articular por qué los criollos se sentían excluidos. Usó la analogía de 'sentirse de afuera en tu propia casa'. Necesitó tres preguntas para distinguir entre exclusión social y exclusión política.",
      conversation: [
        { role: "agent", text: "Antes de meternos en la Revolución de Mayo, contame: ¿qué te imaginás que sentía un criollo en 1810 que no podía ocupar cargos importantes solo por haber nacido en América?" },
        { role: "student", text: "Supongo que se sentían re mal, como que no los valoraban" },
        { role: "agent", text: "Interesante. ¿Podrías pensar en una situación de tu vida donde sentiste que no te dejaban participar de algo que sentías que te correspondía?" },
        { role: "student", text: "Sí, una vez en el club no me dejaron jugar un torneo porque era nueva, aunque jugaba mejor que otras" },
        { role: "agent", text: "Buena analogía. Ahora, ¿qué diferencia ves entre que no te dejen jugar por ser nueva y que a los criollos no los dejen gobernar por haber nacido en América?" },
        { role: "student", text: "Hmm, lo mío era temporal, en algún momento iba a poder. Pero los criollos nunca iban a poder, porque no podían cambiar dónde nacieron" },
        { role: "agent", text: "Exacto. Esa es una distinción muy importante. No era solo exclusión: era una exclusión que no tenía solución dentro del sistema. ¿Qué opciones les quedaban entonces?" },
        { role: "student", text: "Cambiar el sistema... o sea, eso es lo que hicieron con la revolución, ¿no?" },
        { role: "agent", text: "Eso es lo que vos acabás de deducir. Llegaste sola a una de las claves de por qué pasan las revoluciones: cuando el sistema no tiene mecanismos para incluir a quienes excluye, la presión crece hasta que el sistema se rompe. ¿Podés pensar en otro ejemplo histórico o actual donde pase algo parecido?" },
      ],
    },
    {
      id: "sa2",
      title: "Pensá como un historiador",
      date: "05/05/2026",
      summaryText:
        "Trabajó bien con fuentes primarias. Le costó distinguir entre hecho y interpretación al principio, pero cuando se le pidió que comparara dos relatos sobre el mismo evento, lo entendió de inmediato.",
      conversation: [
        { role: "agent", text: "Si encontrás un diario de 1810 y un libro de historia de 2020 que cuentan lo mismo pero distinto, ¿cuál tiene razón?" },
        { role: "student", text: "El libro de historia, porque tiene más información" },
        { role: "agent", text: "¿Y si te digo que el diario fue escrito por alguien que estuvo ahí, viviendo lo que cuenta?" },
        { role: "student", text: "Ah, pero ese sabe lo que se sentía... pero capaz no ve todo el panorama" },
        { role: "agent", text: "Exactamente. Acabás de descubrir algo fundamental: ninguna fuente 'tiene razón' por sí sola. Cada una aporta algo distinto. ¿Qué aporta cada una?" },
      ],
    },
  ],
};

export const socraticChat = [
  { role: "agent" as const, text: "Antes de meternos en la Revolución de Mayo, contame: ¿qué te imaginás que sentía un criollo en 1810 que no podía ocupar cargos importantes solo por haber nacido en América?" },
  { role: "student" as const, text: "Supongo que se sentían re mal, como que no los valoraban" },
  { role: "agent" as const, text: "Interesante. ¿Podrías pensar en una situación de tu vida donde sentiste que no te dejaban participar de algo que sentías que te correspondía?" },
  { role: "student" as const, text: "Sí, una vez en el club no me dejaron jugar un torneo porque era nueva, aunque jugaba mejor que otras" },
  { role: "agent" as const, text: "Buena analogía. Ahora, ¿qué diferencia ves entre que no te dejen jugar por ser nueva y que a los criollos no los dejen gobernar por haber nacido en América?" },
  { role: "student" as const, text: "Hmm, lo mío era temporal, en algún momento iba a poder. Pero los criollos nunca iban a poder, porque no podían cambiar dónde nacieron" },
  { role: "agent" as const, text: "Exacto. Esa es una distinción muy importante. No era solo exclusión: era una exclusión que no tenía solución dentro del sistema. ¿Qué opciones les quedaban entonces?" },
  { role: "student" as const, text: "Cambiar el sistema... o sea, eso es lo que hicieron con la revolución, ¿no?" },
];

export const studentIdeas = [
  {
    id: "i1",
    text: "Las revoluciones pasan cuando el sistema no tiene forma de incluir a los que excluye",
    activity: "La Revolución de Mayo desde tu mirada",
    course: "Historia 3ro A",
    date: "12/05/2026",
    question: "¿Qué opciones les quedaban a los criollos?",
    connections: ["i3", "i5"],
  },
  {
    id: "i2",
    text: "Ninguna fuente histórica 'tiene razón' por sí sola, cada una aporta algo distinto",
    activity: "Pensá como un historiador",
    course: "Historia 2do C",
    date: "05/05/2026",
    question: "¿Cuál tiene razón, el diario o el libro de historia?",
    connections: [],
  },
  {
    id: "i3",
    text: "La exclusión política es peor cuando no tiene solución dentro del sistema",
    activity: "La Revolución de Mayo desde tu mirada",
    course: "Historia 3ro A",
    date: "12/05/2026",
    question: "¿Qué diferencia entre tu situación y la de los criollos?",
    connections: ["i1", "i5"],
  },
  {
    id: "i4",
    text: "Los derechos no existen solos, alguien tuvo que pelearlos",
    activity: "¿Qué significa tener derechos?",
    course: "Ciudadanía 4to B",
    date: "28/04/2026",
    question: "¿Los derechos siempre existieron?",
    connections: ["i1"],
  },
  {
    id: "i5",
    text: "Participar no es solo votar, es poder cambiar las reglas",
    activity: "Participar, ¿para qué?",
    course: "Ciudadanía 3ro A",
    date: "02/05/2026",
    question: "¿Qué significa realmente participar?",
    connections: ["i1", "i3"],
  },
];

export const studentConversations = [
  { id: "c1", title: "La Revolución de Mayo desde tu mirada", course: "Historia 3ro A", date: "12/05/2026", messages: socraticChat.length },
  { id: "c2", title: "Pensá como un historiador", course: "Historia 2do C", date: "05/05/2026", messages: 5 },
  { id: "c3", title: "Participar, ¿para qué?", course: "Ciudadanía 3ro A", date: "02/05/2026", messages: 7 },
  { id: "c4", title: "¿Qué significa tener derechos?", course: "Ciudadanía 4to B", date: "28/04/2026", messages: 6 },
];

export const curricularPlan = [
  {
    unit: 1,
    title: "El mundo colonial americano",
    subtopics: ["El sistema colonial español", "Virreinato del Río de la Plata", "Sociedad colonial: castas y jerarquías", "Economía colonial y monopolio comercial"],
  },
  {
    unit: 2,
    title: "Crisis del orden colonial",
    subtopics: ["Reformas borbónicas", "Invasiones inglesas", "Ideas de la Ilustración en América", "Napoleón y la crisis de la monarquía española"],
  },
  {
    unit: 3,
    title: "Revolución e independencia",
    subtopics: ["Semana de Mayo", "Primera Junta y conflictos internos", "Campañas militares", "Declaración de independencia 1816"],
  },
  {
    unit: 4,
    title: "Construcción del Estado nacional",
    subtopics: ["Unitarios y federales", "Época de Rosas", "Batalla de Caseros", "Constitución de 1853"],
  },
];
