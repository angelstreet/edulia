import { useCallback } from 'react';
import { useAuthStore } from '../stores/authStore';

export function usePermission() {
  const user = useAuthStore((s) => s.user);

  const hasPermission = useCallback(
    (code: string) => {
      if (!user) return false;
      if (user.role === 'admin') return true;
      return user.permissions.includes(code);
    },
    [user],
  );

  const hasRole = useCallback(
    (role: string) => {
      if (!user) return false;
      return user.role === role;
    },
    [user],
  );

  return { hasPermission, hasRole, role: user?.role ?? null };
}
