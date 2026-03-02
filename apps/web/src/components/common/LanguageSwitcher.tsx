import { useTranslation } from 'react-i18next';

export function LanguageSwitcher({ className = '' }: { className?: string }) {
  const { i18n } = useTranslation();
  const current = i18n.language?.startsWith('fr') ? 'fr' : 'en';

  return (
    <div className={`flex items-center gap-1 text-sm ${className}`}>
      <button
        onClick={() => i18n.changeLanguage('en')}
        className={`px-1.5 py-0.5 rounded transition ${current === 'en' ? 'font-bold opacity-100' : 'opacity-50 hover:opacity-80'}`}
      >
        EN
      </button>
      <span className="opacity-30">|</span>
      <button
        onClick={() => i18n.changeLanguage('fr')}
        className={`px-1.5 py-0.5 rounded transition ${current === 'fr' ? 'font-bold opacity-100' : 'opacity-50 hover:opacity-80'}`}
      >
        FR
      </button>
    </div>
  );
}
