import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

const useQuery = () => new URLSearchParams(useLocation().search);

const SearchResultsPage = () => {
  const query = useQuery();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [filters, setFilters] = useState({
    title: query.get('title') || '',
    location: query.get('location') || '',
    maxRent: query.get('maxRent') || '',
    roomType: query.get('roomType') || '',
  });
  const [results, setResults] = useState([]);
  const [saveMsg, setSaveMsg] = useState('');
  const [saveStatus, setSaveStatus] = useState('');
  const [saving, setSaving] = useState(false);

  const search = async () => {
    const payload = {
      title: filters.title,
      location: filters.location,
      maxRent: filters.maxRent,
      roomType: filters.roomType,
    };
    const res = await api.post('/listings/search', payload);
    setResults(res.data.listings || []);
  };

  useEffect(() => {
    search();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSubmit = (e) => {
    e.preventDefault();
    const params = new URLSearchParams(filters);
    navigate(`/search?${params.toString()}`);
    search();
  };

  const onSaveFilter = async () => {
    if (!user || user.role !== 'tenant') {
      setSaveMsg('Login as a tenant to save filters.');
      setSaveStatus('error');
      return;
    }

    try {
      setSaving(true);
      setSaveMsg('');
      setSaveStatus('');
      const payload = {
        name: filters.title || filters.location || 'My Saved Filter',
        title: filters.title,
        location: filters.location,
        maxRent: filters.maxRent ? Number(filters.maxRent) : undefined,
        roomType: filters.roomType,
      };
      await api.post('/filters', payload);
      setSaveMsg('Filter saved.');
      setSaveStatus('success');
    } catch (err) {
      setSaveMsg(err.response?.data?.message || 'Failed to save filter.');
      setSaveStatus('error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <h1 className="text-3xl font-bold text-slate-900">Search Results</h1>
      <form
        onSubmit={onSubmit}
        className="mt-4 grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-6"
      >
        <input
          type="text"
          value={filters.title}
          onChange={(e) => setFilters((f) => ({ ...f, title: e.target.value }))}
          placeholder="Title keywords"
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />
        <input
          type="text"
          value={filters.location}
          onChange={(e) => setFilters((f) => ({ ...f, location: e.target.value }))}
          placeholder="Location"
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />
        <input
          type="number"
          value={filters.maxRent}
          onChange={(e) => setFilters((f) => ({ ...f, maxRent: e.target.value }))}
          placeholder="Max Rent"
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />
        <select
          value={filters.roomType}
          onChange={(e) => setFilters((f) => ({ ...f, roomType: e.target.value }))}
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        >
          <option value="">Room Type</option>
          <option value="Entire Place">Entire Place</option>
          <option value="Single">Single</option>
          <option value="Studio">Studio</option>
          <option value="Shared">Shared</option>
        </select>
        <button type="submit" className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white">
          Search
        </button>
        {user?.role === 'tenant' && (
          <button
            type="button"
            onClick={onSaveFilter}
            disabled={saving}
            className="rounded-lg border border-blue-700 px-4 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? 'Saving...' : 'Save Filter'}
          </button>
        )}
      </form>
      {saveMsg && (
        <div
          className={`mt-2 text-sm font-semibold ${
            saveStatus === 'error' ? 'text-red-700' : 'text-green-700'
          }`}
        >
          {saveMsg}
        </div>
      )}

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        {results.map((l) => (
          <div key={l._id} className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col gap-3 p-4 md:flex-row">
              <div className="h-32 w-full rounded-lg bg-slate-200 md:w-40">
                <img
                  src={
                    l.photos?.[0] ||
                    'https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=800&q=80'
                  }
                  alt={l.title}
                  className="h-full w-full rounded-lg object-cover"
                />
              </div>
              <div className="flex-1">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-lg font-semibold text-slate-900">{l.title}</div>
                    <div className="text-sm text-slate-600">{l.address}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-blue-700">${l.rent}/mo</div>
                    <div className="text-xs text-slate-500 capitalize">{l.status}</div>
                  </div>
                </div>
                <div className="mt-2 text-sm text-slate-600">
                  {l.explanation || 'Within your filters and budget.'}
                </div>
                <div className="mt-3 flex items-center gap-2 text-xs text-slate-600">
                  <span className="rounded-full bg-slate-100 px-2 py-1">{l.beds} Beds</span>
                  <span className="rounded-full bg-slate-100 px-2 py-1">{l.baths} Baths</span>
                  <span className="rounded-full bg-slate-100 px-2 py-1">{l.roomType}</span>
                </div>
                <button
                  onClick={() => navigate(`/listing/${l._id}`)}
                  className="mt-3 inline-block rounded-lg bg-blue-700 px-3 py-2 text-sm font-semibold text-white"
                >
                  View Details
                </button>
              </div>
            </div>
          </div>
        ))}
        {!results.length && (
          <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-600">
            No listings found. Adjust filters and search again.
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchResultsPage;
