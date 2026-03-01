import type { BaseEntity, TenantScoped } from './common';

export enum CalendarEventType {
  Holiday = 'holiday',
  ExamPeriod = 'exam_period',
  Meeting = 'meeting',
  Event = 'event',
  Deadline = 'deadline',
}

export enum TargetAudience {
  All = 'all',
  Staff = 'staff',
  Students = 'students',
  Parents = 'parents',
  Group = 'group',
}

export interface CalendarEvent extends BaseEntity, TenantScoped {
  title: string;
  description: string;
  type: CalendarEventType;
  start_date: string;
  end_date: string;
  all_day: boolean;
  target_audience: TargetAudience;
  target_group_id: string | null;
  recurrence_rule: string | null;
  location: string | null;
  created_by: string;
}
