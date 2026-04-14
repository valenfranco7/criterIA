-- 1. users
CREATE TABLE users (
  id TEXT PRIMARY KEY,              -- username único (ej: "sofiam", "yairp")
  role TEXT NOT NULL CHECK (role IN ('teacher', 'student')),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  avatar_initials TEXT,
  created_at TEXT NOT NULL
);

-- 2. courses
CREATE TABLE courses (
  id TEXT PRIMARY KEY,              -- slug ("hist-3a")
  teacher_id TEXT NOT NULL REFERENCES users(id),
  name TEXT NOT NULL,
  year_or_level TEXT NOT NULL,
  created_at TEXT NOT NULL
);

-- 3. course_students
CREATE TABLE course_students (
  course_id TEXT NOT NULL REFERENCES courses(id),
  student_id TEXT NOT NULL REFERENCES users(id),
  PRIMARY KEY (course_id, student_id)
);

-- 4. class_plans
CREATE TABLE class_plans (
  id TEXT PRIMARY KEY,
  teacher_id TEXT NOT NULL REFERENCES users(id),
  course_id TEXT NOT NULL REFERENCES courses(id),
  topics TEXT NOT NULL,
  student_age INTEGER NOT NULL,
  additional_material TEXT,
  planned_content TEXT,
  created_at TEXT NOT NULL
);

-- 5. activities
CREATE TABLE activities (
  id TEXT PRIMARY KEY,
  teacher_id TEXT NOT NULL REFERENCES users(id),
  course_id TEXT NOT NULL REFERENCES courses(id),
  class_plan_id TEXT REFERENCES class_plans(id),
  title TEXT NOT NULL,
  objective TEXT NOT NULL,
  topic TEXT NOT NULL,
  estimated_duration_minutes INTEGER NOT NULL DEFAULT 30,
  status TEXT NOT NULL CHECK (status IN ('draft', 'active', 'closed')),
  config TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL
);

-- 6. activity_sessions
CREATE TABLE activity_sessions (
  id TEXT PRIMARY KEY,
  activity_id TEXT NOT NULL REFERENCES activities(id),
  student_id TEXT NOT NULL REFERENCES users(id),
  status TEXT NOT NULL CHECK (status IN ('not_started', 'in_progress', 'completed')),
  current_phase TEXT NOT NULL CHECK (current_phase IN ('anchoring', 'exploration', 'tension', 'consolidation')),
  phase_turn_count INTEGER NOT NULL DEFAULT 0,
  started_at TEXT,
  completed_at TEXT,
  session_summary TEXT,
  teacher_report TEXT,
  extracted_ideas TEXT DEFAULT '[]'
);
CREATE INDEX idx_sessions_by_student ON activity_sessions(student_id);
CREATE INDEX idx_sessions_by_activity ON activity_sessions(activity_id);

-- 7. messages
CREATE TABLE messages (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES activity_sessions(id),
  turn_index INTEGER NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('student', 'assistant', 'system')),
  content TEXT NOT NULL,
  phase_at_turn TEXT,
  analyzer_json TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX idx_messages_by_session ON messages(session_id, turn_index);

-- 8. student_ideas
CREATE TABLE student_ideas (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL REFERENCES users(id),
  course_id TEXT NOT NULL REFERENCES courses(id),
  activity_id TEXT REFERENCES activities(id),
  session_id TEXT REFERENCES activity_sessions(id),
  text TEXT NOT NULL,
  question_that_triggered_it TEXT,
  connections TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL
);
CREATE INDEX idx_ideas_by_student_course ON student_ideas(student_id, course_id);

-- 9. student_profiles
CREATE TABLE student_profiles (
  student_id TEXT PRIMARY KEY REFERENCES users(id),
  summary TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL
);

-- 10. activity_summaries
CREATE TABLE activity_summaries (
  id TEXT PRIMARY KEY,
  activity_id TEXT NOT NULL REFERENCES activities(id),
  course_id TEXT NOT NULL REFERENCES courses(id),
  summary TEXT NOT NULL,
  understanding_avg REAL,
  created_at TEXT NOT NULL
);
