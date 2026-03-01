import { useTranslation } from 'react-i18next';
import { Card } from '../../../../components/ui/Card';
import { Badge } from '../../../../components/ui/Badge';

const MOCK_ALERTS = [
  { type: 'absence', text: '2 absences non justifiees', variant: 'danger' as const },
  { type: 'grade', text: 'Nouvelle note en Mathematiques: 16/20', variant: 'info' as const },
  { type: 'message', text: 'Message de M. Dupont', variant: 'default' as const },
];

export function AlertsWidget() {
  const { t } = useTranslation();

  return (
    <Card title={t('alerts', 'Alerts')}>
      <div className="flex flex-col">
        {MOCK_ALERTS.map((a, i) => (
          <div key={i} className="flex items-center gap-2 py-2 border-b border-border last:border-0 text-sm">
            <Badge variant={a.variant}>{a.type}</Badge>
            <span>{a.text}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}
