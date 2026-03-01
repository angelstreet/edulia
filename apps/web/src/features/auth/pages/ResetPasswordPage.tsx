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
    <div className="login-page">
      <div className="login-card">
        <h1 className="login-title">{t('resetPasswordTitle', 'Set a new password')}</h1>
        {done ? (
          <>
            <div className="form-alert form-alert--success">
              {t('resetPasswordDone', 'Password updated. You can now log in.')}
            </div>
            <Link to="/login" className="btn btn--primary" style={{ display: 'block', textAlign: 'center', textDecoration: 'none', marginTop: 16 }}>
              {t('login')}
            </Link>
          </>
        ) : (
          <form onSubmit={handleSubmit} className="login-form">
            {error && <div className="form-alert form-alert--error">{error}</div>}
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
