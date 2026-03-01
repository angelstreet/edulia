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
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-8">
        <h1 className="text-xl font-bold mb-6 text-center">{t('forgotPasswordTitle', 'Reset your password')}</h1>
        {sent ? (
          <div className="rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-700">
            {t('forgotPasswordSent', 'If an account exists with that email, you will receive a reset link.')}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {error && <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-destructive">{error}</div>}
            <p className="text-sm text-muted-foreground mb-2">
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
        <div className="text-center mt-4">
          <Link to="/login" className="text-sm text-primary hover:underline">{t('backToLogin', 'Back to login')}</Link>
        </div>
      </div>
    </div>
  );
}
