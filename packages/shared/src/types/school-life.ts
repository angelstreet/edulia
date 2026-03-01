import type { BaseEntity, TenantScoped } from './common';

export enum IncidentType {
  Behavior = 'behavior',
  Discipline = 'discipline',
  Positive = 'positive',
  Other = 'other',
}

export enum IncidentSeverity {
  Minor = 'minor',
  Moderate = 'moderate',
  Major = 'major',
}

export enum IncidentStatus {
  Open = 'open',
  Resolved = 'resolved',
  Escalated = 'escalated',
}

export enum SanctionType {
  Warning = 'warning',
  Detention = 'detention',
  Exclusion = 'exclusion',
  Other = 'other',
}

export enum ExitAuthorizationType {
  EarlyExit = 'early_exit',
  PermanentExitAuthorization = 'permanent_exit_authorization',
}

export interface Incident extends BaseEntity, TenantScoped {
  student_id: string;
  reported_by: string;
  date: string;
  type: IncidentType;
  severity: IncidentSeverity;
  description: string;
  action_taken: string | null;
  follow_up_date: string | null;
  status: IncidentStatus;
  parent_notified: boolean;
  attachments: string[];
}

export interface Sanction extends BaseEntity, TenantScoped {
  student_id: string;
  incident_id: string | null;
  type: SanctionType;
  description: string;
  date: string;
  duration: string | null;
  issued_by: string;
  parent_notified: boolean;
}

export interface ExitAuthorization extends BaseEntity, TenantScoped {
  student_id: string;
  type: ExitAuthorizationType;
  authorized_by: string;
  valid_from: string;
  valid_until: string | null;
  notes: string;
}
