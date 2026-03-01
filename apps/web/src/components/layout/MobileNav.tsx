import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useCurrentUser } from '../../hooks/useCurrentUser';

interface Tab {
  to: string;
  label: string;
  icon: string;
}

const TABS_BY_ROLE: Record<string, Tab[]> = {
  admin: [
    { to: '/dashboard', label: 'dashboard', icon: '\u25A6' },
    { to: '/admin/users', label: 'users', icon: '\u2636' },
    { to: '/messages', label: 'messages', icon: '\u2709' },
    { to: '/settings', label: 'settings', icon: '\u2699' },
  ],
  teacher: [
    { to: '/dashboard', label: 'dashboard', icon: '\u25A6' },
    { to: '/timetable', label: 'timetable', icon: '\u2637' },
    { to: '/gradebook', label: 'gradebook', icon: '\u2584' },
    { to: '/messages', label: 'messages', icon: '\u2709' },
  ],
  student: [
    { to: '/dashboard', label: 'dashboard', icon: '\u25A6' },
    { to: '/timetable', label: 'timetable', icon: '\u2637' },
    { to: '/grades', label: 'grades', icon: '\u2584' },
    { to: '/messages', label: 'messages', icon: '\u2709' },
  ],
  parent: [
    { to: '/dashboard', label: 'dashboard', icon: '\u25A6' },
    { to: '/grades', label: 'grades', icon: '\u2584' },
    { to: '/messages', label: 'messages', icon: '\u2709' },
    { to: '/billing', label: 'billing', icon: '\u2610' },
  ],
  tutor: [
    { to: '/dashboard', label: 'dashboard', icon: '\u25A6' },
    { to: '/calendar', label: 'calendar', icon: '\u2637' },
    { to: '/messages', label: 'messages', icon: '\u2709' },
  ],
};

export function MobileNav() {
  const { t } = useTranslation();
  const user = useCurrentUser();
  const role = user?.role || 'student';
  const tabs = TABS_BY_ROLE[role] || TABS_BY_ROLE.student;

  return (
    <nav className="mobile-nav">
      {tabs.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          className={({ isActive }) =>
            `mobile-nav-tab ${isActive ? 'mobile-nav-tab--active' : ''}`
          }
        >
          <span className="mobile-nav-icon">{tab.icon}</span>
          <span className="mobile-nav-label">{t(tab.label, tab.label)}</span>
        </NavLink>
      ))}
    </nav>
  );
}
