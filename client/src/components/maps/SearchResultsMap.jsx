import React, { useMemo, useRef } from 'react';
import { MapContainer, Marker, Popup, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import { useNavigate } from 'react-router-dom';
import L from 'leaflet';

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

const MapController = ({ bounds, center, activeListing }) => {
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
          <div className="text-xs text-[var(--muted)]">{listing.address}</div>
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
      <MapContainer center={[mapCenter.lat, mapCenter.lng]} zoom={13} scrollWheelZoom className="h-full w-full">
        <MapController bounds={mapBounds} center={mapCenter} activeListing={activeListing} />
        <MapMoveListener onMoved={onMapMoved} />
        {/* Learning-only map: OpenStreetMap + Leaflet (no paid API keys required). */}
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
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
