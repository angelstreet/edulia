import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Button } from '../../../components/ui/Button';
import { TodaySchedule } from './widgets/TodaySchedule';
import { UnreadMessages } from './widgets/UnreadMessages';

export function TeacherDashboard() {
  const { t } = useTranslation();

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <TodaySchedule />
      <UnreadMessages />
      <div className="space-y-4">
        <h3 className="font-semibold">{t('quickActions', 'Quick actions')}</h3>
        <div className="flex flex-wrap gap-2">
          <Link to="/attendance"><Button variant="secondary">{t('takeAttendance', 'Take attendance')}</Button></Link>
          <Link to="/gradebook"><Button variant="secondary">{t('enterGrades', 'Enter grades')}</Button></Link>
        </div>
      </div>
    </div>
  );
}
