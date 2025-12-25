import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';

const formatTimestamp = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const ChatPage = () => {
  const { user } = useAuth();
  const { socket, socketStatus, refreshUnreadCount } = useChat();
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState([]);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);

  const activeConversationRef = useRef(null);
  const joinedConversationRef = useRef(null);
  const currentUserIdRef = useRef(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    activeConversationRef.current = conversationId || null;
  }, [conversationId]);

  useEffect(() => {
    currentUserIdRef.current = user?._id || null;
  }, [user]);

  useEffect(() => {
    let isMounted = true;
    const loadConversations = async () => {
      setLoadingConversations(true);
      try {
        const res = await api.get('/chat/conversations');
        if (isMounted) {
          setConversations(res.data.conversations || []);
        }
      } catch (err) {
        toast.error(err.response?.data?.message || 'Failed to load conversations');
      } finally {
        if (isMounted) setLoadingConversations(false);
      }
    };
    loadConversations();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!socket) return undefined;

    const handleConnect = () => {
      const activeId = activeConversationRef.current;
      if (activeId) {
        socket.emit('joinConversation', { conversationId: activeId });
        joinedConversationRef.current = activeId;
        socket.emit('chat:readConversation', { conversationId: activeId });
      }
    };

    const handleChatError = (payload) => {
      if (payload?.message) toast.error(payload.message);
    };

    const handleIncomingMessage = (convId, message) => {
      if (!convId || !message) return;
      if (activeConversationRef.current !== convId) return;
      setMessages((prev) => {
        if (prev.some((item) => item._id === message._id)) return prev;
        const pendingIndex = prev.findIndex(
          (item) =>
            item.pending &&
            item.text === message.text &&
            String(item.senderId) === String(message.senderId)
        );
        if (pendingIndex >= 0) {
          const next = [...prev];
          next[pendingIndex] = message;
          return next;
        }
        return [...prev, message];
      });
      if (String(message.receiverId) === String(currentUserIdRef.current)) {
        socket.emit('chat:readConversation', { conversationId: convId });
      }
    };

    const handleLegacyMessage = ({ conversationId: convId, message }) => {
      handleIncomingMessage(convId, message);
    };

    const handleChatMessage = ({ convId, message }) => {
      handleIncomingMessage(convId, message);
    };

    const handleConversationUpdated = (payload) => {
      const convId = payload?.conversationId;
      if (!convId) return;
      setConversations((prev) => {
        const index = prev.findIndex((item) => item._id === convId);
        if (index === -1) return prev;
        const next = [...prev];
        next[index] = { ...next[index], ...payload };
        next.sort((a, b) => {
          const aTime = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
          const bTime = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
          return bTime - aTime;
        });
        return next;
      });
    };

    socket.on('connect', handleConnect);
    socket.on('chat:error', handleChatError);
    socket.on('chat:newMessage', handleChatMessage);
    socket.on('message:new', handleLegacyMessage);
    socket.on('conversation:updated', handleConversationUpdated);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('chat:error', handleChatError);
      socket.off('chat:newMessage', handleChatMessage);
      socket.off('message:new', handleLegacyMessage);
      socket.off('conversation:updated', handleConversationUpdated);
    };
  }, [socket]);

  useEffect(() => {
    if (!conversationId) {
      setMessages([]);
      return;
    }

    let isMounted = true;
    const loadMessages = async () => {
      setLoadingMessages(true);
      try {
        const res = await api.get(`/chat/conversations/${conversationId}/messages`);
        if (isMounted) {
          setMessages(res.data.messages || []);
        }
      } catch (err) {
        toast.error(err.response?.data?.message || 'Failed to load messages');
      } finally {
        if (isMounted) setLoadingMessages(false);
      }
    };
    loadMessages();

    if (socket?.connected) {
      if (joinedConversationRef.current && joinedConversationRef.current !== conversationId) {
        socket.emit('leaveConversation', { conversationId: joinedConversationRef.current });
      }
      socket.emit('joinConversation', { conversationId });
      joinedConversationRef.current = conversationId;
      socket.emit('chat:readConversation', { conversationId });
    } else {
      api
        .post(`/chat/conversations/${conversationId}/read`)
        .then(() => refreshUnreadCount())
        .catch(() => {});
    }

    setConversations((prev) =>
      prev.map((item) => {
        if (item._id !== conversationId) return item;
        if (user?.role === 'tenant') return { ...item, unreadCountTenant: 0, unreadCount: 0 };
        if (user?.role === 'landlord') return { ...item, unreadCountLandlord: 0, unreadCount: 0 };
        return item;
      })
    );

    return () => {
      if (socket?.connected) {
        socket.emit('leaveConversation', { conversationId });
      }
      isMounted = false;
    };
  }, [conversationId, user?.role, socket, refreshUnreadCount]);

  useEffect(() => {
    if (!messagesEndRef.current) return;
    messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [messages, conversationId]);

  const handleConversationClick = (convId) => {
    navigate(`/chat/${convId}`);
  };

  const handleSend = (event) => {
    event.preventDefault();
    if (!conversationId) return;
    const trimmed = messageText.trim();
    if (!trimmed) return;
    if (!socket?.connected) {
      toast.error('Chat connection not ready');
      return;
    }
    const optimisticMessage = {
      _id: `temp-${Date.now()}`,
      convId: conversationId,
      senderId: currentUserId,
      receiverId: null,
      text: trimmed,
      sentAt: new Date().toISOString(),
      pending: true,
    };
    setMessages((prev) => [...prev, optimisticMessage]);
    socket.emit('message:send', { conversationId, text: trimmed });
    setMessageText('');
  };

  const currentUserId = user?._id;

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="flex flex-col gap-6 md:flex-row">
        <aside className="w-full rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow)] md:w-80">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-[var(--text)]">Messages</p>
              <p className="text-xs text-[var(--muted)]">
                {socketStatus === 'connected' ? 'Live' : 'Connecting...'}
              </p>
            </div>
          </div>

          {loadingConversations && <div className="text-xs text-[var(--muted)]">Loading conversations...</div>}
          {!loadingConversations && conversations.length === 0 && (
            <div className="rounded-xl border border-dashed border-[var(--border)] px-4 py-6 text-center text-sm text-[var(--muted)]">
              No conversations yet.
            </div>
          )}
          <div className="space-y-3">
            {conversations.map((conversation) => {
              const isActive = conversation._id === conversationId;
              const unreadCount =
                user?.role === 'tenant' ? conversation.unreadCountTenant : conversation.unreadCountLandlord;
              const counterpart =
                user?.role === 'tenant'
                  ? conversation.landlordName || 'Landlord'
                  : conversation.tenantName || 'Tenant';
              return (
                <button
                  key={conversation._id}
                  type="button"
                  onClick={() => handleConversationClick(conversation._id)}
                  className={`w-full rounded-xl border px-4 py-3 text-left transition ${
                    isActive
                      ? 'border-[var(--primary)] bg-[var(--surface-2)]'
                      : 'border-[var(--border)] bg-[var(--surface)] hover:border-[var(--primary)]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-[var(--text)]">
                        {conversation.listingTitle || 'Listing'}
                      </p>
                      <p className="text-xs text-[var(--muted)]">{counterpart}</p>
                      <p className="mt-2 text-xs text-[var(--muted)]">
                        {conversation.lastMessageText || 'No messages yet.'}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2 text-[10px] text-[var(--muted)]">
                      <span>{formatTimestamp(conversation.lastMessageAt)}</span>
                      {unreadCount > 0 && (
                        <span className="rounded-full bg-[var(--primary)] px-2 py-0.5 text-[10px] font-semibold text-[var(--on-primary)]">
                          {unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        <section className="flex min-h-[28rem] flex-1 flex-col rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow)]">
          {!conversationId && (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
              <p className="text-lg font-semibold text-[var(--text)]">Select a conversation</p>
              <p className="text-sm text-[var(--muted)]">Choose a chat from the left to view messages.</p>
            </div>
          )}

          {conversationId && (
            <>
              <div className="border-b border-[var(--border)] px-6 py-4">
                <p className="text-sm font-semibold text-[var(--text)]">Conversation</p>
                <p className="text-xs text-[var(--muted)]">
                  {conversations.find((item) => item._id === conversationId)?.listingTitle || 'Listing'}
                </p>
              </div>
              <div className="flex-1 overflow-auto px-6 py-4">
                {loadingMessages && <div className="text-xs text-[var(--muted)]">Loading messages...</div>}
                {!loadingMessages && messages.length === 0 && (
                  <div className="rounded-xl border border-dashed border-[var(--border)] px-4 py-6 text-center text-sm text-[var(--muted)]">
                    Start the conversation by sending a message.
                  </div>
                )}
                <div className="space-y-4">
                  {messages.map((message) => {
                    const isMine = String(message.senderId) === String(currentUserId);
                    return (
                      <div key={message._id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                        <div
                          className={`max-w-[70%] rounded-2xl px-4 py-2 text-sm shadow-sm ${
                            isMine
                              ? 'bg-[var(--primary)] text-[var(--on-primary)]'
                              : 'bg-[var(--surface-2)] text-[var(--text)]'
                          }`}
                        >
                          <p>{message.text}</p>
                          <div
                            className={`mt-1 text-[10px] ${
                              isMine ? 'text-[var(--on-primary)] opacity-80' : 'text-[var(--muted)]'
                            }`}
                          >
                            {formatTimestamp(message.sentAt)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              </div>
              <form onSubmit={handleSend} className="border-t border-[var(--border)] px-6 py-4">
                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    value={messageText}
                    onChange={(event) => setMessageText(event.target.value)}
                    placeholder="Type your message..."
                    className="flex-1 rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]"
                  />
                  <button
                    type="submit"
                    disabled={!messageText.trim() || !socket?.connected}
                    className="rounded-full bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-[var(--on-primary)] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Send
                  </button>
                </div>
              </form>
            </>
          )}
        </section>
      </div>
    </div>
  );
};

export default ChatPage;
