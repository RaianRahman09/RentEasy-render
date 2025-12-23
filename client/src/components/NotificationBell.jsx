import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../context/NotificationContext';

const formatTimeAgo = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
};

const NotificationBell = () => {
  const {
    notifications,
    unreadCount,
    isOpen,
    loading,
    hasMore,
    openDropdown,
    closeDropdown,
    loadNotifications,
    markAllAsRead,
    markNotificationRead,
  } = useNotifications();
  const navigate = useNavigate();
  const containerRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        closeDropdown();
      }
    };
    const handleEscape = (event) => {
      if (event.key === 'Escape') closeDropdown();
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, closeDropdown]);

  const handleToggle = () => {
    if (isOpen) {
      closeDropdown();
    } else {
      openDropdown();
    }
  };

  const handleNotificationClick = (notification) => {
    if (!notification?.isRead) {
      markNotificationRead(notification._id);
    }
    closeDropdown();
    if (notification?.link) {
      navigate(notification.link);
    }
  };

  const displayCount = unreadCount > 99 ? '99+' : unreadCount;

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={handleToggle}
        aria-label="Notifications"
        aria-expanded={isOpen}
        className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] transition hover:text-[var(--text)]"
      >
        <svg
          viewBox="0 0 24 24"
          aria-hidden="true"
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M15 17h5l-1.4-1.4a2 2 0 0 1-.6-1.4V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5" />
          <path d="M9 17a3 3 0 0 0 6 0" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 inline-flex min-w-[20px] items-center justify-center rounded-full bg-[var(--danger)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--on-danger)]">
            {displayCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-3 w-[22rem] origin-top-right rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow)]">
          <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-[var(--text)]">Notifications</p>
              <p className="text-xs text-[var(--muted)]">{unreadCount ? `${unreadCount} unread` : 'All caught up'}</p>
            </div>
            <button
              type="button"
              onClick={markAllAsRead}
              disabled={!unreadCount}
              className="text-xs font-semibold text-[var(--primary)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Mark all read
            </button>
          </div>

          <div className="max-h-[22rem] overflow-auto p-2">
            {!notifications.length && !loading && (
              <div className="px-4 py-6 text-center text-sm text-[var(--muted)]">No notifications yet.</div>
            )}
            {!!notifications.length && (
              <ul className="space-y-2">
                {notifications.map((notification) => (
                  <li key={notification._id}>
                    <button
                      type="button"
                      onClick={() => handleNotificationClick(notification)}
                      className={`w-full rounded-xl border border-[var(--border)] p-3 text-left transition ${
                        notification.isRead ? 'bg-[var(--surface)]' : 'bg-[var(--surface-2)]'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-[var(--text)]">{notification.title}</p>
                          {notification.body && (
                            <p className="mt-1 text-xs text-[var(--muted)]">{notification.body}</p>
                          )}
                          <div className="mt-2 flex items-center gap-2 text-[11px] text-[var(--muted)]">
                            <span className="rounded-full bg-[var(--surface)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--primary)]">
                              {notification.type}
                            </span>
                            <span>{formatTimeAgo(notification.createdAt)}</span>
                          </div>
                        </div>
                        {!notification.isRead && <span className="mt-1 h-2.5 w-2.5 rounded-full bg-[var(--primary)]" />}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {loading && <div className="px-4 py-3 text-xs text-[var(--muted)]">Loading...</div>}
          </div>

          <div className="flex items-center justify-between border-t border-[var(--border)] px-4 py-3">
            <button
              type="button"
              onClick={() => loadNotifications({ reset: false })}
              disabled={!hasMore || loading}
              className="text-xs font-semibold text-[var(--primary)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Load more
            </button>
            <span className="text-[11px] text-[var(--muted)]">
              {notifications.length ? `${notifications.length} total` : ' '}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
