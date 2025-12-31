import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import SearchResultsMap from '../components/maps/SearchResultsMap';
import { formatListingAddress } from '../utils/address';
import { formatRentStartMonth } from '../utils/rentStartMonth';

const DEFAULT_CENTER = { lat: 23.8103, lng: 90.4125 };
const MAX_BUDGET = 100000;
const MIN_BUDGET = 0;
const BUDGET_STEP = 1000;
const MAP_DEBOUNCE_MS = 300;
const budgetFormatter = new Intl.NumberFormat('en-BD');

const parseMaxBudget = (params) => {
  const rawValue = params.get('maxBudget') ?? params.get('maxRent');
  if (rawValue === null || rawValue === '') return MAX_BUDGET;
  const parsed = Number(rawValue);
  if (!Number.isFinite(parsed)) return MAX_BUDGET;
  return Math.min(Math.max(parsed, MIN_BUDGET), MAX_BUDGET);
};

const getFiltersFromSearch = (search) => {
  const params = new URLSearchParams(search);
  return {
    title: params.get('title') || '',
    location: params.get('location') || '',
    maxBudget: parseMaxBudget(params),
    roomType: params.get('roomType') || '',
    rentStartMonth: params.get('rentStartMonth') || '',
  };
};

const buildApiParams = (nextFilters, bounds) => {
  const params = {
    location: nextFilters.location || undefined,
    locationText: nextFilters.location || undefined,
    keywords: nextFilters.title || undefined,
    title: nextFilters.title || undefined,
    maxBudget: Number.isFinite(nextFilters.maxBudget) ? nextFilters.maxBudget : undefined,
    roomType: nextFilters.roomType || undefined,
    rentStartMonth: nextFilters.rentStartMonth || undefined,
  };
  if (bounds?.ne && bounds?.sw) {
    params.neLat = bounds.ne.lat;
    params.neLng = bounds.ne.lng;
    params.swLat = bounds.sw.lat;
    params.swLng = bounds.sw.lng;
  }
  return params;
};

const SearchResultsPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [filters, setFilters] = useState(() => getFiltersFromSearch(location.search));
  const [visibleProperties, setVisibleProperties] = useState([]);
  const [mapCenter, setMapCenter] = useState(DEFAULT_CENTER);
  const [mapBounds, setMapBounds] = useState(null);
  const [activeListingId, setActiveListingId] = useState(null);
  const [viewMode, setViewMode] = useState('list');
  const [loading, setLoading] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [saveStatus, setSaveStatus] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const appliedFiltersRef = useRef(getFiltersFromSearch(location.search));
  const activeBoundsRef = useRef(null);
  const debounceRef = useRef(null);
  const requestIdRef = useRef(0);

  const buildSearchParams = (nextFilters) => {
    const params = new URLSearchParams();
    if (nextFilters.title) params.append('title', nextFilters.title);
    if (nextFilters.location) params.append('location', nextFilters.location);
    if (Number.isFinite(nextFilters.maxBudget)) params.append('maxBudget', String(nextFilters.maxBudget));
    if (nextFilters.roomType) params.append('roomType', nextFilters.roomType);
    if (nextFilters.rentStartMonth) params.append('rentStartMonth', nextFilters.rentStartMonth);
    return params;
  };

  const fetchSearchResults = useCallback(async (nextFilters, bounds, options = {}) => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/listings/search', {
        params: buildApiParams(nextFilters, bounds),
      });
      if (requestId !== requestIdRef.current) return;
      setVisibleProperties(res.data.listings || []);
      if (options.updateMap) {
        setMapCenter(res.data.mapCenter || DEFAULT_CENTER);
        setMapBounds(res.data.defaultBounds || null);
        activeBoundsRef.current = res.data.defaultBounds || null;
      }
      setActiveListingId(null);
    } catch (err) {
      if (requestId !== requestIdRef.current) return;
      console.error(err);
      setError(err.response?.data?.message || 'Failed to fetch listings.');
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    const nextFilters = getFiltersFromSearch(location.search);
    const prevFilters = appliedFiltersRef.current;
    const locationChanged = nextFilters.location !== prevFilters.location;
    if (locationChanged) {
      activeBoundsRef.current = null;
    }
    appliedFiltersRef.current = nextFilters;
    setFilters(nextFilters);
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    const boundsToUse = locationChanged ? null : activeBoundsRef.current;
    fetchSearchResults(nextFilters, boundsToUse, { updateMap: !boundsToUse });
  }, [fetchSearchResults, location.search]);

  useEffect(
    () => () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    },
    []
  );

  const formattedBudget = useMemo(() => budgetFormatter.format(filters.maxBudget), [filters.maxBudget]);
  const budgetPercent = useMemo(
    () => Math.round((filters.maxBudget / MAX_BUDGET) * 100),
    [filters.maxBudget]
  );

  const onSubmit = (e) => {
    e.preventDefault();
    const params = buildSearchParams(filters);
    navigate(`/search?${params.toString()}`);
  };

  const commitMaxBudget = (value) => {
    const nextFilters = { ...filters, maxBudget: value };
    setFilters(nextFilters);
    const params = buildSearchParams(nextFilters);
    navigate(`/search?${params.toString()}`);
  };

  const onClearRentStartMonth = () => {
    const nextFilters = { ...filters, rentStartMonth: '', maxBudget: MAX_BUDGET };
    setFilters(nextFilters);
    const params = buildSearchParams(nextFilters);
    navigate(`/search?${params.toString()}`);
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
        maxRent: Number.isFinite(filters.maxBudget) ? filters.maxBudget : undefined,
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

  const onMapMoved = (bounds) => {
    if (!bounds) return;
    const ne = bounds.getNorthEast();
    const sw = bounds.getSouthWest();
    const nextBounds = {
      ne: { lat: ne.lat, lng: ne.lng },
      sw: { lat: sw.lat, lng: sw.lng },
    };
    activeBoundsRef.current = nextBounds;
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      fetchSearchResults(appliedFiltersRef.current, nextBounds, { updateMap: false });
    }, MAP_DEBOUNCE_MS);
  };

  const activeListing = visibleProperties.find((listing) => listing._id === activeListingId);

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <h1 className="text-3xl font-bold text-[var(--text)]">Find Properties</h1>
      <p className="mt-2 text-sm text-[var(--muted)]">
        Search by neighborhood or city and explore listings with the map.
      </p>

      <form
        onSubmit={onSubmit}
        className="mt-5 grid gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow)] md:grid-cols-[1.2fr_0.9fr_1.3fr_0.8fr_1fr_auto_auto]"
      >
        <input
          type="text"
          value={filters.location}
          onChange={(e) => setFilters((f) => ({ ...f, location: e.target.value }))}
          placeholder="Location (Banani, Gulshan, Dhanmondi...)"
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm text-[var(--text)] placeholder:text-[var(--muted)] focus:border-[var(--primary)] focus:outline-none"
        />
        <input
          type="text"
          value={filters.title}
          onChange={(e) => setFilters((f) => ({ ...f, title: e.target.value }))}
          placeholder="Keywords"
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm text-[var(--text)] placeholder:text-[var(--muted)] focus:border-[var(--primary)] focus:outline-none"
        />
        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2">
          <div className="flex items-center justify-between text-xs font-semibold text-[var(--muted)]">
            <span>Max Budget</span>
            <span className="text-[var(--text)]">৳{formattedBudget}</span>
          </div>
          <input
            type="range"
            min={MIN_BUDGET}
            max={MAX_BUDGET}
            step={BUDGET_STEP}
            value={filters.maxBudget}
            onChange={(e) => setFilters((f) => ({ ...f, maxBudget: Number(e.target.value) }))}
            onMouseUp={(e) => commitMaxBudget(Number(e.currentTarget.value))}
            onTouchEnd={(e) => commitMaxBudget(Number(e.currentTarget.value))}
            aria-label="Max budget"
            className="budget-slider mt-3 w-full"
            style={{
              background: `linear-gradient(to right, var(--primary) 0%, var(--primary) ${budgetPercent}%, var(--surface-2) ${budgetPercent}%, var(--surface-2) 100%)`,
            }}
          />
          <div className="mt-2 flex items-center justify-between text-[10px] text-[var(--muted)]">
            <span>৳0</span>
            <span>৳{budgetFormatter.format(MAX_BUDGET)}</span>
          </div>
        </div>
        <select
          value={filters.roomType}
          onChange={(e) => setFilters((f) => ({ ...f, roomType: e.target.value }))}
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm text-[var(--text)] focus:border-[var(--primary)] focus:outline-none"
        >
          <option value="">Room Type</option>
          <option value="Entire Place">Entire Place</option>
          <option value="Single">Single</option>
          <option value="Studio">Studio</option>
          <option value="Shared">Shared</option>
        </select>
        <div className="flex items-center gap-2">
          <input
            type="month"
            value={filters.rentStartMonth}
            onChange={(e) => setFilters((f) => ({ ...f, rentStartMonth: e.target.value }))}
            aria-label="Rent starting month"
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm text-[var(--text)] focus:border-[var(--primary)] focus:outline-none"
          />
          <button
            type="button"
            onClick={onClearRentStartMonth}
            disabled={!filters.rentStartMonth}
            className="rounded-lg border border-[var(--border)] px-3 py-2 text-xs font-semibold text-[var(--muted)] transition hover:bg-[var(--surface-2)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            Clear Filter
          </button>
        </div>
        <button
          type="submit"
          className="rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-[var(--on-primary)] hover:brightness-110 active:brightness-95"
        >
          Search
        </button>
        {user?.role === 'tenant' && (
          <button
            type="button"
            onClick={onSaveFilter}
            disabled={saving}
            className="rounded-lg border border-[var(--primary)] px-4 py-2 text-sm font-semibold text-[var(--primary)] transition hover:bg-[var(--surface-2)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? 'Saving...' : 'Save Filter'}
          </button>
        )}
      </form>

      {saveMsg && (
        <div
          className={`mt-2 text-sm font-semibold ${
            saveStatus === 'error' ? 'text-[var(--danger)]' : 'text-[var(--primary)]'
          }`}
        >
          {saveMsg}
        </div>
      )}

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-[var(--muted)]">
          {loading ? 'Loading listings...' : `${visibleProperties.length} results`}
        </div>
        <div className="flex items-center gap-2 md:hidden">
          <button
            type="button"
            onClick={() => setViewMode('list')}
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              viewMode === 'list'
                ? 'bg-[var(--primary)] text-[var(--on-primary)]'
                : 'bg-[var(--surface-2)] text-[var(--muted)]'
            }`}
          >
            List
          </button>
          <button
            type="button"
            onClick={() => setViewMode('map')}
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              viewMode === 'map'
                ? 'bg-[var(--primary)] text-[var(--on-primary)]'
                : 'bg-[var(--surface-2)] text-[var(--muted)]'
            }`}
          >
            Map
          </button>
        </div>
      </div>

      {error && (
        <div className="mt-3 rounded-lg border border-dashed border-[var(--border)] bg-[var(--surface-2)] p-4 text-sm text-[var(--muted)]">
          {error}
        </div>
      )}

      <div className="mt-5 grid gap-6 md:grid-cols-[minmax(0,1fr)_420px]">
        <div
          className={`space-y-4 md:max-h-[calc(100vh-220px)] md:overflow-y-auto ${
            viewMode === 'map' ? 'hidden md:block' : 'block'
          }`}
        >
          {visibleProperties.map((listing) => (
            <button
              key={listing._id}
              type="button"
              onClick={() => setActiveListingId(listing._id)}
              className={`w-full rounded-2xl border text-left shadow-[var(--shadow)] transition ${
                listing._id === activeListingId
                  ? 'border-[var(--primary)] bg-[var(--surface)]'
                  : 'border-[var(--border)] bg-[var(--surface)]'
              }`}
            >
              <div className="flex flex-col gap-4 p-4 md:flex-row">
                <div className="h-36 w-full overflow-hidden rounded-xl bg-[var(--surface-2)] md:w-44">
                  <img
                    src={
                      listing.photos?.[0] ||
                      'https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=800&q=80'
                    }
                    alt={listing.title}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-lg font-semibold text-[var(--text)]">{listing.title}</div>
                      <div className="text-sm text-[var(--muted)]">{formatListingAddress(listing)}</div>
                      {listing.rentStartMonth && (
                        <div className="text-xs text-[var(--muted)]">
                          Available from: {formatRentStartMonth(listing.rentStartMonth)}
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-[var(--primary)]">
                        ৳{Number(listing.rent || 0).toLocaleString()}/mo
                      </div>
                      <div className="text-xs capitalize text-[var(--muted)]">{listing.status}</div>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-[var(--muted)]">
                    <span className="rounded-full bg-[var(--surface-2)] px-2 py-1">{listing.beds} Beds</span>
                    <span className="rounded-full bg-[var(--surface-2)] px-2 py-1">{listing.baths} Baths</span>
                    <span className="rounded-full bg-[var(--surface-2)] px-2 py-1">{listing.roomType}</span>
                  </div>
                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-xs text-[var(--muted)]">Click to preview on the map</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/listing/${listing._id}`);
                      }}
                      className="rounded-lg border border-[var(--primary)] px-3 py-2 text-xs font-semibold text-[var(--primary)] hover:bg-[var(--surface-2)]"
                    >
                      View Details
                    </button>
                  </div>
                </div>
              </div>
            </button>
          ))}
          {!visibleProperties.length && !loading && (
            <div className="rounded-lg border border-dashed border-[var(--border)] bg-[var(--surface-2)] p-6 text-sm text-[var(--muted)]">
              No listings found. Adjust filters and search again.
            </div>
          )}
        </div>

        <div className={`${viewMode === 'map' ? 'block' : 'hidden md:block'} md:sticky md:top-6`}>
          <div className="h-[70vh] md:h-[calc(100vh-220px)]">
            <SearchResultsMap
              listings={visibleProperties}
              activeListingId={activeListingId}
              mapCenter={mapCenter}
              mapBounds={mapBounds}
              onMapMoved={onMapMoved}
              onMarkerClick={(listing) => setActiveListingId(listing._id)}
            />
          </div>
          {activeListing && (
            <div className="mt-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 text-xs text-[var(--muted)] shadow-[var(--shadow)]">
              Highlighting <span className="font-semibold text-[var(--text)]">{activeListing.title}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SearchResultsPage;
