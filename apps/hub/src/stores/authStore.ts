import { useSyncExternalStore } from 'react';

interface User { id: string; email: string; display_name?: string; role: string; }

let user: User | null = null;
let token: string | null = null;
const listeners = new Set<() => void>();

function init() {
  token = localStorage.getItem('hub_token');
  const raw = localStorage.getItem('hub_user');
  user = raw ? JSON.parse(raw) : null;
}
init();

function notify() { listeners.forEach(l => l()); }

export function setAuth(t: string, u: User) {
  token = t; user = u;
  localStorage.setItem('hub_token', t);
  localStorage.setItem('hub_user', JSON.stringify(u));
  notify();
}

export function clearAuth() {
  token = null; user = null;
  localStorage.removeItem('hub_token');
  localStorage.removeItem('hub_user');
  notify();
}

export function useAuth() {
  return useSyncExternalStore(
    (cb) => { listeners.add(cb); return () => listeners.delete(cb); },
    () => ({ user, token, isAuthenticated: !!token }),
  );
}
