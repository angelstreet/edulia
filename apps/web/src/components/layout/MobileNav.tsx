import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export function MobileNav() {
  const { t } = useTranslation();

  const tabs = [
    { to: '/dashboard', label: t('dashboard'), icon: '📊' },
    { to: '/messages', label: t('messages'), icon: '✉️' },
    { to: '/settings', label: t('settings'), icon: '⚙️' },
  ];

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
          <span className="mobile-nav-label">{tab.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
