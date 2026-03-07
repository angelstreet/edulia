import client from './client';

export interface LiveSession {
  id: string;
  tenant_id: string;
  activity_id: string;
  teacher_id: string;
  join_code: string;
  state: 'lobby' | 'active' | 'reveal' | 'finished';
  current_question_index: number;
  started_at: string | null;
  ended_at: string | null;
  created_at: string;
}

export function createLiveSession(activity_id: string) {
  return client.post<LiveSession>('/v1/sessions', { activity_id });
}

export function getLiveSession(join_code: string) {
  return client.get<LiveSession>(`/v1/sessions/${join_code}`);
}

export function finishLiveSession(join_code: string) {
  return client.post<LiveSession>(`/v1/sessions/${join_code}/finish`);
}
