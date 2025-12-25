import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import api from '../api/axios';
import { useAuth } from './AuthContext';

const ChatContext = createContext();

export const ChatProvider = ({ children }) => {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [socket, setSocket] = useState(null);
  const [socketStatus, setSocketStatus] = useState('disconnected');
  const socketRef = useRef(null);

  const socketBaseUrl = useMemo(() => {
    const apiBase = import.meta.env.VITE_API_BASE || 'http://localhost:5001/api';
    return apiBase.replace(/\/api\/?$/, '');
  }, []);

  const refreshUnreadCount = useCallback(async () => {
    if (!user) return;
    try {
      const res = await api.get('/chat/unread-count');
      setUnreadCount(res.data?.totalUnread || 0);
    } catch (err) {
      console.error('Failed to load chat unread count', err);
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      setUnreadCount(0);
      setSocketStatus('disconnected');
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      setSocket(null);
      return;
    }

    refreshUnreadCount();

    const token = localStorage.getItem('accessToken');
    if (!token) return undefined;

    const socketInstance = io(socketBaseUrl, {
      auth: { token },
      withCredentials: true,
    });
    socketRef.current = socketInstance;
    setSocket(socketInstance);

    socketInstance.on('connect', () => {
      setSocketStatus('connected');
      refreshUnreadCount();
    });

    socketInstance.on('disconnect', () => {
      setSocketStatus('disconnected');
    });

    socketInstance.on('chat:unreadCount', (payload) => {
      if (typeof payload?.totalUnread === 'number') {
        setUnreadCount(payload.totalUnread);
      }
    });

    socketInstance.on('chat:newMessage', (payload) => {
      const incomingMessage = payload?.message;
      if (!incomingMessage || String(incomingMessage.receiverId) !== String(user?._id)) return;
      setUnreadCount((prev) => prev + 1);
    });

    return () => {
      socketInstance.disconnect();
      if (socketRef.current === socketInstance) {
        socketRef.current = null;
      }
      setSocket(null);
    };
  }, [user, socketBaseUrl, refreshUnreadCount]);

  const value = useMemo(
    () => ({
      unreadCount,
      refreshUnreadCount,
      socket,
      socketStatus,
    }),
    [unreadCount, refreshUnreadCount, socket, socketStatus]
  );

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};

export const useChat = () => useContext(ChatContext);
