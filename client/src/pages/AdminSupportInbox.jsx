import React, { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { fetchAdminTickets } from '../api/tickets';
import TicketList from '../components/support/TicketList';
import { TICKET_LABELS } from '../utils/supportLabels';

const AdminSupportInbox = () => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    label: '',
    status: '',
    priority: '',
    from: '',
    to: '',
  });

  const loadTickets = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.label) params.label = filters.label;
      if (filters.status) params.status = filters.status;
      if (filters.priority) params.priority = filters.priority;
      if (filters.from) params.from = filters.from;
      if (filters.to) params.to = filters.to;
      const data = await fetchAdminTickets(params);
      setTickets(data?.tickets || []);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load tickets');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold text-[var(--text)]">Admin Support Inbox</h1>
        <p className="text-sm text-[var(--muted)]">Technical issues only. Assigned tickets appear here.</p>
      </div>

      <div className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--shadow)]">
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <select
            value={filters.label}
            onChange={(e) => setFilters((prev) => ({ ...prev, label: e.target.value }))}
            className="rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1"
          >
            <option value="">All labels</option>
            {TICKET_LABELS.technical.map((label) => (
              <option key={label.key} value={label.key}>
                {label.name}
              </option>
            ))}
          </select>
          <select
            value={filters.status}
            onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}
            className="rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1"
          >
            <option value="">All statuses</option>
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>
          <select
            value={filters.priority}
            onChange={(e) => setFilters((prev) => ({ ...prev, priority: e.target.value }))}
            className="rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1"
          >
            <option value="">All priorities</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
          <input
            type="date"
            value={filters.from}
            onChange={(e) => setFilters((prev) => ({ ...prev, from: e.target.value }))}
            className="rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1"
          />
          <input
            type="date"
            value={filters.to}
            onChange={(e) => setFilters((prev) => ({ ...prev, to: e.target.value }))}
            className="rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1"
          />
        </div>

        <div className="mt-5">
          {loading ? (
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-6 text-sm text-[var(--muted)]">
              Loading tickets...
            </div>
          ) : (
            <TicketList
              tickets={tickets}
              showTenant
              showListing={false}
              emptyMessage="No technical tickets assigned yet."
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminSupportInbox;
