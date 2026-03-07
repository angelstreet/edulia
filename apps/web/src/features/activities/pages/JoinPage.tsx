import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { getLiveSession } from '../../../api/liveSessions';

export function JoinPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return;

    setLoading(true);
    setError(null);

    try {
      await getLiveSession(trimmed);
      navigate(`/session/${trimmed}/lobby`);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { status?: number } };
      if (axiosErr?.response?.status === 404) {
        setError(t('sessionNotFound', 'Session not found. Check the code and try again.'));
      } else {
        setError(t('error', 'An error occurred. Please try again.'));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh]">
      <div className="w-full max-w-sm flex flex-col gap-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold">{t('joinSession', 'Join Session')}</h1>
          <p className="text-muted-foreground mt-2">
            {t('enterJoinCode', 'Enter the 6-character code shown by your teacher:')}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            id="join-code"
            value={code}
            onChange={(e) =>
              setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))
            }
            maxLength={6}
            placeholder="AB3K7M"
            className="text-center text-2xl font-mono tracking-widest uppercase"
            autoFocus
            autoComplete="off"
            spellCheck={false}
          />

          {error && (
            <p className="text-sm text-destructive text-center">{error}</p>
          )}

          <Button
            type="submit"
            variant="primary"
            loading={loading}
            disabled={code.trim().length !== 6}
          >
            {t('joinSession', 'Join')} →
          </Button>
        </form>
      </div>
    </div>
  );
}
