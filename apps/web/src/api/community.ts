import client from './client';

export interface DirectoryUser {
  id: string;
  display_name: string;
  role: string;
  group_name: string | null;
}

export interface DelegateData {
  user_id: string;
  display_name: string;
  group_id: string;
  group_name: string;
}

export function getDirectory(params: { role?: string; group_id?: string; q?: string } = {}) {
  return client.get<DirectoryUser[]>('/v1/community/directory', { params });
}

export function getDelegates() {
  return client.get<DelegateData[]>('/v1/community/delegates');
}
