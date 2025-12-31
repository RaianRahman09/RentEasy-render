import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { formatListingAddress } from '../utils/address';
import { formatRentStartMonth } from '../utils/rentStartMonth';

const FindPropertiesPage = () => {
  const navigate = useNavigate();
  const [locationText, setLocationText] = useState('');
  const [featured, setFeatured] = useState([]);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get('/listings/featured');
        setFeatured(res.data.listings || []);
      } catch (err) {
        console.error(err);
      }
    };
    load();
  }, []);

  const onSubmit = (e) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (locationText) params.append('location', locationText);
    navigate(`/search?${params.toString()}`);
  };

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--shadow)]">
        <h1 className="text-3xl font-bold text-[var(--text)]">Find Properties</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Start with a city or neighborhood name (Banani, Gulshan, Dhanmondi).
        </p>
        <form onSubmit={onSubmit} className="mt-4 flex flex-col gap-3 md:flex-row">
          <input
            type="text"
            value={locationText}
            onChange={(e) => setLocationText(e.target.value)}
            placeholder="Enter a location"
            className="w-full flex-1 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 text-sm text-[var(--text)] placeholder:text-[var(--muted)] focus:border-[var(--primary)] focus:outline-none"
          />
          <button
            type="submit"
            className="rounded-lg bg-[var(--primary)] px-6 py-3 text-sm font-semibold text-[var(--on-primary)] hover:brightness-110 active:brightness-95"
          >
            Search
          </button>
        </form>
      </div>

      <section className="mt-10">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-[var(--text)]">Featured Listings</h2>
          <button
            type="button"
            onClick={() => navigate('/search')}
            className="text-sm font-semibold text-[var(--primary)]"
          >
            View all
          </button>
        </div>
        <div className="mt-6 grid gap-6 md:grid-cols-3">
          {featured.map((listing) => (
            <div
              key={listing._id}
              className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow)]"
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
                <div className="text-lg font-semibold text-[var(--text)]">{listing.title}</div>
                <div className="text-sm text-[var(--muted)]">{formatListingAddress(listing)}</div>
                <div className="mt-2 text-sm font-semibold text-[var(--primary)]">
                  ৳{Number(listing.rent || 0).toLocaleString()}/mo
                </div>
                {listing.rentStartMonth && (
                  <div className="mt-1 text-xs text-[var(--muted)]">
                    Available from: {formatRentStartMonth(listing.rentStartMonth)}
                  </div>
                )}
                <button
                  type="button"
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
      </section>
    </div>
  );
};

export default FindPropertiesPage;
