import { useTranslation } from 'react-i18next';
import { Button } from '../../../components/ui/Button';

export function ImportCSV() {
  const { t } = useTranslation();

  return (
    <div className="space-y-2">
      <p className="text-sm text-muted-foreground">
        {t('importCSVHint', 'Upload a CSV file to import users in bulk.')}
      </p>
      <Button variant="secondary" disabled>
        {t('importCSV', 'Import CSV')} ({t('comingSoon', 'coming soon')})
      </Button>
    </div>
  );
}
