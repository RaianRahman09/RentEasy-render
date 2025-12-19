import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';

const StatCard = ({ title, value, subtitle }) => (
  <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
    <div className="text-xs font-semibold uppercase text-slate-500">{title}</div>
    <div className="mt-2 text-2xl font-bold text-slate-900">{value}</div>
    {subtitle && <div className="text-sm text-slate-600">{subtitle}</div>}
  </div>
);

const emptyForm = { name: '', title: '', location: '', maxRent: '', roomType: '' };

const TenantDashboard = () => {
  const [data, setData] = useState(null);
  const [savedFilters, setSavedFilters] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [message, setMessage] = useState('');
  const [messageTone, setMessageTone] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      const res = await api.get('/dashboard/tenant');
      const filters = res.data.savedFilters || res.data.savedSearches || [];
      setData(res.data);
      setSavedFilters(filters);
    };
    load();
  }, []);

  const startEdit = (filter) => {
    setEditingId(filter._id);
    setForm({
      name: filter.name || '',
      title: filter.title || '',
      location: filter.location || '',
      maxRent: typeof filter.maxRent === 'number' ? String(filter.maxRent) : '',
      roomType: filter.roomType || '',
    });
    setMessage('');
    setMessageTone('');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(emptyForm);
    setMessage('');
    setMessageTone('');
  };

  const saveEdit = async () => {
    if (!editingId) return;
    try {
      const payload = {
        name: form.name,
        title: form.title,
        location: form.location,
        maxRent: form.maxRent === '' ? null : Number(form.maxRent),
        roomType: form.roomType,
      };
      const res = await api.put(`/filters/${editingId}`, payload);
      const updatedFilters = savedFilters.map((f) => (f._id === editingId ? res.data.filter : f));
      setSavedFilters(updatedFilters);
      setData((d) => (d ? { ...d, savedFilters: updatedFilters } : d));
      setMessage('Filter updated.');
      setMessageTone('success');
      setEditingId(null);
      setForm(emptyForm);
    } catch (err) {
      setMessage(err.response?.data?.message || 'Failed to update filter.');
      setMessageTone('error');
    }
  };

  if (!data) return null;

  const filterSummary = (filter) => {
    const parts = [];
    if (filter.title) parts.push(`Title: ${filter.title}`);
    if (filter.location) parts.push(`Location: ${filter.location}`);
    if (typeof filter.maxRent === 'number') parts.push(`Max Rent: $${filter.maxRent}`);
    if (filter.roomType) parts.push(`Room: ${filter.roomType}`);
    return parts.join(' • ') || 'Any listing';
  };

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <h1 className="text-3xl font-bold text-slate-900">My Dashboard</h1>
      <div className="mt-6 grid gap-4 md:grid-cols-4">
        <StatCard title="Upcoming Viewings" value={data.upcomingViewings} subtitle="This week" />
        <StatCard title="Saved Filters" value={savedFilters.length} subtitle="Active searches" />
        <StatCard title="New Messages" value={data.messages} subtitle="Unread messages" />
        <StatCard title="Open Tickets" value={data.tickets} subtitle="Support requests" />
      </div>

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Saved Filters</h2>
            <button className="text-sm font-semibold text-blue-700" onClick={() => navigate('/search')}>
              Go to Search
            </button>
          </div>
          {message && (
            <div
              className={`mt-2 text-sm font-semibold ${
                messageTone === 'error' ? 'text-red-700' : 'text-green-700'
              }`}
            >
              {message}
            </div>
          )}
          <ul className="mt-3 space-y-3 text-sm text-slate-700">
            {savedFilters.length === 0 && (
              <li className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
                No saved filters yet. Run a search and tap “Save Filter.”
              </li>
            )}
            {savedFilters.map((s) => (
              <li key={s._id} className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                {editingId === s._id ? (
                  <div className="space-y-2">
                    <div className="grid gap-2 md:grid-cols-2">
                      <input
                        type="text"
                        value={form.name}
                        onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                        placeholder="Filter name"
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                      />
                      <input
                        type="text"
                        value={form.title}
                        onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                        placeholder="Title keyword"
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                      />
                      <input
                        type="text"
                        value={form.location}
                        onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                        placeholder="Location"
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                      />
                      <input
                        type="number"
                        value={form.maxRent}
                        onChange={(e) => setForm((f) => ({ ...f, maxRent: e.target.value }))}
                        placeholder="Max rent"
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                      />
                      <select
                        value={form.roomType}
                        onChange={(e) => setForm((f) => ({ ...f, roomType: e.target.value }))}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                      >
                        <option value="">Room Type</option>
                        <option value="Entire Place">Entire Place</option>
                        <option value="Single">Single</option>
                        <option value="Studio">Studio</option>
                        <option value="Shared">Shared</option>
                      </select>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={saveEdit}
                        className="rounded-lg bg-blue-700 px-3 py-2 text-xs font-semibold text-white"
                      >
                        Save
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="font-semibold text-slate-900">{s.name}</div>
                      <div className="text-xs text-slate-500">{filterSummary(s)}</div>
                    </div>
                    <button
                      onClick={() => startEdit(s)}
                      className="text-xs font-semibold text-blue-700 underline underline-offset-2"
                    >
                      Edit
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Upcoming Appointments</h2>
            <button className="text-sm font-semibold text-blue-700">View all</button>
          </div>
          <ul className="mt-3 space-y-3 text-sm text-slate-700">
            {(data.appointments || []).map((a) => (
              <li key={a.listing} className="rounded-lg bg-slate-50 px-3 py-2">
                <div className="font-semibold text-slate-900">{a.listing}</div>
                <div className="text-xs text-slate-500">
                  {a.date} • {a.status}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Recent Messages</h2>
          <ul className="mt-3 space-y-3 text-sm text-slate-700">
            {(data.recentMessages || []).map((m) => (
              <li key={m.from} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                <div>
                  <div className="font-semibold">{m.from}</div>
                  <div className="text-xs text-slate-500">{m.listing}</div>
                </div>
                <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-700">
                  {m.unread} unread
                </span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Support Tickets</h2>
          <div className="mt-2 text-sm text-slate-700">You have {data.tickets} open ticket.</div>
          <button className="mt-3 rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white">
            Go to Support Center
          </button>
        </div>
      </div>
    </div>
  );
};

export default TenantDashboard;
