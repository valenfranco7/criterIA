// (a) Enums
export type UserRole = 'teacher' | 'student';
export type ActivityStatus = 'draft' | 'active' | 'closed';
export type SessionStatus = 'not_started' | 'in_progress' | 'completed';
export type Phase = 'anchoring' | 'exploration' | 'tension' | 'consolidation';
export type MessageRole = 'student' | 'assistant' | 'system';

// (b) Entities

export interface User {
  id: string;
  role: UserRole;
  name: string;
  email: string;
  avatar_initials: string | null;
  created_at: string;
}

export interface Course {
  id: string;
  teacher_id: string;
  name: string;
  year_or_level: string;
  created_at: string;
}

export interface CourseStudent {
  course_id: string;
  student_id: string;
}

export interface ClassPlan {
  id: string;
  teacher_id: string;
  course_id: string;
  topics: string;
  student_age: number;
  additional_material: string | null;
  planned_content: string | null;
  created_at: string;
}

export interface ActivityConfig {
  initial_question?: string;
  success_criteria?: string;
  agent_tone?: string;
  reference_material?: string;
}

export interface Activity {
  id: string;
  teacher_id: string;
  course_id: string;
  class_plan_id: string | null;
  title: string;
  objective: string;
  topic: string;
  estimated_duration_minutes: number;
  status: ActivityStatus;
  config: ActivityConfig;
  created_at: string;
}

export interface ExtractedIdea {
  text: string;
  question_that_triggered_it: string | null;
}

export interface ActivitySession {
  id: string;
  activity_id: string;
  student_id: string;
  status: SessionStatus;
  current_phase: Phase;
  phase_turn_count: number;
  started_at: string | null;
  completed_at: string | null;
  session_summary: string | null;
  teacher_report: string | null;
  extracted_ideas: ExtractedIdea[];
}

export interface Message {
  id: string;
  session_id: string;
  turn_index: number;
  role: MessageRole;
  content: string;
  phase_at_turn: Phase | null;
  // opaque JSON
  analyzer_json: string | null;
  created_at: string;
}

export interface StudentIdea {
  id: string;
  student_id: string;
  course_id: string;
  activity_id: string | null;
  session_id: string | null;
  text: string;
  question_that_triggered_it: string | null;
  connections: string[];
  created_at: string;
}

export interface StudentProfile {
  student_id: string;
  summary: string;
  updated_at: string;
}

export interface ActivitySummary {
  id: string;
  activity_id: string;
  course_id: string;
  summary: string;
  understanding_avg: number | null;
  created_at: string;
}

// (c) Request bodies

export interface CreateCourseRequest {
  id: string;
  name: string;
  year_or_level: string;
  student_usernames: string[];
}

export interface CreateClassPlanRequest {
  course_id: string;
  topics: string;
  student_age: number;
  additional_material?: string;
}

export interface CreateActivityRequest {
  course_id: string;
  class_plan_id?: string | null;
  title: string;
  objective: string;
  topic: string;
  estimated_duration_minutes: number;
  config: ActivityConfig;
}

export type ProposedActivity = Omit<CreateActivityRequest, 'course_id'>;

export interface SendMessageRequest {
  content: string;
}

// (d) Response shapes

export interface MeResponse {
  user: User;
}

export interface ListCoursesResponse {
  courses: Course[];
}

export interface CourseDetailResponse {
  course: Course;
  students: User[];
}

export interface PlanClassResponse {
  class_plan: ClassPlan;
  proposed_activity: ProposedActivity;
}

export interface ListActivitiesResponse {
  pending: Activity[];
  active: Activity[];
  finished: Activity[];
}

export interface ActivityDetailResponse {
  activity: Activity;
  sessions: ActivitySession[];
  latest_summary: ActivitySummary | null;
}

export interface StudentSessionDetail {
  session: ActivitySession;
  activity: Activity;
  messages: Message[];
}

export interface TeacherStudentDetail {
  student: User;
  profile: StudentProfile;
  sessions: ActivitySession[];
}

export interface SessionTurnResponse {
  user_message: Message;
  assistant_message: Message;
  session: ActivitySession;
}

export interface CloseSessionResponse {
  session: ActivitySession;
}

export interface ListStudentActivitiesResponse {
  items: Array<{
    activity: Activity;
    session: ActivitySession | null;
  }>;
}

export interface ListStudentCoursesResponse {
  courses: Array<{
    course: Course;
    idea_count: number;
  }>;
}

export interface ListStudentIdeasResponse {
  ideas: StudentIdea[];
}

export interface ListConversationsResponse {
  items: Array<{
    session: ActivitySession;
    activity: Activity;
  }>;
}
