import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { formatRentStartMonth } from '../utils/rentStartMonth';

const HomePage = () => {
  const navigate = useNavigate();
  const [featured, setFeatured] = useState([]);
  const [filters, setFilters] = useState({ location: '', budget: '', roomType: '' });

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get('/listings/featured');
        setFeatured(res.data.listings || []);
      } catch (e) {
        console.error(e);
      }
    };
    load();
  }, []);

  const onSubmit = (e) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (filters.location) params.append('location', filters.location);
    if (filters.budget) params.append('maxRent', filters.budget);
    if (filters.roomType) params.append('roomType', filters.roomType);
    navigate(`/search?${params.toString()}`);
  };

  return (
    <div className="bg-[var(--bg)]">
      <section className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 text-white">
        <img
          src="https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=1600&q=80"
          alt="Hero"
          className="absolute inset-0 h-full w-full object-cover opacity-50"
        />
        <div className="relative mx-auto flex max-w-6xl flex-col gap-8 px-6 py-16 md:flex-row md:items-center">
          <div className="max-w-2xl">
            <p className="mb-3 text-sm uppercase tracking-wide text-blue-200">Modern rental platform</p>
            <h1 className="mb-4 text-4xl font-bold leading-tight md:text-5xl">
              Find your perfect room or tenant.
            </h1>
            <p className="mb-6 text-lg text-slate-200">
              A secure platform connecting tenants with verified landlords. Search, chat, verify, and book with ease.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => navigate('/find')}
                className="rounded-md bg-[var(--on-primary)] px-5 py-3 text-sm font-semibold text-[var(--primary)] shadow"
              >
                Find a Room
              </button>
              <button
                onClick={() => navigate('/auth/signup?role=landlord')}
                className="rounded-md bg-[var(--primary)] px-5 py-3 text-sm font-semibold text-[var(--on-primary)] shadow"
              >
                List Your Property
              </button>
            </div>
          </div>
          <form
            onSubmit={onSubmit}
            className="w-full max-w-xl rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 text-[var(--text)] shadow-[var(--shadow)] backdrop-blur"
          >
            <div className="mb-4 text-lg font-semibold">Quick Search</div>
            <div className="grid gap-3 md:grid-cols-3">
              <input
                type="text"
                placeholder="Location (City, Zip)"
                value={filters.location}
                onChange={(e) => setFilters((f) => ({ ...f, location: e.target.value }))}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm text-[var(--text)] placeholder:text-[var(--muted)] focus:border-[var(--primary)] focus:outline-none"
              />
              <input
                type="number"
                placeholder="Budget ($/mo)"
                value={filters.budget}
                onChange={(e) => setFilters((f) => ({ ...f, budget: e.target.value }))}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm text-[var(--text)] placeholder:text-[var(--muted)] focus:border-[var(--primary)] focus:outline-none"
              />
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
            </div>
            <button
              type="submit"
              className="mt-4 w-full rounded-lg bg-[var(--primary)] px-4 py-3 text-sm font-semibold text-[var(--on-primary)] hover:brightness-110 active:brightness-95"
            >
              Search
            </button>
          </form>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-12">
        <div className="grid gap-10 md:grid-cols-2">
          <div>
            <h2 className="mb-4 text-2xl font-bold text-[var(--text)]">How It Works for Tenants</h2>
            <ul className="space-y-3 text-[var(--muted)]">
              <li>🔎 Search listings with powerful filters.</li>
              <li>📅 Request a viewing and pick a time.</li>
              <li>💬 Chat with landlords in real time.</li>
              <li>💳 Book & pay securely.</li>
            </ul>
          </div>
          <div>
            <h2 className="mb-4 text-2xl font-bold text-[var(--text)]">How It Works for Landlords</h2>
            <ul className="space-y-3 text-[var(--muted)]">
              <li>📝 Create listings with photos and amenities.</li>
              <li>✅ Verify your profile to boost trust.</li>
              <li>📆 Manage viewing appointments.</li>
              <li>💰 Get paid through secure payouts.</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="bg-[var(--surface)]">
        <div className="mx-auto max-w-6xl px-6 py-12">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-[var(--text)]">Featured Listings</h2>
            <button
              onClick={() => navigate('/find')}
              className="text-sm font-semibold text-[var(--primary)]"
            >
              View All Listings
            </button>
          </div>
          <div className="mt-6 grid gap-6 md:grid-cols-3">
            {featured.map((listing) => (
              <div
                key={listing._id}
                className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface-2)] shadow-[var(--shadow)]"
              >
                <div className="h-40 w-full bg-[var(--surface-2)]">
                  <img
                    src={
                      listing.photos?.[0] ||
                      'https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=800&q=80'
                    }
                    alt={listing.title}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="p-4">
                  <div className="mb-2 text-lg font-semibold text-[var(--text)]">{listing.title}</div>
                  <div className="text-sm text-[var(--muted)]">{listing.address}</div>
                  <div className="mt-2 text-sm font-semibold text-[var(--primary)]">
                    ${listing.rent}/mo
                  </div>
                  {listing.rentStartMonth && (
                    <div className="mt-1 text-xs text-[var(--muted)]">
                      Available from: {formatRentStartMonth(listing.rentStartMonth)}
                    </div>
                  )}
                  <button
                    onClick={() => navigate(`/listing/${listing._id}`)}
                    className="mt-3 inline-flex items-center text-sm font-semibold text-[var(--primary)]"
                  >
                    View Details →
                  </button>
                </div>
              </div>
            ))}
            {!featured.length && (
              <div className="rounded-lg border border-dashed border-[var(--border)] bg-[var(--surface-2)] p-6 text-sm text-[var(--muted)]">
                Listings will appear here once created.
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-12">
        <div className="grid gap-4 rounded-2xl bg-gradient-to-r from-blue-900 to-blue-700 px-6 py-10 text-white md:grid-cols-2">
          <div>
            <div className="text-sm uppercase tracking-wide text-blue-100">Why Choose Us</div>
            <h3 className="mt-2 text-2xl font-bold">Verified landlords. Secure payments. Real-time chat.</h3>
            <p className="mt-3 text-blue-100">
              A single platform to verify, search, chat, and manage bookings with confidence.
            </p>
          </div>
          <div className="flex items-center justify-end gap-3">
            <button
              onClick={() => navigate('/auth/signup')}
              className="rounded-lg bg-[var(--on-primary)] px-4 py-3 text-sm font-semibold text-[var(--primary)] shadow"
            >
              Sign Up to Search
            </button>
            <button
              onClick={() => navigate('/auth/signup?role=landlord')}
              className="rounded-lg border border-white/70 px-4 py-3 text-sm font-semibold text-white"
            >
              Become a Landlord
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
