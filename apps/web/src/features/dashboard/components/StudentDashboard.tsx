import { TodaySchedule } from './widgets/TodaySchedule';
import { HomeworkDue } from './widgets/HomeworkDue';
import { RecentGrades } from './widgets/RecentGrades';

export function StudentDashboard() {
  return (
    <div className="dashboard-grid">
      <TodaySchedule />
      <HomeworkDue />
      <RecentGrades />
    </div>
  );
}
