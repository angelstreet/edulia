import client from './client';

export interface UserListParams {
  page?: number;
  per_page?: number;
  role?: string;
  q?: string;
  status?: string;
}

export interface UserData {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  display_name: string;
  avatar_url: string | null;
  role: string;
  status: string;
  last_login_at: string | null;
  created_at: string;
}

export interface PaginatedUsers {
  items: UserData[];
  total: number;
  page: number;
  page_size: number;
}

export interface CreateUserPayload {
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  campus_id?: string;
}

export function getUsers(params: UserListParams = {}) {
  return client.get<PaginatedUsers>('/v1/users', { params });
}

export function getUser(id: string) {
  return client.get<UserData>(`/v1/users/${id}`);
}

export function createUser(data: CreateUserPayload) {
  return client.post<UserData>('/v1/users', data);
}

export function updateUser(id: string, data: Partial<CreateUserPayload>) {
  return client.patch<UserData>(`/v1/users/${id}`, data);
}

export function deleteUser(id: string) {
  return client.delete(`/v1/users/${id}`);
}
