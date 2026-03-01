import type { BaseEntity, TenantScoped } from './common';

export enum TutoringSessionType {
  Individual = 'individual',
  Group = 'group',
}

export enum TutoringLocation {
  Online = 'online',
  InPerson = 'in_person',
  Hybrid = 'hybrid',
}

export enum TutoringSessionStatus {
  Scheduled = 'scheduled',
  Confirmed = 'confirmed',
  Completed = 'completed',
  Cancelled = 'cancelled',
  NoShow = 'no_show',
}

export enum PackageType {
  Hours = 'hours',
  Sessions = 'sessions',
  Subscription = 'subscription',
}

export enum StudentPackageStatus {
  Active = 'active',
  Expired = 'expired',
  Exhausted = 'exhausted',
  Cancelled = 'cancelled',
}

export enum LearningPlanStatus {
  Active = 'active',
  Completed = 'completed',
  Paused = 'paused',
}

export enum ProgressRating {
  Struggling = 'struggling',
  Improving = 'improving',
  OnTrack = 'on_track',
  Exceeding = 'exceeding',
}

export interface AvailabilitySlot {
  day: number;
  start: string;
  end: string;
}

export interface TutorProfile extends BaseEntity {
  user_id: string;
  tenant_id: string;
  subjects: string[];
  bio: string;
  hourly_rate: number | null;
  group_rate: number | null;
  availability_default: AvailabilitySlot[];
  max_students: number | null;
  experience_years: number | null;
  qualifications: string | null;
}

export interface TutoringSession extends BaseEntity, TenantScoped {
  tutor_id: string;
  student_id: string;
  subject_id: string | null;
  group_id: string | null;
  type: TutoringSessionType;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  location: TutoringLocation;
  location_details: string | null;
  recurrence_rule: string | null;
  recurrence_group_id: string | null;
  status: TutoringSessionStatus;
  cancelled_by: string | null;
  cancellation_reason: string | null;
  cancelled_at: string | null;
  notes: string | null;
}

export interface Package extends BaseEntity, TenantScoped {
  name: string;
  type: PackageType;
  total_hours: number | null;
  total_sessions: number | null;
  price: number;
  currency: string;
  validity_days: number | null;
  is_active: boolean;
}

export interface StudentPackage extends BaseEntity {
  package_id: string;
  student_id: string;
  purchased_at: string;
  expires_at: string | null;
  hours_remaining: number | null;
  sessions_remaining: number | null;
  status: StudentPackageStatus;
}

export interface LearningPlan extends BaseEntity, TenantScoped {
  student_id: string;
  tutor_id: string;
  subject_id: string;
  title: string;
  goals: string;
  start_date: string;
  target_date: string | null;
  status: LearningPlanStatus;
}

export interface LearningPlanEntry {
  id: string;
  plan_id: string;
  date: string;
  session_id: string | null;
  notes: string;
  progress_rating: ProgressRating;
  next_steps: string;
  created_at: string;
}
