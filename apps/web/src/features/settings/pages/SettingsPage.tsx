import { useTranslation } from 'react-i18next';
import { Card } from '../../../components/ui/Card';

export function SettingsPage() {
  const { t } = useTranslation();

  return (
    <div className="settings-page">
      <h1>{t('settings')}</h1>
      <Card title={t('profile')}>
        <p className="text-muted">{t('settingsPlaceholder', 'Settings will be available here.')}</p>
      </Card>
    </div>
  );
}
