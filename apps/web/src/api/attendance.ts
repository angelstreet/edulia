import client from './client';

export interface AttendanceRecordData {
  id: string;
  tenant_id: string;
  session_id: string;
  student_id: string;
  date: string;
  status: string; // present|absent|late|excused|sick
  late_minutes: number | null;
  reason: string | null;
  justified: boolean;
  justified_by: string | null;
  justified_at: string | null;
  recorded_by: string;
  created_at: string;
}

export interface BulkAttendanceItem {
  student_id: string;
  status: string;
  late_minutes?: number;
  reason?: string;
}

export function getAttendance(params: { session_id?: string; date?: string } = {}) {
  return client.get<AttendanceRecordData[]>('/v1/attendance', { params });
}

export function createAttendanceBulk(data: {
  session_id: string;
  date: string;
  records: BulkAttendanceItem[];
}) {
  return client.post<AttendanceRecordData[]>('/v1/attendance/bulk', data);
}

export function updateAttendance(id: string, data: { status?: string; late_minutes?: number; reason?: string; justified?: boolean }) {
  return client.put<AttendanceRecordData>(`/v1/attendance/${id}`, data);
}
