import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';

export function useAuth() {
  const navigate = useNavigate();
  const {
    user,
    isAuthenticated,
    isLoading,
    error,
    login: storeLogin,
    logout: storeLogout,
    clearError,
  } = useAuthStore();

  const login = useCallback(
    async (email: string, password: string) => {
      await storeLogin(email, password);
      navigate('/dashboard');
    },
    [storeLogin, navigate],
  );

  const logout = useCallback(() => {
    storeLogout();
    navigate('/login');
  }, [storeLogout, navigate]);

  return { user, isAuthenticated, isLoading, error, login, logout, clearError };
}
