import React, { useEffect, useMemo } from 'react';
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';

const MapSizer = () => {
  const map = useMap();
  useEffect(() => {
    const frame = requestAnimationFrame(() => map.invalidateSize());
    return () => cancelAnimationFrame(frame);
  }, [map]);
  return null;
};

const MapCenter = ({ position }) => {
  const map = useMap();
  useEffect(() => {
    if (!position) return;
    map.setView(position, map.getZoom(), { animate: false });
  }, [map, position]);
  return null;
};

const ListingLocationMap = ({ coordinates, title }) => {
  const position = useMemo(() => {
    if (!Array.isArray(coordinates) || coordinates.length !== 2) return null;
    const [lng, lat] = coordinates;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return [lat, lng];
  }, [coordinates]);

  if (!position) return null;

  return (
    <div className="h-60 w-full overflow-hidden rounded-lg bg-slate-100">
      <MapContainer center={position} zoom={14} scrollWheelZoom className="h-full w-full">
        <MapSizer />
        <MapCenter position={position} />
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={position}>
          <Popup>{title || 'Listing location'}</Popup>
        </Marker>
      </MapContainer>
    </div>
  );
};

export default ListingLocationMap;
