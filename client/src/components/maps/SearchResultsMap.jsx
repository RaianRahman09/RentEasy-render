import React, { useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { CircleMarker, MapContainer, Marker, Popup, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import { useNavigate } from 'react-router-dom';
import L from 'leaflet';
import { formatListingAddress } from '../../utils/address';

const formatPrice = (rent) => `৳${Number(rent || 0).toLocaleString()}`;

const createPriceIcon = (rent, isActive) => {
  const label = formatPrice(rent);
  const width = Math.max(64, label.length * 8 + 28);
  return L.divIcon({
    className: 'price-marker-wrapper',
    html: `<div class="map-price-marker ${isActive ? 'is-active' : ''}">${label}</div>`,
    iconSize: [width, 30],
    iconAnchor: [width / 2, 30],
  });
};

const MapController = ({ bounds, center, activeListing, userLocation }) => {
  const map = useMap();

  React.useEffect(() => {
    if (bounds?.ne && bounds?.sw) {
      map.fitBounds(
        [
          [bounds.sw.lat, bounds.sw.lng],
          [bounds.ne.lat, bounds.ne.lng],
        ],
        { padding: [40, 40], animate: false }
      );
      return;
    }
    if (center?.lat && center?.lng) {
      map.setView([center.lat, center.lng], 13, { animate: false });
    }
  }, [bounds, center, map]);

  React.useEffect(() => {
    if (!activeListing?.mapLocation?.coordinates) return;
    const [lng, lat] = activeListing.mapLocation.coordinates;
    map.flyTo([lat, lng], Math.max(map.getZoom(), 14), { duration: 0.4 });
  }, [activeListing, map]);

  React.useEffect(() => {
    if (!userLocation?.lat || !userLocation?.lng) return;
    map.flyTo([userLocation.lat, userLocation.lng], Math.max(map.getZoom(), 14), { duration: 0.4 });
  }, [map, userLocation]);

  return null;
};

const MapMoveListener = ({ onMoved }) => {
  const map = useMap();
  const hasInitialized = useRef(false);

  useMapEvents({
    moveend: () => {
      if (!hasInitialized.current) {
        hasInitialized.current = true;
        return;
      }
      onMoved?.(map.getBounds());
    },
    zoomend: () => {
      if (!hasInitialized.current) {
        hasInitialized.current = true;
        return;
      }
      onMoved?.(map.getBounds());
    },
  });

  return null;
};

const PriceMarker = ({ listing, isActive, onMarkerClick }) => {
  const icon = useMemo(() => createPriceIcon(listing.rent, isActive), [listing.rent, isActive]);
  const coords = listing.mapLocation?.coordinates;
  const navigate = useNavigate();
  if (!coords) return null;
  const [lng, lat] = coords;

  return (
    <Marker
      position={[lat, lng]}
      icon={icon}
      eventHandlers={{
        click: () => onMarkerClick?.(listing),
      }}
    >
      <Popup className="listing-popup">
        <div className="w-64">
          <div className="h-32 w-full overflow-hidden rounded-lg bg-[var(--surface-2)]">
            <img
              src={
                listing.photos?.[0] ||
                'https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=800&q=80'
              }
              alt={listing.title}
              className="h-full w-full object-cover"
            />
          </div>
          <div className="mt-3 text-sm font-semibold text-[var(--text)]">{listing.title}</div>
          <div className="text-xs text-[var(--muted)]">{formatListingAddress(listing)}</div>
          <div className="mt-2 flex items-center justify-between text-sm">
            <span className="font-semibold text-[var(--primary)]">{formatPrice(listing.rent)}/mo</span>
            <span className="text-[var(--muted)]">
              {listing.beds} bd · {listing.baths} ba
            </span>
          </div>
          <button
            type="button"
            onClick={() => navigate(`/listing/${listing._id}`)}
            className="mt-3 w-full rounded-lg bg-[var(--primary)] px-3 py-2 text-xs font-semibold text-[var(--on-primary)] hover:brightness-110 active:brightness-95"
          >
            View Details
          </button>
        </div>
      </Popup>
    </Marker>
  );
};

const SearchResultsMap = ({
  listings,
  activeListingId,
  mapCenter,
  mapBounds,
  showSearchArea,
  onSearchArea,
  onMapMoved,
  onMarkerClick,
}) => {
  const activeListing = listings.find((listing) => listing._id === activeListingId);
  const [userLocation, setUserLocation] = useState(null);
  const [locatingUser, setLocatingUser] = useState(false);

  const onLocateUser = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser.');
      return;
    }
    setLocatingUser(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setLocatingUser(false);
      },
      (geoError) => {
        if (geoError.code === geoError.PERMISSION_DENIED) {
          toast.error('Location permission denied.');
        } else {
          toast.error('Unable to access your location.');
        }
        setLocatingUser(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <div className="relative h-full w-full overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow)]">
      {showSearchArea && (
        <div className="absolute left-1/2 top-4 z-[400] -translate-x-1/2">
          <button
            type="button"
            onClick={onSearchArea}
            className="rounded-full bg-[var(--text)] px-4 py-2 text-xs font-semibold text-white shadow"
          >
            Search this area
          </button>
        </div>
      )}
      <button
        type="button"
        onClick={onLocateUser}
        disabled={locatingUser}
        title="Find my location"
        aria-label="Find my location"
        className="absolute right-4 top-4 z-[400] rounded-full bg-[var(--surface)] p-2 text-[var(--text)] shadow-md ring-1 ring-[var(--border)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-70"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
          className="h-4 w-4"
          aria-hidden="true"
        >
          <path d="M12 4.5a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-1.5 0v-1.5A.75.75 0 0 1 12 4.5Z" />
          <path d="M12 16.5a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-1.5 0v-1.5a.75.75 0 0 1 .75-.75Z" />
          <path d="M4.5 12a.75.75 0 0 1 .75-.75h1.5a.75.75 0 0 1 0 1.5h-1.5A.75.75 0 0 1 4.5 12Z" />
          <path d="M16.5 12a.75.75 0 0 1 .75-.75h1.5a.75.75 0 0 1 0 1.5h-1.5a.75.75 0 0 1-.75-.75Z" />
          <path
            fillRule="evenodd"
            d="M12 7.5a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 0-9Zm-6 4.5a6 6 0 1 1 12 0 6 6 0 0 1-12 0Z"
            clipRule="evenodd"
          />
        </svg>
      </button>
      <MapContainer center={[mapCenter.lat, mapCenter.lng]} zoom={13} scrollWheelZoom className="h-full w-full">
        <MapController bounds={mapBounds} center={mapCenter} activeListing={activeListing} userLocation={userLocation} />
        <MapMoveListener onMoved={onMapMoved} />
        {/* Learning-only map: OpenStreetMap + Leaflet (no paid API keys required). */}
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {userLocation && (
          <CircleMarker
            center={[userLocation.lat, userLocation.lng]}
            radius={7}
            pathOptions={{ color: '#14b8a6', fillColor: '#2dd4bf', fillOpacity: 0.85, weight: 2 }}
          />
        )}
        {listings.map((listing) => (
          <PriceMarker
            key={listing._id}
            listing={listing}
            isActive={listing._id === activeListingId}
            onMarkerClick={onMarkerClick}
          />
        ))}
      </MapContainer>
    </div>
  );
};

export default SearchResultsMap;
