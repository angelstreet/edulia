import client from './client';

export interface DashboardStats {
  role: string;
  stats?: { key: string; label: string; value: number }[];
  attendance_today?: { present: number; absent: number };
  children?: { id: string; name: string; average: number; absences: number }[];
}

export const getDashboardStats = () => client.get<DashboardStats>('/v1/dashboard/stats');
