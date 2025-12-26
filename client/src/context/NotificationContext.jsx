import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { fetchNotifications, fetchUnreadCount, markAllRead, markOneRead } from '../api/notifications';
import { useAuth } from './AuthContext';
import { useChat } from './ChatContext';

const NotificationContext = createContext();

const PAGE_LIMIT = 20;
const POLL_INTERVAL_MS = 25000;

export const NotificationProvider = ({ children }) => {
  const { user } = useAuth();
  const { socket } = useChat();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cursor, setCursor] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const pollRef = useRef(null);
  const markAllRef = useRef(false);

  const resetState = useCallback(() => {
    setNotifications([]);
    setUnreadCount(0);
    setIsOpen(false);
    setLoading(false);
    setCursor(null);
    setHasMore(true);
    markAllRef.current = false;
  }, []);

  const loadUnreadCount = useCallback(async () => {
    if (!user) return;
    try {
      const data = await fetchUnreadCount();
      setUnreadCount(data?.unreadCount || 0);
    } catch (err) {
      console.error('Failed to load unread count', err);
    }
  }, [user]);

  const loadNotifications = useCallback(
    async ({ reset = false } = {}) => {
      if (!user) return;
      if (loading) return;
      if (!hasMore && !reset) return;

      setLoading(true);
      try {
        const data = await fetchNotifications({
          limit: PAGE_LIMIT,
          cursor: reset ? null : cursor,
        });
        const incoming = data?.notifications || [];
        const normalized = markAllRef.current
          ? incoming.map((item) => ({ ...item, isRead: true }))
          : incoming;
        setNotifications((prev) => (reset ? normalized : [...prev, ...normalized]));
        setCursor(data?.nextCursor || null);
        setHasMore(Boolean(data?.nextCursor));
      } catch (err) {
        console.error('Failed to load notifications', err);
      } finally {
        setLoading(false);
      }
    },
    [user, loading, hasMore, cursor]
  );

  const markAllAsRead = useCallback(async () => {
    if (!user || markAllRef.current) return;

    markAllRef.current = true;
    setUnreadCount(0);
    setNotifications((prev) => prev.map((item) => ({ ...item, isRead: true })));
    try {
      await markAllRead();
    } catch (err) {
      console.error('Failed to mark all as read', err);
    } finally {
      markAllRef.current = false;
    }
  }, [user]);

  const markNotificationRead = useCallback(
    async (id) => {
      if (!user || !id) return;

      setNotifications((prev) => prev.map((item) => (item._id === id ? { ...item, isRead: true } : item)));
      setUnreadCount((prev) => (prev > 0 ? prev - 1 : 0));
      try {
        const data = await markOneRead(id);
        if (typeof data?.unreadCount === 'number') {
          setUnreadCount(data.unreadCount);
        }
      } catch (err) {
        console.error('Failed to mark notification as read', err);
      }
    },
    [user]
  );

  const handleIncomingNotification = useCallback((notification) => {
    if (!notification) return;
    setNotifications((prev) => [notification, ...prev]);
    setUnreadCount((prev) => prev + 1);
  }, []);

  const openDropdown = useCallback(() => {
    setIsOpen(true);
    if (unreadCount > 0) {
      markAllAsRead();
    }
    loadNotifications({ reset: true });
  }, [unreadCount, markAllAsRead, loadNotifications]);

  const closeDropdown = useCallback(() => setIsOpen(false), []);

  useEffect(() => {
    if (!user) {
      resetState();
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
      return;
    }

    loadUnreadCount();
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(() => {
      loadUnreadCount();
    }, POLL_INTERVAL_MS);

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [user, resetState, loadUnreadCount]);

  useEffect(() => {
    if (!socket || !user) return undefined;
    const handleNotification = (notification) => {
      handleIncomingNotification(notification);
    };
    socket.on('notification:new', handleNotification);
    return () => {
      socket.off('notification:new', handleNotification);
    };
  }, [socket, user, handleIncomingNotification]);

  const value = useMemo(
    () => ({
      notifications,
      unreadCount,
      isOpen,
      loading,
      hasMore,
      loadUnreadCount,
      loadNotifications,
      openDropdown,
      closeDropdown,
      markAllAsRead,
      markNotificationRead,
      handleIncomingNotification,
    }),
    [
      notifications,
      unreadCount,
      isOpen,
      loading,
      hasMore,
      loadUnreadCount,
      loadNotifications,
      openDropdown,
      closeDropdown,
      markAllAsRead,
      markNotificationRead,
      handleIncomingNotification,
    ]
  );

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
};

export const useNotifications = () => useContext(NotificationContext);
