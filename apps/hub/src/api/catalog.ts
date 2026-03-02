import client from './client';

export interface Platform {
  id: string; name: string; slug: string; url: string; logo_url?: string;
  description?: string; is_free: boolean; has_certificates: boolean;
  languages: string[]; categories: string[]; course_count: number;
}

export interface Course {
  id: string; platform_id: string; platform_name?: string; title: string;
  url: string; description?: string; difficulty: string; format: string;
  language: string; duration_hours?: number; is_free: boolean;
  has_certificate: boolean; tags: string[]; category: string; image_url?: string;
}

export const getPlatforms = () => client.get<Platform[]>('/v1/catalog/platforms');
export const getPlatform = (slug: string) => client.get<Platform>(`/v1/catalog/platforms/${slug}`);
export const getCourses = (params?: Record<string, string>) => client.get<Course[]>('/v1/catalog/courses', { params });
export const getCourse = (id: string) => client.get<Course>(`/v1/catalog/courses/${id}`);
