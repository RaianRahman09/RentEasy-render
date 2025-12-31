import React, { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../api/axios';
import { createTicket, fetchMyTickets } from '../api/tickets';
import TicketList from '../components/support/TicketList';
import { formatListingAddress } from '../utils/address';
import { TICKET_LABELS, hexToRgba } from '../utils/supportLabels';

const isLightColor = (hex) => {
  if (!hex) return false;
  const normalized = hex.replace('#', '');
  if (normalized.length !== 6) return false;
  const value = Number.parseInt(normalized, 16);
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return luminance > 0.7;
};

const STATUS_ORDER = { open: 1, in_progress: 2, resolved: 3, closed: 4 };
const TYPE_ORDER = { technical: 1, property: 2 };

const SupportCenterPage = () => {
  const [rentals, setRentals] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [loadingTickets, setLoadingTickets] = useState(true);
  const [filters, setFilters] = useState({ status: '', type: '', label: '' });
  const [sortBy, setSortBy] = useState('updated');
  const [form, setForm] = useState({
    type: 'technical',
    subject: '',
    description: '',
    labelKey: TICKET_LABELS.technical[0]?.key || '',
    listingId: '',
    priority: 'medium',
  });

  const loadRentals = useCallback(async () => {
    try {
      const res = await api.get('/tenant/rentals');
      setRentals(res.data?.rentals || []);
    } catch (err) {
      console.error('Failed to load rentals', err);
    }
  }, []);

  const loadTickets = useCallback(async () => {
    setLoadingTickets(true);
    try {
      const params = {};
      if (filters.status) params.status = filters.status;
      if (filters.type) params.type = filters.type;
      if (filters.label) params.label = filters.label;
      const data = await fetchMyTickets(params);
      setTickets(data?.tickets || []);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load tickets');
    } finally {
      setLoadingTickets(false);
    }
  }, [filters]);

  useEffect(() => {
    loadRentals();
  }, [loadRentals]);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  useEffect(() => {
    const labels = TICKET_LABELS[form.type] || [];
    const hasCurrent = labels.some((label) => label.key === form.labelKey);
    if (!hasCurrent) {
      setForm((prev) => ({ ...prev, labelKey: labels[0]?.key || '' }));
    }
    if (form.type === 'technical' && form.listingId) {
      setForm((prev) => ({ ...prev, listingId: '' }));
    }
  }, [form.type, form.labelKey, form.listingId]);

  useEffect(() => {
    if (form.type !== 'property') return;
    if (form.listingId) return;
    if (!rentals.length) return;
    setForm((prev) => ({ ...prev, listingId: rentals[0]?.listing?._id || '' }));
  }, [form.type, form.listingId, rentals]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const payload = {
      type: form.type,
      subject: form.subject.trim(),
      description: form.description.trim(),
      labelKey: form.labelKey,
      priority: form.priority,
    };
    if (!payload.subject || !payload.description) {
      toast.error('Subject and description are required.');
      return;
    }
    if (form.type === 'property') {
      if (!form.listingId) {
        toast.error('Select a rented listing for this complaint.');
        return;
      }
      payload.listingId = form.listingId;
    }

    try {
      await createTicket(payload);
      toast.success('Ticket created.');
      setForm((prev) => ({
        ...prev,
        subject: '',
        description: '',
      }));
      loadTickets();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create ticket');
    }
  };

  const sortedTickets = useMemo(() => {
    const list = [...tickets];
    if (sortBy === 'status') {
      list.sort((a, b) => (STATUS_ORDER[a.status] || 99) - (STATUS_ORDER[b.status] || 99));
    } else if (sortBy === 'type') {
      list.sort((a, b) => (TYPE_ORDER[a.type] || 99) - (TYPE_ORDER[b.type] || 99));
    } else if (sortBy === 'label') {
      list.sort((a, b) => (a.labelName || '').localeCompare(b.labelName || ''));
    } else {
      list.sort((a, b) => new Date(b.lastMessageAt || 0) - new Date(a.lastMessageAt || 0));
    }
    return list;
  }, [tickets, sortBy]);

  const labelOptions = form.type ? TICKET_LABELS[form.type] || [] : [];
  const filterLabelOptions = filters.type
    ? TICKET_LABELS[filters.type] || []
    : [...TICKET_LABELS.technical, ...TICKET_LABELS.property];
  const selectedLabel = labelOptions.find((label) => label.key === form.labelKey);

  const buildLabelStyle = (label, isActive) => {
    const color = label.color || '#94a3b8';
    if (isActive) {
      return {
        borderColor: color,
        color,
        backgroundColor: hexToRgba(color, 0.22),
        boxShadow: `0 0 0 3px ${hexToRgba(color, 0.25)}`,
        transform: 'translateY(-1px) scale(1.02)',
      };
    }
    return {
      borderColor: 'var(--border)',
      color: 'var(--text)',
      backgroundColor: hexToRgba(color, 0.08),
    };
  };

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold text-[var(--text)]">Support Center</h1>
        <p className="text-sm text-[var(--muted)]">
          Open a new ticket or review existing requests. Technical issues go straight to our admin team.
        </p>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.1fr_1.4fr]">
        <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--shadow)]">
          <h2 className="text-lg font-semibold text-[var(--text)]">Create Ticket</h2>
          <p className="mt-1 text-xs text-[var(--muted)]">We respond within 24 hours on weekdays.</p>

          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Subject</label>
              <input
                value={form.subject}
                onChange={(e) => setForm((prev) => ({ ...prev, subject: e.target.value }))}
                className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]"
                placeholder="Brief summary"
              />
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Ticket type</label>
                <select
                  value={form.type}
                  onChange={(e) => setForm((prev) => ({ ...prev, type: e.target.value }))}
                  className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm text-[var(--text)]"
                >
                  <option value="technical">Technical</option>
                  <option value="property">Property complaint</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Priority</label>
                <select
                  value={form.priority}
                  onChange={(e) => setForm((prev) => ({ ...prev, priority: e.target.value }))}
                  className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm text-[var(--text)]"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
            </div>

            {form.type === 'property' && (
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Related listing</label>
                <select
                  value={form.listingId}
                  onChange={(e) => setForm((prev) => ({ ...prev, listingId: e.target.value }))}
                  className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm text-[var(--text)]"
                >
                  <option value="">Select a rented listing</option>
                  {rentals.map((rental) => (
                    <option key={rental.rentalId} value={rental.listing?._id}>
                      {rental.listing?.title || 'Listing'} - {formatListingAddress(rental.listing) || 'Address'}
                    </option>
                  ))}
                </select>
                {!rentals.length && (
                  <p className="mt-2 text-xs text-[var(--danger)]">
                    You do not have any active rentals eligible for property complaints.
                  </p>
                )}
              </div>
            )}

            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Label</label>
              <div role="radiogroup" aria-label="Ticket labels" className="mt-2 flex flex-wrap gap-2">
                {labelOptions.map((label) => {
                  const isActive = form.labelKey === label.key;
                  const checkColor = isLightColor(label.color) ? '#0b0f15' : '#ffffff';
                  return (
                    <button
                      key={label.key}
                      type="button"
                      onClick={() => setForm((prev) => ({ ...prev, labelKey: label.key }))}
                      role="radio"
                      aria-checked={isActive}
                      aria-pressed={isActive}
                      className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] ${
                        isActive ? 'shadow-md' : 'hover:-translate-y-0.5 hover:shadow-sm'
                      }`}
                      style={buildLabelStyle(label, isActive)}
                    >
                      <span
                        className="flex h-4 w-4 items-center justify-center rounded-full border"
                        style={{
                          borderColor: label.color,
                          backgroundColor: isActive ? label.color : 'transparent',
                        }}
                      >
                        {isActive ? (
                          <svg
                            viewBox="0 0 16 16"
                            aria-hidden="true"
                            className="h-3 w-3"
                            fill="none"
                            stroke={checkColor}
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M3.5 8.5l2.5 2.5 6.5-6.5" />
                          </svg>
                        ) : (
                          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: label.color }} />
                        )}
                      </span>
                      {label.name}
                    </button>
                  );
                })}
              </div>
              {selectedLabel && (
                <p className="mt-2 text-xs text-[var(--muted)]">
                  Selected label: <span className="font-semibold text-[var(--text)]">{selectedLabel.name}</span>
                </p>
              )}
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Description</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                rows={5}
                className="mt-2 w-full resize-none rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]"
                placeholder="Add details that help us resolve the issue faster."
              />
            </div>

            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-full bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-[var(--on-primary)] hover:brightness-110 active:brightness-95"
            >
              Submit ticket
            </button>
          </form>
        </section>

        <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--shadow)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-[var(--text)]">My Support Tickets</h2>
              <p className="text-xs text-[var(--muted)]">Track updates and responses from your support team.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs">
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
                value={filters.type}
                onChange={(e) => setFilters((prev) => ({ ...prev, type: e.target.value, label: '' }))}
                className="rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1"
              >
                <option value="">All types</option>
                <option value="technical">Technical</option>
                <option value="property">Property</option>
              </select>
              <select
                value={filters.label}
                onChange={(e) => setFilters((prev) => ({ ...prev, label: e.target.value }))}
                className="rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1"
              >
                <option value="">All labels</option>
                {filterLabelOptions.map((label) => (
                  <option key={label.key} value={label.key}>
                    {label.name}
                  </option>
                ))}
              </select>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1"
              >
                <option value="updated">Last updated</option>
                <option value="status">Status</option>
                <option value="type">Type</option>
                <option value="label">Label</option>
              </select>
            </div>
          </div>

          <div className="mt-4">
            {loadingTickets ? (
              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-6 text-sm text-[var(--muted)]">
                Loading tickets...
              </div>
            ) : (
              <TicketList
                tickets={sortedTickets}
                emptyMessage="No tickets yet. Submit your first request to get started."
                showListing
              />
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default SupportCenterPage;
