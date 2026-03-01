import { useTranslation } from 'react-i18next';
import { useCurrentUser } from '../../../hooks/useCurrentUser';
import { TeacherDashboard } from '../components/TeacherDashboard';
import { StudentDashboard } from '../components/StudentDashboard';
import { ParentDashboard } from '../components/ParentDashboard';
import { AdminDashboard } from '../components/AdminDashboard';

const DASHBOARD_BY_ROLE: Record<string, React.FC> = {
  admin: AdminDashboard,
  teacher: TeacherDashboard,
  student: StudentDashboard,
  parent: ParentDashboard,
  tutor: TeacherDashboard, // reuse teacher layout for now
};

export function DashboardPage() {
  const { t } = useTranslation();
  const user = useCurrentUser();
  const role = user?.role || 'student';
  const DashboardComponent = DASHBOARD_BY_ROLE[role] || StudentDashboard;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">{t('welcome')}</h1>
      <DashboardComponent />
    </div>
  );
}
