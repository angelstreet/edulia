import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useCurrentUser } from '../../hooks/useCurrentUser';
import { cn } from '@/lib/utils';
import {
  LayoutGrid,
  Users,
  School,
  BookOpen,
  Settings,
  Calendar,
  CheckCircle,
  BarChart3,
  ClipboardList,
  Mail,
  CreditCard,
  type LucideIcon,
} from 'lucide-react';

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
}

const NAV_BY_ROLE: Record<string, NavItem[]> = {
  admin: [
    { to: '/dashboard', label: 'dashboard', icon: LayoutGrid },
    { to: '/admin/users', label: 'users', icon: Users },
    { to: '/admin/classes', label: 'classes', icon: School },
    { to: '/admin/subjects', label: 'subjects', icon: BookOpen },
    { to: '/admin/academic-year', label: 'academicYear', icon: Calendar },
    { to: '/admin/settings', label: 'tenantSettings', icon: Settings },
  ],
  teacher: [
    { to: '/dashboard', label: 'dashboard', icon: LayoutGrid },
    { to: '/timetable', label: 'timetable', icon: Calendar },
    { to: '/attendance', label: 'attendance', icon: CheckCircle },
    { to: '/gradebook', label: 'gradebook', icon: BarChart3 },
    { to: '/homework', label: 'homework', icon: ClipboardList },
    { to: '/messages', label: 'messages', icon: Mail },
  ],
  student: [
    { to: '/dashboard', label: 'dashboard', icon: LayoutGrid },
    { to: '/timetable', label: 'timetable', icon: Calendar },
    { to: '/grades', label: 'grades', icon: BarChart3 },
    { to: '/homework', label: 'homework', icon: ClipboardList },
    { to: '/messages', label: 'messages', icon: Mail },
  ],
  parent: [
    { to: '/dashboard', label: 'dashboard', icon: LayoutGrid },
    { to: '/children', label: 'children', icon: Users },
    { to: '/grades', label: 'grades', icon: BarChart3 },
    { to: '/messages', label: 'messages', icon: Mail },
    { to: '/billing', label: 'billing', icon: CreditCard },
  ],
  tutor: [
    { to: '/dashboard', label: 'dashboard', icon: LayoutGrid },
    { to: '/calendar', label: 'calendar', icon: Calendar },
    { to: '/students', label: 'students', icon: Users },
    { to: '/messages', label: 'messages', icon: Mail },
  ],
};

export function Sidebar() {
  const { t } = useTranslation();
  const user = useCurrentUser();
  const role = user?.role || 'student';
  const items = NAV_BY_ROLE[role] || NAV_BY_ROLE.student;

  return (
    <aside className="fixed top-0 left-0 w-60 h-screen bg-slate-800 text-slate-300 flex-col overflow-y-auto z-40 hidden md:flex">
      <div className="px-5 py-4 border-b border-white/10">
        <h2 className="text-xl font-bold text-white">{t('appName')}</h2>
      </div>
      <nav className="flex-1 p-2 flex flex-col gap-1">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors no-underline',
                  isActive
                    ? 'bg-white/10 text-white'
                    : 'text-slate-300 hover:bg-white/5'
                )
              }
            >
              <Icon className="h-[1.125rem] w-[1.125rem]" />
              <span>{t(item.label, item.label)}</span>
            </NavLink>
          );
        })}
      </nav>
      <div className="px-4 py-3 border-t border-white/10">
        {user && (
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-semibold text-white">{user.display_name}</span>
            <span className="text-[0.6875rem] text-slate-300 capitalize">{user.role}</span>
          </div>
        )}
      </div>
    </aside>
  );
}
