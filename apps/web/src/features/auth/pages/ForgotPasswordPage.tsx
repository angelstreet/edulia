import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';
import { forgotPassword } from '../../../api/auth';

export function ForgotPasswordPage() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await forgotPassword(email);
      setSent(true);
    } catch {
      setError(t('forgotPasswordError', 'An error occurred. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <h1 className="login-title">{t('forgotPasswordTitle', 'Reset your password')}</h1>
        {sent ? (
          <div className="form-alert form-alert--success">
            {t('forgotPasswordSent', 'If an account exists with that email, you will receive a reset link.')}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="login-form">
            {error && <div className="form-alert form-alert--error">{error}</div>}
            <p className="form-hint">
              {t('forgotPasswordHint', 'Enter your email and we will send you a reset link.')}
            </p>
            <Input
              id="email"
              type="email"
              label={t('email')}
              value={email}
              onChange={(e) => setEmail(e.currentTarget.value)}
              required
              autoComplete="email"
            />
            <Button type="submit" variant="primary" loading={loading}>
              {t('submit')}
            </Button>
          </form>
        )}
        <div className="login-form-footer">
          <Link to="/login" className="link-muted">{t('backToLogin', 'Back to login')}</Link>
        </div>
      </div>
    </div>
  );
}
