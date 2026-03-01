import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Button } from '../../../components/ui/Button';
import { TodaySchedule } from './widgets/TodaySchedule';
import { UnreadMessages } from './widgets/UnreadMessages';

export function TeacherDashboard() {
  const { t } = useTranslation();

  return (
    <div className="dashboard-grid">
      <TodaySchedule />
      <UnreadMessages />
      <div className="dashboard-quick-actions">
        <h3>{t('quickActions', 'Quick actions')}</h3>
        <div className="quick-actions-row">
          <Link to="/attendance"><Button variant="secondary">{t('takeAttendance', 'Take attendance')}</Button></Link>
          <Link to="/gradebook"><Button variant="secondary">{t('enterGrades', 'Enter grades')}</Button></Link>
        </div>
      </div>
    </div>
  );
}
