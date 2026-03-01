import { useTranslation } from 'react-i18next';
import { Card } from '../../../../components/ui/Card';

const MOCK_GRADES = [
  { subject: 'Mathématiques', title: 'Contrôle Ch.5', score: 16, max: 20, color: '#4A90D9' },
  { subject: 'Français', title: 'Dissertation', score: 14, max: 20, color: '#E74C3C' },
  { subject: 'Anglais', title: 'Vocabulary test', score: 18, max: 20, color: '#9B59B6' },
  { subject: 'Histoire', title: 'Évaluation WW2', score: 12, max: 20, color: '#F39C12' },
  { subject: 'Sciences', title: 'TP Optique', score: 15, max: 20, color: '#27AE60' },
];

export function RecentGrades() {
  const { t } = useTranslation();

  return (
    <Card title={t('recentGrades', 'Recent grades')}>
      <div className="widget-grades">
        {MOCK_GRADES.map((g, i) => (
          <div key={i} className="grade-item">
            <span className="grade-color" style={{ background: g.color }} />
            <div className="grade-info">
              <strong>{g.subject}</strong>
              <span className="text-muted">{g.title}</span>
            </div>
            <span className="grade-score">{g.score}/{g.max}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}
