import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { createTicketMessage, fetchTicket, markTicketRead, updateTicketStatus } from '../api/tickets';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';
import { useSupport } from '../context/SupportContext';
import LabelChip from '../components/support/LabelChip';
import StatusPill from '../components/support/StatusPill';
import PriorityPill from '../components/support/PriorityPill';

const formatTimestamp = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const formatRole = (role) => {
  if (!role) return 'Support';
  if (role === 'tenant') return 'Tenant';
  if (role === 'landlord') return 'Landlord';
  if (role === 'admin') return 'Admin';
  return role;
};

const STATUS_OPTIONS = [
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
];

const SupportTicketDetailPage = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const { socket } = useChat();
  const { refreshUnread } = useSupport();
  const [ticket, setTicket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [replyText, setReplyText] = useState('');
  const [loading, setLoading] = useState(true);

  const markAsRead = useCallback(async () => {
    try {
      await markTicketRead(id);
      refreshUnread();
    } catch (err) {
      console.error('Failed to mark ticket read', err);
    }
  }, [id, refreshUnread]);

  const loadTicket = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchTicket(id);
      setTicket(data.ticket);
      setMessages(data.messages || []);
      await markAsRead();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load ticket');
    } finally {
      setLoading(false);
    }
  }, [id, markAsRead]);

  useEffect(() => {
    loadTicket();
  }, [loadTicket]);

  useEffect(() => {
    if (!socket) return undefined;
    const handleMessage = ({ ticketId, message }) => {
      if (!message || ticketId !== id) return;
      setMessages((prev) => {
        if (prev.some((item) => item._id === message._id)) return prev;
        return [...prev, message];
      });
      if (String(message.senderId) !== String(user?._id)) {
        markAsRead();
      }
    };
    socket.on('ticket:message:new', handleMessage);
    return () => {
      socket.off('ticket:message:new', handleMessage);
    };
  }, [socket, id, user?._id, markAsRead]);

  const canManageStatus = useMemo(() => {
    if (!ticket || !user) return false;
    if (user.role === 'tenant') return false;
    return user.role === ticket.assignedToRole;
  }, [ticket, user]);

  const supportPath = useMemo(() => {
    if (user?.role === 'admin') return '/admin/support';
    if (user?.role === 'landlord') return '/dashboard/landlord/support';
    return '/support';
  }, [user?.role]);

  const handleSend = async (event) => {
    event.preventDefault();
    const trimmed = replyText.trim();
    if (!trimmed) return;
    try {
      const data = await createTicketMessage(id, trimmed);
      setMessages((prev) => [...prev, data.message]);
      setReplyText('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send reply');
    }
  };

  const handleStatusChange = async (value) => {
    if (!ticket) return;
    if (ticket.status === value) return;
    try {
      const data = await updateTicketStatus(id, value);
      setTicket((prev) =>
        prev
          ? {
              ...prev,
              status: data.ticket?.status || prev.status,
              lastMessageAt: data.ticket?.lastMessageAt || prev.lastMessageAt,
            }
          : data.ticket
      );
      toast.success('Status updated.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update status');
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-6 py-10 text-sm text-[var(--muted)]">
        Loading ticket...
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="mx-auto max-w-5xl px-6 py-10 text-sm text-[var(--muted)]">
        Ticket not found.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <Link to={supportPath} className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
            Support
          </Link>
          <h1 className="text-2xl font-bold text-[var(--text)]">{ticket.subject}</h1>
          <div className="flex flex-wrap items-center gap-2">
            <LabelChip label={{ labelName: ticket.labelName, labelColor: ticket.labelColor }} />
            <StatusPill status={ticket.status} />
            <PriorityPill priority={ticket.priority} />
          </div>
        </div>
        {canManageStatus && (
          <div
            role="group"
            aria-label="Ticket status"
            className="flex flex-wrap items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] p-1"
          >
            {STATUS_OPTIONS.map((option) => {
              const isActive = ticket.status === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleStatusChange(option.value)}
                  aria-pressed={isActive}
                  className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                    isActive
                      ? 'bg-[var(--primary)] text-[var(--on-primary)] shadow-sm'
                      : 'text-[var(--muted)] hover:text-[var(--text)]'
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-[var(--muted)]">
        <span>Created {formatTimestamp(ticket.createdAt)}</span>
        {ticket.listingId?.title && (
          <span className="rounded-full bg-[var(--surface-2)] px-2 py-0.5 text-[11px] font-semibold text-[var(--muted)]">
            {ticket.listingId.title}
          </span>
        )}
        {ticket.listingId?._id && (
          <Link to={`/listing/${ticket.listingId._id}`} className="text-[var(--primary)]">
            View listing
          </Link>
        )}
      </div>

      <div className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--shadow)]">
        <div className="space-y-4">
          {messages.map((message) => {
            const isSelf = String(message.senderId) === String(user?._id);
            const roleLabel = isSelf ? 'You' : formatRole(message.senderRole);
            return (
              <div key={message._id} className={`flex ${isSelf ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm ${
                    isSelf
                      ? 'bg-[var(--primary)] text-[var(--on-primary)]'
                      : 'bg-[var(--surface-2)] text-[var(--text)]'
                  }`}
                >
                  <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide opacity-80">{roleLabel}</div>
                  <p className="whitespace-pre-wrap">{message.text}</p>
                  <div className="mt-2 text-[10px] opacity-75">{formatTimestamp(message.createdAt)}</div>
                </div>
              </div>
            );
          })}
        </div>

        <form onSubmit={handleSend} className="mt-6 border-t border-[var(--border)] pt-4">
          <label className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Reply</label>
          <textarea
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            rows={4}
            className="mt-2 w-full resize-none rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]"
            placeholder="Write a reply..."
          />
          <div className="mt-3 flex items-center justify-between">
            <p className="text-xs text-[var(--muted)]">Replies are shared with the assigned team.</p>
            <button
              type="submit"
              className="rounded-full bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-[var(--on-primary)] hover:brightness-110"
            >
              Send reply
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SupportTicketDetailPage;
