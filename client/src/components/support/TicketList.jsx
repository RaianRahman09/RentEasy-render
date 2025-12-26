import React from 'react';
import { Link } from 'react-router-dom';
import LabelChip from './LabelChip';
import StatusPill from './StatusPill';
import PriorityPill from './PriorityPill';

const formatDate = (value) => {
  if (!value) return 'N/A';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'N/A';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

const TicketList = ({ tickets, emptyMessage, showTenant = false, showListing = true }) => {
  if (!tickets.length) {
    return <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-6 text-sm text-[var(--muted)]">{emptyMessage}</div>;
  }

  return (
    <div className="space-y-3">
      {tickets.map((ticket) => (
        <Link
          key={ticket._id}
          to={`/support/tickets/${ticket._id}`}
          className="block rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow)] transition hover:border-[var(--primary)]"
        >
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <p className="text-sm font-semibold text-[var(--text)]">{ticket.subject}</p>
                {ticket.unreadCount > 0 && (
                  <span className="inline-flex min-w-[20px] items-center justify-center rounded-full bg-[var(--danger)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--on-danger)]">
                    {ticket.unreadCount > 99 ? '99+' : ticket.unreadCount}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--muted)]">
                <span className="uppercase tracking-wide">{ticket.type}</span>
                {showListing && ticket.listingTitle && (
                  <span className="rounded-full bg-[var(--surface-2)] px-2 py-0.5 text-[11px] font-semibold text-[var(--muted)]">
                    {ticket.listingTitle}
                  </span>
                )}
                {showTenant && ticket.tenantName && (
                  <span className="rounded-full bg-[var(--surface-2)] px-2 py-0.5 text-[11px] font-semibold text-[var(--muted)]">
                    {ticket.tenantName}
                  </span>
                )}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <LabelChip label={{ labelName: ticket.labelName, labelColor: ticket.labelColor }} />
              <StatusPill status={ticket.status} />
              <PriorityPill priority={ticket.priority} />
              <span className="text-xs text-[var(--muted)]">Updated {formatDate(ticket.lastMessageAt)}</span>
              <span className="rounded-full border border-[var(--border)] px-2.5 py-1 text-[11px] font-semibold text-[var(--primary)]">
                View
              </span>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
};

export default TicketList;
