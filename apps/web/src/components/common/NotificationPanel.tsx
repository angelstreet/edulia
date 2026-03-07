import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Bell } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNotifications } from '../../hooks/useNotifications';

export function NotificationPanel() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { notifications, unreadCount, markRead, markAllRead, refresh } = useNotifications();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleClick = (n: typeof notifications[0]) => {
    markRead(n.id);
    if (n.link) navigate(n.link);
    setOpen(false);
  };

  const handleBellClick = () => {
    const next = !open;
    setOpen(next);
    if (next) refresh();
  };

  return (
    <div className="relative" ref={panelRef}>
      <button
        className="relative p-1 border-none bg-transparent cursor-pointer"
        onClick={handleBellClick}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-destructive text-white text-[0.5625rem] font-bold flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute top-full right-0 mt-2 w-80 bg-white border border-border rounded-lg shadow-md z-50 overflow-hidden max-md:w-72 max-md:-right-10">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <strong className="text-sm">{t('notifications')}</strong>
            {unreadCount > 0 && (
              <button className="text-sm text-primary hover:underline" onClick={markAllRead}>
                {t('markAllRead', 'Mark all read')}
              </button>
            )}
          </div>
          <div className="max-h-[360px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-6 py-6 text-center text-sm text-muted-foreground">
                {t('noNotifications', 'No notifications')}
              </div>
            ) : (
              notifications.slice(0, 10).map((n) => (
                <div
                  key={n.id}
                  className={cn(
                    'flex items-start gap-3 px-4 py-3 border-b border-border cursor-pointer hover:bg-muted/50 transition-colors',
                    !n.read_at && 'bg-primary/5'
                  )}
                  onClick={() => handleClick(n)}
                >
                  <div className="flex-1 min-w-0">
                    <span className="block text-sm font-semibold">{n.title}</span>
                    <span className="block text-xs text-muted-foreground truncate mt-0.5">{n.body}</span>
                  </div>
                  <span className="text-[0.6875rem] text-muted-foreground shrink-0">
                    {new Date(n.created_at).toLocaleDateString()}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
