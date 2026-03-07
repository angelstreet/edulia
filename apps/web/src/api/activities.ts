import client from './client';

export interface QuestionChoice {
  id: string;
  text: string;
  is_correct: boolean;
}

export interface Question {
  id: string;
  text: string;
  type: 'single' | 'multi' | 'open';
  choices: QuestionChoice[];
  time_limit_s: number | null;
  points: number;
}

export interface ActivityData {
  id: string;
  tenant_id: string;
  created_by: string;
  title: string;
  description: string | null;
  type: 'qcm' | 'poll' | 'game';
  status: 'draft' | 'published' | 'closed';
  questions: Question[];
  group_id: string | null;
  subject_id: string | null;
  scheduled_at: string | null;
  replay_deadline: string | null;
  created_at: string;
}

export interface ActivityCreate {
  title: string;
  description?: string;
  type?: string;
  group_id?: string;
  subject_id?: string;
  questions?: Omit<Question, never>[];
  scheduled_at?: string;
}

export function getActivities(params?: { group_id?: string; subject_id?: string }) {
  return client.get<ActivityData[]>('/v1/activities', { params });
}

export function getActivity(id: string) {
  return client.get<ActivityData>(`/v1/activities/${id}`);
}

export function createActivity(data: ActivityCreate) {
  return client.post<ActivityData>('/v1/activities', data);
}

export function updateActivity(id: string, patch: Partial<ActivityCreate> & { status?: string }) {
  return client.patch<ActivityData>(`/v1/activities/${id}`, patch);
}

export function deleteActivity(id: string) {
  return client.delete(`/v1/activities/${id}`);
}

// ── Feature 2: Attempt + Auto-Scoring ────────────────────────────────────────

export interface AnswerInput {
  question_id: string;
  choice_ids: string[];
  text?: string;
  answered_at_ms?: number;
}

export interface QuestionResult {
  question_id: string;
  correct: boolean;
  correct_choice_ids: string[];
  points_earned: number;
}

export interface AttemptResult {
  id: string;
  activity_id: string;
  student_id: string;
  mode: string;
  started_at: string;
  submitted_at: string | null;
  answers: AnswerInput[];
  score: number | null;
  max_score: number | null;
  scored_at: string | null;
  question_results: QuestionResult[] | null;
}

export interface AttemptStartResponse {
  attempt_id: string;
  activity: ActivityData; // questions have NO is_correct field
}

export function startAttempt(activityId: string) {
  return client.post<AttemptStartResponse>(`/v1/activities/${activityId}/attempt/start`);
}

export function submitAttempt(activityId: string, attemptId: string, answers: AnswerInput[]) {
  return client.post<AttemptResult>(`/v1/activities/${activityId}/attempt/${attemptId}/submit`, { answers });
}

export function getMyAttempt(activityId: string) {
  return client.get<AttemptResult>(`/v1/activities/${activityId}/attempt/my`);
}

export function getAllAttempts(activityId: string) {
  return client.get<AttemptResult[]>(`/v1/activities/${activityId}/attempts`);
}

// ── Feature 3: Teacher Auto-Reporting Dashboard ───────────────────────────────

export interface QuestionErrorRate {
  question_id: string;
  question_text: string;
  error_rate: number; // 0.0 to 1.0
}

export interface ActivityReport {
  id: string;
  title: string;
  type: string;
  status: string;
  group_id: string | null;
  subject_id: string | null;
  created_at: string;
  total_attempts: number;
  avg_score: number | null;
  max_score: number | null;
  completion_rate: number; // 0.0 to 1.0
  question_error_rates: QuestionErrorRate[];
}

export interface StudentActivityScore {
  activity_id: string;
  activity_title: string;
  score: number | null;
  max_score: number | null;
  submitted_at: string | null;
  mode: string;
}

export interface StudentReport {
  student_id: string;
  attempts: StudentActivityScore[];
  avg_score: number | null;
  total_submitted: number;
}

export function getActivityReports() {
  return client.get<ActivityReport[]>('/v1/activities/report');
}

export function getActivityReport(activityId: string) {
  return client.get<ActivityReport>(`/v1/activities/${activityId}/report`);
}

export function getStudentReport(studentId: string) {
  return client.get<StudentReport>(`/v1/students/${studentId}/activity-scores`);
}
