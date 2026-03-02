import client from './client';

export interface UserInfo {
  id: string; email: string; first_name: string; last_name: string;
  display_name?: string; role: string;
}

export interface AuthResponse {
  access_token: string; refresh_token: string; user: UserInfo;
}

export const register = (data: { email: string; password: string; first_name: string; last_name: string }) =>
  client.post<AuthResponse>('/v1/auth/register', data);

export const login = (data: { email: string; password: string }) =>
  client.post<AuthResponse>('/v1/auth/login', data);
