import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../stores/authStore';
import { Breadcrumb } from './Breadcrumb';
import { NotificationPanel } from '../common/NotificationPanel';

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
    <header className="h-14 border-b bg-white flex items-center justify-between px-6">
      <div className="flex items-center">
        <Breadcrumb />
      </div>
      <div className="flex items-center gap-3">
        <NotificationPanel />
        <button
          className="px-3 py-1.5 border border-border rounded-md bg-white text-sm cursor-pointer hover:bg-muted/50 transition-colors"
          onClick={toggleLang}
        >
          {i18n.language === 'fr' ? 'EN' : 'FR'}
        </button>
        <div className="relative" ref={menuRef}>
          <button
            className="flex items-center gap-2 border-none bg-transparent cursor-pointer px-2 py-1"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <span className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold">
              {user?.display_name?.charAt(0).toUpperCase() || 'U'}
            </span>
            <span className="text-sm hidden md:inline">{user?.display_name}</span>
          </button>
          {menuOpen && (
            <div className="absolute top-full right-0 mt-1 min-w-[200px] bg-white border border-border rounded-lg shadow-md z-50 py-2">
              <div className="px-4 py-2 flex flex-col gap-0.5">
                <strong className="text-sm">{user?.display_name}</strong>
                <span className="text-xs text-muted-foreground">{user?.email}</span>
              </div>
              <hr className="border-t border-border my-1" />
              <button
                className="block w-full text-left px-4 py-2 text-sm hover:bg-muted/50 transition-colors"
                onClick={() => { navigate('/settings'); setMenuOpen(false); }}
              >
                {t('settings')}
              </button>
              <button
                className="block w-full text-left px-4 py-2 text-sm text-destructive hover:bg-muted/50 transition-colors"
                onClick={handleLogout}
              >
                {t('logout')}
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
