import client from './client';

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  user: {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    display_name: string;
    avatar_url: string | null;
    role: string;
    permissions: string[];
    tenant_id: string;
  };
}

export function login(email: string, password: string) {
  return client.post<LoginResponse>('/v1/auth/login', { email, password });
}

export function refresh(refreshToken: string) {
  return client.post<{ access_token: string; refresh_token?: string }>(
    '/v1/auth/refresh',
    { refresh_token: refreshToken },
  );
}

export function forgotPassword(email: string) {
  return client.post('/v1/auth/forgot-password', { email });
}

export function resetPassword(token: string, password: string) {
  return client.post('/v1/auth/reset-password', { token, new_password: password });
}

export function acceptInvite(token: string, password: string) {
  return client.post('/v1/auth/invite/accept', { token, password });
}
