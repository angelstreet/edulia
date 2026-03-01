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
    <div className="login-page">
      <div className="login-card">
        <h1 className="login-title">{t('acceptInviteTitle', 'Set your password')}</h1>
        <p className="form-hint">
          {t('acceptInviteHint', 'You have been invited to join EduCore. Choose a password to get started.')}
        </p>
        <form onSubmit={handleSubmit} className="login-form">
          {error && <div className="form-alert form-alert--error">{error}</div>}
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
