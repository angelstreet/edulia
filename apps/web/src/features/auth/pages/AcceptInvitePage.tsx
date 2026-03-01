import { useState, type FormEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';
import { acceptInvite } from '../../../api/auth';

export function AcceptInvitePage() {
  const { t } = useTranslation();
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      setError(t('passwordMismatch', 'Passwords do not match.'));
      return;
    }
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      await acceptInvite(token, password);
      navigate('/login');
    } catch {
      setError(t('inviteError', 'Could not accept invitation. The link may have expired.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-8">
        <h1 className="text-xl font-bold mb-6 text-center">{t('acceptInviteTitle', 'Set your password')}</h1>
        <p className="text-sm text-muted-foreground mb-4">
          {t('acceptInviteHint', 'You have been invited to join Edulia. Choose a password to get started.')}
        </p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {error && <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-destructive">{error}</div>}
          <Input
            id="password"
            type="password"
            label={t('password')}
            value={password}
            onChange={(e) => setPassword(e.currentTarget.value)}
            required
            minLength={8}
            autoComplete="new-password"
          />
          <Input
            id="confirm"
            type="password"
            label={t('confirmPassword', 'Confirm password')}
            value={confirm}
            onChange={(e) => setConfirm(e.currentTarget.value)}
            required
            autoComplete="new-password"
          />
          <Button type="submit" variant="primary" loading={loading}>
            {t('submit')}
          </Button>
        </form>
      </div>
    </div>
  );
}
