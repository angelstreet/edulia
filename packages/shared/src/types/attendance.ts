import type { BaseEntity, TenantScoped } from './common';

export enum AttendanceStatus {
  Present = 'present',
  Absent = 'absent',
  Late = 'late',
  Excused = 'excused',
  Sick = 'sick',
}

export interface AttendanceRecord extends BaseEntity, TenantScoped {
  session_id: string;
  student_id: string;
  date: string;
  status: AttendanceStatus;
  late_minutes: number | null;
  reason: string | null;
  justified: boolean;
  justified_by: string | null;
  justified_at: string | null;
  justification_document_id: string | null;
  recorded_by: string;
}
