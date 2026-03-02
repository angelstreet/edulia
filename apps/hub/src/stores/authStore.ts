import { useSyncExternalStore } from 'react';

interface User { id: string; email: string; display_name?: string; role: string; }
interface AuthState { user: User | null; token: string | null; isAuthenticated: boolean; }

let state: AuthState = { user: null, token: null, isAuthenticated: false };
const listeners = new Set<() => void>();

function init() {
  const token = localStorage.getItem('hub_token');
  const raw = localStorage.getItem('hub_user');
  const user = raw ? JSON.parse(raw) : null;
  state = { user, token, isAuthenticated: !!token };
}
init();

function notify() { listeners.forEach(l => l()); }
function subscribe(cb: () => void) { listeners.add(cb); return () => listeners.delete(cb); }
function getSnapshot() { return state; }

export function setAuth(t: string, u: User) {
  state = { user: u, token: t, isAuthenticated: true };
  localStorage.setItem('hub_token', t);
  localStorage.setItem('hub_user', JSON.stringify(u));
  notify();
}

export function clearAuth() {
  state = { user: null, token: null, isAuthenticated: false };
  localStorage.removeItem('hub_token');
  localStorage.removeItem('hub_user');
  notify();
}

export function useAuth() {
  return useSyncExternalStore(subscribe, getSnapshot);
}
