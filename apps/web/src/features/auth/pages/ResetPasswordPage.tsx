import { useState, type FormEvent } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';
import { resetPassword } from '../../../api/auth';

export function ResetPasswordPage() {
  const { t } = useTranslation();
  const { token } = useParams<{ token: string }>();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
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
      await resetPassword(token, password);
      setDone(true);
    } catch {
      setError(t('resetPasswordError', 'Reset failed. The link may have expired.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-8">
        <h1 className="text-xl font-bold mb-6 text-center">{t('resetPasswordTitle', 'Set a new password')}</h1>
        {done ? (
          <>
            <div className="rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-700">
              {t('resetPasswordDone', 'Password updated. You can now log in.')}
            </div>
            <Link
              to="/login"
              className="mt-4 block text-center w-full"
            >
              <Button variant="primary" className="w-full">
                {t('login')}
              </Button>
            </Link>
          </>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {error && <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-destructive">{error}</div>}
            <Input
              id="password"
              type="password"
              label={t('newPassword', 'New password')}
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
              {t('save')}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
