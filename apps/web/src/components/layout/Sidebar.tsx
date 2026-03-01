import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useCurrentUser } from '../../hooks/useCurrentUser';

interface NavItem {
  to: string;
  label: string;
  icon: string;
}

const NAV_BY_ROLE: Record<string, NavItem[]> = {
  admin: [
    { to: '/dashboard', label: 'dashboard', icon: 'grid' },
    { to: '/admin/users', label: 'users', icon: 'users' },
    { to: '/admin/classes', label: 'classes', icon: 'school' },
    { to: '/admin/subjects', label: 'subjects', icon: 'book' },
    { to: '/settings', label: 'settings', icon: 'settings' },
  ],
  teacher: [
    { to: '/dashboard', label: 'dashboard', icon: 'grid' },
    { to: '/timetable', label: 'timetable', icon: 'calendar' },
    { to: '/attendance', label: 'attendance', icon: 'check-circle' },
    { to: '/gradebook', label: 'gradebook', icon: 'bar-chart' },
    { to: '/homework', label: 'homework', icon: 'clipboard' },
    { to: '/messages', label: 'messages', icon: 'mail' },
  ],
  student: [
    { to: '/dashboard', label: 'dashboard', icon: 'grid' },
    { to: '/timetable', label: 'timetable', icon: 'calendar' },
    { to: '/grades', label: 'grades', icon: 'bar-chart' },
    { to: '/homework', label: 'homework', icon: 'clipboard' },
    { to: '/messages', label: 'messages', icon: 'mail' },
  ],
  parent: [
    { to: '/dashboard', label: 'dashboard', icon: 'grid' },
    { to: '/children', label: 'children', icon: 'users' },
    { to: '/grades', label: 'grades', icon: 'bar-chart' },
    { to: '/messages', label: 'messages', icon: 'mail' },
    { to: '/billing', label: 'billing', icon: 'credit-card' },
  ],
  tutor: [
    { to: '/dashboard', label: 'dashboard', icon: 'grid' },
    { to: '/calendar', label: 'calendar', icon: 'calendar' },
    { to: '/students', label: 'students', icon: 'users' },
    { to: '/messages', label: 'messages', icon: 'mail' },
  ],
};

const ICON_MAP: Record<string, string> = {
  grid: '\u25A6',
  users: '\u2636',
  school: '\u2302',
  book: '\u2261',
  settings: '\u2699',
  calendar: '\u2637',
  'check-circle': '\u2713',
  'bar-chart': '\u2584',
  clipboard: '\u2630',
  mail: '\u2709',
  'credit-card': '\u2610',
};

export function Sidebar() {
  const { t } = useTranslation();
  const user = useCurrentUser();
  const role = user?.role || 'student';
  const items = NAV_BY_ROLE[role] || NAV_BY_ROLE.student;

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h2 className="sidebar-logo">{t('appName')}</h2>
      </div>
      <nav className="sidebar-nav">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `sidebar-link ${isActive ? 'sidebar-link--active' : ''}`
            }
          >
            <span className="sidebar-link-icon">{ICON_MAP[item.icon] || '\u2022'}</span>
            <span>{t(item.label, item.label)}</span>
          </NavLink>
        ))}
      </nav>
      <div className="sidebar-footer">
        {user && (
          <div className="sidebar-user">
            <span className="sidebar-user-name">{user.display_name}</span>
            <span className="sidebar-user-role">{user.role}</span>
          </div>
        )}
      </div>
    </aside>
  );
}
