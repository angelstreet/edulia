import { useTranslation } from 'react-i18next';
import { Button } from '../../../components/ui/Button';

export function ImportCSV() {
  const { t } = useTranslation();

  return (
    <div className="import-csv">
      <p className="form-hint">
        {t('importCSVHint', 'Upload a CSV file to import users in bulk.')}
      </p>
      <Button variant="secondary" disabled>
        {t('importCSV', 'Import CSV')} ({t('comingSoon', 'coming soon')})
      </Button>
    </div>
  );
}
