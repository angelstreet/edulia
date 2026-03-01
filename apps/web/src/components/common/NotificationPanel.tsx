import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useNotifications } from '../../hooks/useNotifications';

export function NotificationPanel() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications();
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

  return (
    <div className="notification-panel-wrapper" ref={panelRef}>
      <button className="topbar-btn topbar-btn--icon notification-trigger" onClick={() => setOpen(!open)}>
        <span>&#x1F514;</span>
        {unreadCount > 0 && <span className="notification-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>}
      </button>

      {open && (
        <div className="notification-dropdown">
          <div className="notification-dropdown-header">
            <strong>{t('notifications')}</strong>
            {unreadCount > 0 && (
              <button className="link-muted" onClick={markAllRead}>{t('markAllRead', 'Mark all read')}</button>
            )}
          </div>
          <div className="notification-list">
            {notifications.length === 0 ? (
              <div className="notification-empty">{t('noNotifications', 'No notifications')}</div>
            ) : (
              notifications.slice(0, 10).map((n) => (
                <div
                  key={n.id}
                  className={`notification-item ${!n.is_read ? 'notification-item--unread' : ''}`}
                  onClick={() => handleClick(n)}
                >
                  <div className="notification-item-body">
                    <span className="notification-title">{n.title}</span>
                    <span className="notification-body-text">{n.body}</span>
                  </div>
                  <span className="notification-time">
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
