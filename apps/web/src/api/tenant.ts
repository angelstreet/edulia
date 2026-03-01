import client from './client';

export interface TenantData {
  id: string;
  name: string;
  slug: string;
  type: string;
  settings: TenantSettings;
  branding: TenantBranding;
}

export interface TenantSettings {
  timezone: string;
  locale: string;
  currency: string;
  enabled_modules: string[];
  academic_structure: string;
  grading_scale: number;
  grading_type: string;
  show_rank: boolean;
  show_class_average: boolean;
  attendance_mode: string;
  file_upload_max_mb: number;
  data_retention_years: number;
}

export interface TenantBranding {
  display_name: string;
  logo_url: string;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  login_welcome_text: string;
  footer_text: string;
  show_powered_by: boolean;
}

export function getTenant() {
  return client.get<TenantData>('/v1/tenant');
}

export function updateTenant(data: Partial<TenantData>) {
  return client.patch<TenantData>('/v1/tenant', data);
}

export function getSettings() {
  return client.get<TenantSettings>('/v1/tenant/settings');
}

export function updateSettings(data: Partial<TenantSettings>) {
  return client.patch<TenantSettings>('/v1/tenant/settings', data);
}
