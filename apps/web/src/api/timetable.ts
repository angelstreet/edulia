import client from './client';

export interface RoomData {
  id: string;
  tenant_id: string;
  name: string;
  campus_id: string | null;
  capacity: number | null;
  equipment: string[];
  created_at: string;
}

export interface SessionData {
  id: string;
  tenant_id: string;
  academic_year_id: string | null;
  group_id: string;
  subject_id: string;
  teacher_id: string;
  room_id: string | null;
  day_of_week: number;
  start_time: string;
  end_time: string;
  recurrence: string;
  effective_from: string | null;
  effective_until: string | null;
  status: string;
  created_at: string;
}

export interface SessionExceptionData {
  id: string;
  session_id: string;
  date: string;
  exception_type: string;
  substitute_teacher_id: string | null;
  new_room_id: string | null;
  new_start_time: string | null;
  new_end_time: string | null;
  reason: string | null;
  created_by: string;
  created_at: string;
}

export function getSessions(params: { group_id?: string; teacher_id?: string; day_of_week?: number } = {}) {
  return client.get<SessionData[]>('/v1/timetable/sessions', { params });
}

export function createSession(data: Omit<SessionData, 'id' | 'tenant_id' | 'status' | 'created_at'>) {
  return client.post<SessionData>('/v1/timetable/sessions', data);
}

export function updateSession(id: string, data: Partial<SessionData>) {
  return client.patch<SessionData>(`/v1/timetable/sessions/${id}`, data);
}

export function deleteSession(id: string) {
  return client.delete(`/v1/timetable/sessions/${id}`);
}

export function getRooms() {
  return client.get<RoomData[]>('/v1/timetable/rooms');
}

export function createRoom(data: { name: string; campus_id?: string; capacity?: number; equipment?: string[] }) {
  return client.post<RoomData>('/v1/timetable/rooms', data);
}

export function createSessionException(data: {
  session_id: string;
  date: string;
  exception_type: string;
  substitute_teacher_id?: string;
  new_room_id?: string;
  new_start_time?: string;
  new_end_time?: string;
  reason?: string;
}) {
  return client.post<SessionExceptionData>('/v1/timetable/session-exceptions', data);
}
