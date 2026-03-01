import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useCurrentUser } from '../../hooks/useCurrentUser';
import { cn } from '@/lib/utils';
import {
  LayoutGrid,
  Users,
  Mail,
  Settings,
  Calendar,
  BarChart3,
  CreditCard,
  type LucideIcon,
} from 'lucide-react';

interface Tab {
  to: string;
  label: string;
  icon: LucideIcon;
}

const TABS_BY_ROLE: Record<string, Tab[]> = {
  admin: [
    { to: '/dashboard', label: 'dashboard', icon: LayoutGrid },
    { to: '/admin/users', label: 'users', icon: Users },
    { to: '/messages', label: 'messages', icon: Mail },
    { to: '/settings', label: 'settings', icon: Settings },
  ],
  teacher: [
    { to: '/dashboard', label: 'dashboard', icon: LayoutGrid },
    { to: '/timetable', label: 'timetable', icon: Calendar },
    { to: '/gradebook', label: 'gradebook', icon: BarChart3 },
    { to: '/messages', label: 'messages', icon: Mail },
  ],
  student: [
    { to: '/dashboard', label: 'dashboard', icon: LayoutGrid },
    { to: '/timetable', label: 'timetable', icon: Calendar },
    { to: '/grades', label: 'grades', icon: BarChart3 },
    { to: '/messages', label: 'messages', icon: Mail },
  ],
  parent: [
    { to: '/dashboard', label: 'dashboard', icon: LayoutGrid },
    { to: '/grades', label: 'grades', icon: BarChart3 },
    { to: '/messages', label: 'messages', icon: Mail },
    { to: '/billing', label: 'billing', icon: CreditCard },
  ],
  tutor: [
    { to: '/dashboard', label: 'dashboard', icon: LayoutGrid },
    { to: '/calendar', label: 'calendar', icon: Calendar },
    { to: '/messages', label: 'messages', icon: Mail },
  ],
};

export function MobileNav() {
  const { t } = useTranslation();
  const user = useCurrentUser();
  const role = user?.role || 'student';
  const tabs = TABS_BY_ROLE[role] || TABS_BY_ROLE.student;

  return (
    <nav className="fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-border flex justify-around items-center z-40 md:hidden">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        return (
          <NavLink
            key={tab.to}
            to={tab.to}
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center gap-0.5 no-underline text-[0.6875rem] py-1',
                isActive ? 'text-primary' : 'text-muted-foreground'
              )
            }
          >
            <Icon className="h-5 w-5" />
            <span>{t(tab.label, tab.label)}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}
