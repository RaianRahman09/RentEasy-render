import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../api/axios';
import ListingLocationMap from '../components/maps/ListingLocationMap';
import { useAuth } from '../context/AuthContext';

const ListingDetailPage = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const [listing, setListing] = useState(null);

  useEffect(() => {
    const load = async () => {
      const res = await api.get(`/listings/${id}`);
      setListing(res.data.listing);
    };
    load();
  }, [id]);

  if (!listing) return null;
  const coordinates = listing.location?.coordinates;
  const hasCoordinates =
    Array.isArray(coordinates) && coordinates.length === 2 && coordinates.every((value) => Number.isFinite(value));

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2">
          <div className="h-80 w-full overflow-hidden rounded-xl bg-slate-200">
            <img
              src={
                listing.photos?.[0] ||
                'https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=1400&q=80'
              }
              alt={listing.title}
              className="h-full w-full object-cover"
            />
          </div>
          <div className="mt-4 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">{listing.title}</h1>
              <div className="text-slate-600">{listing.address}</div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-blue-700">${listing.rent}/mo</div>
              <div className="text-sm text-slate-500">{listing.roomType}</div>
            </div>
          </div>
          <div className="mt-4 text-sm text-slate-700">{listing.description}</div>
          <div className="mt-4 flex flex-wrap gap-2 text-sm text-slate-700">
            <span className="rounded-full bg-slate-100 px-3 py-1">{listing.beds} Beds</span>
            <span className="rounded-full bg-slate-100 px-3 py-1">{listing.baths} Baths</span>
            {listing.amenities?.map((a) => (
              <span key={a} className="rounded-full bg-slate-100 px-3 py-1">
                {a}
              </span>
            ))}
          </div>
        </div>
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-sm font-semibold text-slate-700">Landlord Info</div>
            <div className="mt-2 text-lg font-semibold text-slate-900">{listing.owner?.name || 'Landlord'}</div>
            {listing.owner?.verificationStatus === 'verified' && (
              <div className="text-xs font-semibold text-green-700">Verified</div>
            )}
            <div className="mt-3 flex gap-2">
              <button className="flex-1 rounded-lg bg-blue-700 px-3 py-2 text-sm font-semibold text-white">
                Message Landlord
              </button>
              {user?.role === 'tenant' ? (
                <Link
                  to={`/appointments/new/${listing._id}`}
                  className="flex-1 rounded-lg border border-blue-700 px-3 py-2 text-center text-sm font-semibold text-blue-700"
                >
                  Request Viewing
                </Link>
              ) : (
                <button
                  type="button"
                  disabled
                  className="flex-1 cursor-not-allowed rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-400"
                >
                  Request Viewing
                </button>
              )}
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-sm font-semibold text-slate-700">Location</div>
            <div className="mt-2">
              {hasCoordinates ? (
                <ListingLocationMap coordinates={coordinates} title={listing.title} />
              ) : (
                <div className="flex h-60 items-center justify-center rounded-lg bg-slate-100 text-sm text-slate-500">
                  Location not available
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ListingDetailPage;
