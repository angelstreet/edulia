// Enums

export enum TenantType {
  School = 'school',
  TutoringCenter = 'tutoring_center',
  Enterprise = 'enterprise',
}

export enum SubscriptionPlan {
  Free = 'free',
  Pro = 'pro',
  Enterprise = 'enterprise',
}

export enum Status {
  Active = 'active',
  Inactive = 'inactive',
  Suspended = 'suspended',
  Invited = 'invited',
}

export enum Gender {
  Male = 'male',
  Female = 'female',
  Other = 'other',
  Undisclosed = 'undisclosed',
}

export enum ScopeType {
  Tenant = 'tenant',
  Campus = 'campus',
  Group = 'group',
  Course = 'course',
}

export enum RelationshipType {
  Guardian = 'guardian',
  Manager = 'manager',
  Tutor = 'tutor',
  Mentor = 'mentor',
  EmergencyContact = 'emergency_contact',
}

export enum GroupType {
  Class = 'class',
  Section = 'section',
  Cohort = 'cohort',
  Team = 'team',
  TutoringGroup = 'tutoring_group',
}

export enum GroupRole {
  Member = 'member',
  Leader = 'leader',
  Teacher = 'teacher',
  Tutor = 'tutor',
}

export enum AcademicStructure {
  Trimester = 'trimester',
  Semester = 'semester',
}

export enum FileVisibility {
  Private = 'private',
  Group = 'group',
  Public = 'public',
}

export enum NotificationType {
  Info = 'info',
  Warning = 'warning',
  Action = 'action',
  Reminder = 'reminder',
}

export enum NotificationChannel {
  InApp = 'in_app',
  Email = 'email',
  Push = 'push',
  Sms = 'sms',
}

export enum ThreadType {
  Direct = 'direct',
  Group = 'group',
  Announcement = 'announcement',
}

export enum ParticipantRole {
  Sender = 'sender',
  Recipient = 'recipient',
  Cc = 'cc',
}

// Pagination

export interface PaginationParams {
  page: number;
  per_page: number;
}

export interface PaginationMeta {
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

// API Error

export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

// Common base fields

export interface BaseEntity {
  id: string;
  created_at: string;
  updated_at: string;
}

export interface TenantScoped {
  tenant_id: string;
}

// Address

export interface Address {
  street: string;
  city: string;
  zip: string;
  country: string;
  lat?: number;
  lng?: number;
}

// Tenant

export interface TenantSettings {
  timezone: string;
  locale: string;
  currency: string;
  enabled_modules: string[];
  academic_structure: AcademicStructure;
  grading_scale: number;
  grading_type: string;
  show_rank: boolean;
  show_class_average: boolean;
  attendance_mode: string;
  cancellation_policy_hours: number;
  file_upload_max_mb: number;
  personal_cloud_quota_mb: number;
  data_retention_years: number;
  auto_purge_enabled: boolean;
  virus_scan_mode: string;
}

export interface TenantBranding {
  display_name: string;
  logo_url: string;
  favicon_url: string;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  login_background_url: string;
  login_welcome_text: string;
  footer_text: string;
  show_powered_by: boolean;
  email_header_logo_url: string;
}

export interface Tenant extends BaseEntity {
  name: string;
  slug: string;
  type: TenantType;
  subscription_plan: SubscriptionPlan;
  settings: TenantSettings;
  branding: TenantBranding;
  custom_domain: string | null;
}

// Campus

export interface Campus extends BaseEntity, TenantScoped {
  name: string;
  address: Address;
  phone: string;
  email: string;
  is_default: boolean;
}

// Academic Year & Term

export interface AcademicYear extends BaseEntity, TenantScoped {
  name: string;
  start_date: string;
  end_date: string;
  is_current: boolean;
}

export interface Term extends BaseEntity {
  academic_year_id: string;
  name: string;
  start_date: string;
  end_date: string;
  order: number;
}

// Subject

export interface Subject extends BaseEntity, TenantScoped {
  code: string;
  name: string;
  color: string;
  description: string;
}
