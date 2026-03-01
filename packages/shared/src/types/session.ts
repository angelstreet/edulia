import type { BaseEntity, TenantScoped } from './common';

export enum SessionRecurrence {
  Weekly = 'weekly',
  Biweekly = 'biweekly',
  Custom = 'custom',
}

export enum SessionStatus {
  Active = 'active',
  Cancelled = 'cancelled',
  Substituted = 'substituted',
}

export enum SessionExceptionType {
  Cancelled = 'cancelled',
  Substituted = 'substituted',
  RoomChange = 'room_change',
  TimeChange = 'time_change',
}

export interface Session extends BaseEntity, TenantScoped {
  academic_year_id: string;
  group_id: string;
  subject_id: string;
  teacher_id: string;
  room_id: string | null;
  day_of_week: number;
  start_time: string;
  end_time: string;
  recurrence: SessionRecurrence;
  effective_from: string;
  effective_until: string;
  status: SessionStatus;
}

export interface Room extends BaseEntity, TenantScoped {
  campus_id: string;
  name: string;
  capacity: number;
  equipment: string[];
}

export interface SessionException extends BaseEntity {
  session_id: string;
  date: string;
  exception_type: SessionExceptionType;
  substitute_teacher_id: string | null;
  new_room_id: string | null;
  new_start_time: string | null;
  new_end_time: string | null;
  reason: string;
  created_by: string;
}
