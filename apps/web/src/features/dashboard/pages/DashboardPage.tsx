import { useTranslation } from 'react-i18next';

export function DashboardPage() {
  const { t } = useTranslation();

  return (
    <div className="dashboard-page">
      <h1>{t('welcome')}</h1>
    </div>
  );
}
