import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { fetchTicketUnreadCount } from '../api/tickets';
import { useAuth } from './AuthContext';
import { useChat } from './ChatContext';

const SupportContext = createContext();

export const SupportProvider = ({ children }) => {
  const { user } = useAuth();
  const { socket } = useChat();
  const [unread, setUnread] = useState({ totalUnreadTickets: 0, totalUnreadMessages: 0 });

  const resetUnread = useCallback(() => {
    setUnread({ totalUnreadTickets: 0, totalUnreadMessages: 0 });
  }, []);

  const refreshUnread = useCallback(async () => {
    if (!user) return;
    try {
      const data = await fetchTicketUnreadCount();
      setUnread({
        totalUnreadTickets: data?.totalUnreadTickets || 0,
        totalUnreadMessages: data?.totalUnreadMessages || 0,
      });
    } catch (err) {
      console.error('Failed to load support unread count', err);
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      resetUnread();
      return;
    }
    refreshUnread();
  }, [user, resetUnread, refreshUnread]);

  useEffect(() => {
    if (!socket || !user) return undefined;
    const handleUnreadUpdate = (payload) => {
      if (typeof payload?.totalUnreadTickets !== 'number') return;
      setUnread({
        totalUnreadTickets: payload.totalUnreadTickets || 0,
        totalUnreadMessages: payload.totalUnreadMessages || 0,
      });
    };
    socket.on('ticket:unread:update', handleUnreadUpdate);
    return () => {
      socket.off('ticket:unread:update', handleUnreadUpdate);
    };
  }, [socket, user]);

  const value = useMemo(
    () => ({
      unread,
      refreshUnread,
    }),
    [unread, refreshUnread]
  );

  return <SupportContext.Provider value={value}>{children}</SupportContext.Provider>;
};

export const useSupport = () => useContext(SupportContext);
