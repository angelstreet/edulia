import client from './client';

export interface SessionData {
  id: string;
  subject_name: string;
  subject_color: string;
  group_name: string;
  teacher_name: string;
  room_name: string;
  day: number;
  start_time: string;
  end_time: string;
}

export function getSessions(params: { group_id?: string; teacher_id?: string; week?: string } = {}) {
  return client.get<{ data: SessionData[] }>('/v1/sessions', { params });
}
