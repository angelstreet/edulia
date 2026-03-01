import { useTranslation } from 'react-i18next';
import { Card } from '../../../components/ui/Card';

const MOCK_STATS = [
  { key: 'totalUsers', value: 342 },
  { key: 'activeStudents', value: 256 },
  { key: 'teachers', value: 28 },
  { key: 'classesCount', value: 14 },
];

const MOCK_ACTIVITY = [
  { text: 'M. Dupont a créé une évaluation en Mathématiques', time: 'il y a 15 min' },
  { text: 'Mme. Leroy a publié les notes du Trimestre 1', time: 'il y a 1h' },
  { text: 'Nouvel utilisateur: Sophie Bernard (parent)', time: 'il y a 2h' },
  { text: 'Import CSV: 45 élèves ajoutés', time: 'hier' },
];

export function AdminDashboard() {
  const { t } = useTranslation();

  return (
    <div className="dashboard-grid">
      <div className="stats-row">
        {MOCK_STATS.map((s) => (
          <div key={s.key} className="stat-card card">
            <div className="card-body stat-card-body">
              <span className="stat-value">{s.value}</span>
              <span className="stat-label">{t(s.key, s.key)}</span>
            </div>
          </div>
        ))}
      </div>
      <Card title={t('recentActivity', 'Recent activity')}>
        <div className="widget-activity">
          {MOCK_ACTIVITY.map((a, i) => (
            <div key={i} className="activity-item">
              <span>{a.text}</span>
              <span className="text-muted">{a.time}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
