import { useTranslation } from 'react-i18next';
import { Card } from '../../../../components/ui/Card';

const MOCK_SCHEDULE = [
  { time: '08:00 - 09:00', subject: 'Mathematiques', room: 'Salle 201', color: '#4A90D9' },
  { time: '09:00 - 10:00', subject: 'Francais', room: 'Salle 102', color: '#E74C3C' },
  { time: '10:15 - 11:15', subject: 'Histoire-Geo', room: 'Salle 305', color: '#F39C12' },
  { time: '14:00 - 15:00', subject: 'Sciences', room: 'Labo 1', color: '#27AE60' },
];

export function TodaySchedule() {
  const { t } = useTranslation();

  return (
    <Card title={t('todaySchedule', "Today's schedule")}>
      <div className="flex flex-col">
        {MOCK_SCHEDULE.map((s, i) => (
          <div key={i} className="flex items-center gap-3 py-2 border-b border-border last:border-0 text-sm">
            <span className="w-1 h-8 rounded-sm shrink-0" style={{ background: s.color }} />
            <div className="flex flex-col">
              <strong>{s.subject}</strong>
              <span className="text-xs text-muted-foreground">{s.time} -- {s.room}</span>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
