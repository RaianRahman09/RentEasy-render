import React, { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { fetchLandlordTickets } from '../api/tickets';
import TicketList from '../components/support/TicketList';
import { TICKET_LABELS } from '../utils/supportLabels';

const LandlordSupportInbox = () => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    label: '',
    status: '',
    priority: '',
    listingId: '',
  });

  const loadTickets = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.label) params.label = filters.label;
      if (filters.status) params.status = filters.status;
      if (filters.priority) params.priority = filters.priority;
      if (filters.listingId) params.listingId = filters.listingId;
      const data = await fetchLandlordTickets(params);
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

  const listingOptions = useMemo(() => {
    const map = new Map();
    tickets.forEach((ticket) => {
      if (!ticket.listingId || !ticket.listingTitle) return;
      map.set(String(ticket.listingId), ticket.listingTitle);
    });
    return Array.from(map.entries()).map(([id, title]) => ({ id, title }));
  }, [tickets]);

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold text-[var(--text)]">Landlord Support Inbox</h1>
        <p className="text-sm text-[var(--muted)]">Property complaints tied to your active rentals.</p>
      </div>

      <div className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--shadow)]">
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <select
            value={filters.listingId}
            onChange={(e) => setFilters((prev) => ({ ...prev, listingId: e.target.value }))}
            className="rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1"
          >
            <option value="">All listings</option>
            {listingOptions.map((listing) => (
              <option key={listing.id} value={listing.id}>
                {listing.title}
              </option>
            ))}
          </select>
          <select
            value={filters.label}
            onChange={(e) => setFilters((prev) => ({ ...prev, label: e.target.value }))}
            className="rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1"
          >
            <option value="">All labels</option>
            {TICKET_LABELS.property.map((label) => (
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
        </div>

        <div className="mt-5">
          {loading ? (
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-6 text-sm text-[var(--muted)]">
              Loading tickets...
            </div>
          ) : (
            <TicketList tickets={tickets} showTenant emptyMessage="No property complaints assigned yet." />
          )}
        </div>
      </div>
    </div>
  );
};

export default LandlordSupportInbox;
