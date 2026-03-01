import { useTranslation } from 'react-i18next';
import { Card } from '../../../components/ui/Card';

const MOCK_STATS = [
  { key: 'totalUsers', value: 342 },
  { key: 'activeStudents', value: 256 },
  { key: 'teachers', value: 28 },
  { key: 'classesCount', value: 14 },
];

const MOCK_ACTIVITY = [
  { text: 'M. Dupont a cree une evaluation en Mathematiques', time: 'il y a 15 min' },
  { text: 'Mme. Leroy a publie les notes du Trimestre 1', time: 'il y a 1h' },
  { text: 'Nouvel utilisateur: Sophie Bernard (parent)', time: 'il y a 2h' },
  { text: 'Import CSV: 45 eleves ajoutes', time: 'hier' },
];

export function AdminDashboard() {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {MOCK_STATS.map((s) => (
          <Card key={s.key}>
            <div className="text-center">
              <span className="text-2xl font-bold">{s.value}</span>
              <span className="block text-sm text-muted-foreground mt-1">{t(s.key, s.key)}</span>
            </div>
          </Card>
        ))}
      </div>
      <Card title={t('recentActivity', 'Recent activity')}>
        <div className="flex flex-col gap-3">
          {MOCK_ACTIVITY.map((a, i) => (
            <div key={i} className="flex items-center justify-between py-2 border-b border-border last:border-0 text-sm">
              <span>{a.text}</span>
              <span className="text-xs text-muted-foreground ml-4 shrink-0">{a.time}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
