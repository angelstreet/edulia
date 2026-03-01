import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../stores/authStore';

export function Topbar() {
  const { t, i18n } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const toggleLang = () => {
    i18n.changeLanguage(i18n.language === 'fr' ? 'en' : 'fr');
  };

  return (
    <header className="topbar">
      <div className="topbar-left">
        <h1 className="topbar-title">{t('appName')}</h1>
      </div>
      <div className="topbar-right">
        <button className="topbar-btn" onClick={toggleLang}>
          {i18n.language === 'fr' ? 'EN' : 'FR'}
        </button>
        {user && <span className="topbar-user">{user.name}</span>}
        <button className="topbar-btn topbar-btn--logout" onClick={logout}>
          {t('logout')}
        </button>
      </div>
    </header>
  );
}
