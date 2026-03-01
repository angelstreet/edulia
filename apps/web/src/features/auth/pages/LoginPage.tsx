import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../hooks/useAuth';
import { LoginForm } from '../components/LoginForm';

export function LoginPage() {
  const { t } = useTranslation();
  const { login, isLoading, error } = useAuth();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-8">
        <div className="text-center mb-2">
          <h1 className="text-2xl font-extrabold text-primary">{t('appName')}</h1>
        </div>
        <h2 className="text-xl font-bold mb-6 text-center">{t('loginTitle')}</h2>
        <LoginForm onSubmit={login} error={error} loading={isLoading} />
      </div>
    </div>
  );
}
