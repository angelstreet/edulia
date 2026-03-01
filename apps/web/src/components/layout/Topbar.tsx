import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../stores/authStore';
import { Breadcrumb } from './Breadcrumb';

export function Topbar() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const toggleLang = () => {
    i18n.changeLanguage(i18n.language === 'fr' ? 'en' : 'fr');
  };

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="topbar">
      <div className="topbar-left">
        <Breadcrumb />
      </div>
      <div className="topbar-right">
        <button className="topbar-btn topbar-btn--icon" title={t('notifications')}>
          <span>&#x1F514;</span>
        </button>
        <button className="topbar-btn" onClick={toggleLang}>
          {i18n.language === 'fr' ? 'EN' : 'FR'}
        </button>
        <div className="user-menu-wrapper" ref={menuRef}>
          <button
            className="topbar-btn user-menu-trigger"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <span className="user-menu-avatar">
              {user?.display_name?.charAt(0).toUpperCase() || 'U'}
            </span>
            <span className="user-menu-name">{user?.display_name}</span>
          </button>
          {menuOpen && (
            <div className="user-menu-dropdown">
              <div className="user-menu-header">
                <strong>{user?.display_name}</strong>
                <span className="text-muted">{user?.email}</span>
              </div>
              <hr className="user-menu-divider" />
              <button className="user-menu-item" onClick={() => { navigate('/settings'); setMenuOpen(false); }}>
                {t('settings')}
              </button>
              <button className="user-menu-item user-menu-item--danger" onClick={handleLogout}>
                {t('logout')}
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
