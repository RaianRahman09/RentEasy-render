import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../api/axios';
import ListingLocationMap from '../components/maps/ListingLocationMap';
import { useAuth } from '../context/AuthContext';
import { formatListingAddress } from '../utils/address';
import { formatRentStartMonth } from '../utils/rentStartMonth';

const ListingDetailPage = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [listing, setListing] = useState(null);
  const [startingRent, setStartingRent] = useState(false);
  const [startingChat, setStartingChat] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  useEffect(() => {
    const load = async () => {
      const res = await api.get(`/listings/${id}`);
      setListing(res.data.listing);
    };
    load();
  }, [id]);

  const listingImages = useMemo(() => {
    if (!listing) return [];
    if (Array.isArray(listing.images) && listing.images.length) return listing.images;
    if (Array.isArray(listing.imageUrls) && listing.imageUrls.length) return listing.imageUrls;
    if (Array.isArray(listing.photos) && listing.photos.length) return listing.photos;
    return [];
  }, [listing]);

  useEffect(() => {
    setActiveImageIndex((prev) => {
      if (!listingImages.length) return 0;
      return prev >= listingImages.length ? 0 : prev;
    });
  }, [listingImages]);

  if (!listing) return null;
  const coordinates = listing.location?.coordinates;
  const hasCoordinates =
    Array.isArray(coordinates) && coordinates.length === 2 && coordinates.every((value) => Number.isFinite(value));
  const placeholderImage =
    'https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=1400&q=80';
  const primaryImage = listingImages[activeImageIndex] || placeholderImage;

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
            <div className="h-80 w-full overflow-hidden rounded-xl bg-slate-200">
              <img src={primaryImage} alt={listing.title} className="h-full w-full object-cover" />
            </div>
            {listingImages.length > 1 && (
              <div className="mt-3 flex gap-3 overflow-x-auto pb-1">
                {listingImages.map((image, index) => {
                  const isActive = index === activeImageIndex;
                  return (
                    <button
                      key={`${image}-${index}`}
                      type="button"
                      onClick={() => setActiveImageIndex(index)}
                      className={`h-16 w-20 flex-shrink-0 overflow-hidden rounded-lg border transition ${
                        isActive ? 'border-blue-600 ring-2 ring-blue-200' : 'border-slate-200 hover:border-blue-300'
                      }`}
                      aria-current={isActive}
                    >
                      <img
                        src={image}
                        alt={`${listing.title} thumbnail ${index + 1}`}
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          <div className="mt-4 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">{listing.title}</h1>
              <div className="text-slate-600">{formatListingAddress(listing)}</div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-blue-700">${listing.rent}/mo</div>
              <div className="text-sm text-slate-500">{listing.roomType}</div>
              {listing.rentStartMonth && (
                <div className="text-sm text-slate-500">
                  Available from: {formatRentStartMonth(listing.rentStartMonth)}
                </div>
              )}
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
              {user?.role === 'tenant' && (
                <button
                  type="button"
                  onClick={async () => {
                    setStartingChat(true);
                    try {
                      const res = await api.post('/chat/conversations', { listingId: listing._id });
                      navigate(`/chat/${res.data.conversationId}`);
                    } catch (err) {
                      toast.error(err.response?.data?.message || 'Failed to start conversation.');
                    } finally {
                      setStartingChat(false);
                    }
                  }}
                  disabled={startingChat}
                  className="flex-1 rounded-lg bg-blue-700 px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {startingChat ? 'Starting...' : 'Message Landlord'}
                </button>
              )}
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
            {user?.role === 'tenant' && (
              <button
                type="button"
                onClick={async () => {
                  setStartingRent(true);
                  try {
                    const res = await api.post(`/rentals/${listing._id}/start`);
                    navigate(`/bookings/${res.data.rentalId}/pay`);
                  } catch (err) {
                    toast.error(err.response?.data?.message || 'Failed to start rental.');
                  } finally {
                    setStartingRent(false);
                  }
                }}
                disabled={startingRent}
                className="mt-3 w-full rounded-lg bg-blue-700 px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70"
              >
                {startingRent ? 'Starting...' : 'Rent this property'}
              </button>
            )}
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
