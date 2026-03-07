import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function InstallPrompt() {
  const { t } = useTranslation();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Show banner only if not already installed
      if (!window.matchMedia('(display-mode: standalone)').matches) {
        setShow(true);
      }
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setShow(false);
    setDeferredPrompt(null);
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 md:left-auto md:right-6 md:bottom-6 md:w-80 bg-slate-800 text-white rounded-xl p-4 shadow-xl z-50 flex items-center gap-3">
      <img src="/edulia-icon-192.png" alt="Edulia" className="w-10 h-10 rounded-lg shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold">{t('installApp', 'Install Edulia')}</p>
        <p className="text-xs text-slate-300 mt-0.5">{t('installAppDesc', 'Add to your home screen for quick access')}</p>
      </div>
      <div className="flex flex-col gap-1.5 shrink-0">
        <button
          onClick={handleInstall}
          className="text-xs bg-white text-slate-800 font-semibold px-3 py-1 rounded-md hover:bg-slate-100 transition-colors"
        >
          {t('install', 'Install')}
        </button>
        <button
          onClick={() => setShow(false)}
          className="text-xs text-slate-400 hover:text-white text-center"
        >
          {t('dismiss', 'Dismiss')}
        </button>
      </div>
    </div>
  );
}
