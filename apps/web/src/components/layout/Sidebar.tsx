import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export function Sidebar() {
  const { t } = useTranslation();

  const navItems = [
    { to: '/dashboard', label: t('dashboard'), icon: '📊' },
    { to: '/messages', label: t('messages'), icon: '✉️' },
    { to: '/settings', label: t('settings'), icon: '⚙️' },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h2 className="sidebar-logo">{t('appName')}</h2>
      </div>
      <nav className="sidebar-nav">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `sidebar-link ${isActive ? 'sidebar-link--active' : ''}`
            }
          >
            <span className="sidebar-link-icon">{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
