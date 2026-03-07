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
