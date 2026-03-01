import { TodaySchedule } from './widgets/TodaySchedule';
import { HomeworkDue } from './widgets/HomeworkDue';
import { RecentGrades } from './widgets/RecentGrades';

export function StudentDashboard() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <TodaySchedule />
      <HomeworkDue />
      <RecentGrades />
    </div>
  );
}
