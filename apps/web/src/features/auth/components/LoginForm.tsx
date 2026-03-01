import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';

interface LoginFormProps {
  onSubmit: (email: string, password: string) => Promise<void>;
  error: string | null;
  loading: boolean;
}

export function LoginForm({ onSubmit, error, loading }: LoginFormProps) {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit(email, password);
  };

  return (
    <form onSubmit={handleSubmit} className="login-form">
      {error && <div className="form-alert form-alert--error">{t(error, error)}</div>}
      <Input
        id="email"
        type="email"
        label={t('email')}
        value={email}
        onChange={(e) => setEmail(e.currentTarget.value)}
        required
        autoComplete="email"
        placeholder="nom@example.com"
      />
      <Input
        id="password"
        type="password"
        label={t('password')}
        value={password}
        onChange={(e) => setPassword(e.currentTarget.value)}
        required
        autoComplete="current-password"
      />
      <div className="login-form-options">
        <Link to="/forgot-password" className="link-muted">
          {t('forgotPassword')}
        </Link>
      </div>
      <Button type="submit" variant="primary" loading={loading}>
        {t('login')}
      </Button>
    </form>
  );
}
