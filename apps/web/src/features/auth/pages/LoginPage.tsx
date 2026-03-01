import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../hooks/useAuth';
import { LoginForm } from '../components/LoginForm';

export function LoginPage() {
  const { t } = useTranslation();
  const { login, isLoading, error } = useAuth();

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-brand">
          <h1 className="login-logo">{t('appName')}</h1>
        </div>
        <h2 className="login-title">{t('loginTitle')}</h2>
        <LoginForm onSubmit={login} error={error} loading={isLoading} />
      </div>
    </div>
  );
}
