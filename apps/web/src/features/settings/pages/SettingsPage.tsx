import { useTranslation } from 'react-i18next';
import { Card } from '../../../components/ui/Card';

export function SettingsPage() {
  const { t } = useTranslation();

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">{t('settings')}</h1>
      <Card title={t('profile')}>
        <p className="text-sm text-muted-foreground">{t('settingsPlaceholder', 'Settings will be available here.')}</p>
      </Card>
    </div>
  );
}
