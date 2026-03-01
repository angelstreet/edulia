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

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await onSubmit(email, password);
    } catch {
      // error is handled by the store
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {error && <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-destructive">{t(error, error)}</div>}
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
      <div className="flex justify-end">
        <Link to="/forgot-password" className="text-sm text-primary hover:underline">
          {t('forgotPassword')}
        </Link>
      </div>
      <Button type="submit" variant="primary" loading={loading}>
        {t('login')}
      </Button>
    </form>
  );
}
