import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api/axios';
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet';

const defaultState = {
  title: '',
  description: '',
  rent: '',
  rentStartMonth: '',
  address: '',
  roomType: 'Entire Place',
  beds: 1,
  baths: 1,
  amenities: '',
  status: 'active',
};

const DEFAULT_CENTER = { lat: 23.8103, lng: 90.4125 };
const RENT_START_MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

const MapClickHandler = ({ onSelect }) => {
  useMapEvents({
    click: (event) => {
      onSelect?.(event.latlng);
    },
  });
  return null;
};

const MapRecenter = ({ center }) => {
  const map = useMap();
  useEffect(() => {
    if (!center?.lat || !center?.lng) return;
    map.setView([center.lat, center.lng], map.getZoom(), { animate: true });
  }, [center, map]);
  return null;
};

const ListingFormPage = () => {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const [form, setForm] = useState(defaultState);
  const [loading, setLoading] = useState(false);
  const [existingPhotos, setExistingPhotos] = useState([]);
  const [newPhotos, setNewPhotos] = useState([]);
  const [error, setError] = useState('');
  const [rentStartMonthError, setRentStartMonthError] = useState('');
  const [coordinates, setCoordinates] = useState(null);
  const [mapCenter, setMapCenter] = useState(DEFAULT_CENTER);
  const [manualLat, setManualLat] = useState('');
  const [manualLng, setManualLng] = useState('');
  const [locationMessage, setLocationMessage] = useState('');
  const [locationStatus, setLocationStatus] = useState('');
  const [geocoding, setGeocoding] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!isEdit) return;
      const res = await api.get(`/listings/${id}/owner`);
      const l = res.data.listing;
      setForm({
        title: l.title,
        description: l.description,
        rent: l.rent,
        rentStartMonth: l.rentStartMonth || '',
        address: l.address,
        roomType: l.roomType,
        beds: l.beds,
        baths: l.baths,
        amenities: (l.amenities || []).join(', '),
        status: l.status,
      });
      setExistingPhotos(l.photos || []);
      if (l.location?.coordinates?.length === 2) {
        const [lng, lat] = l.location.coordinates;
        setCoordinates({ lat, lng });
        setMapCenter({ lat, lng });
        setManualLat(String(lat));
        setManualLng(String(lng));
      }
    };
    load();
  }, [id, isEdit]);

  useEffect(
    () => () => {
      newPhotos.forEach((p) => {
        if (p.preview?.startsWith('blob:')) URL.revokeObjectURL(p.preview);
      });
    },
    [newPhotos]
  );

  useEffect(() => {
    if (!coordinates) return;
    setManualLat(String(coordinates.lat));
    setManualLng(String(coordinates.lng));
  }, [coordinates]);

  const isValidLatLng = (lat, lng) =>
    Number.isFinite(lat) && Number.isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;

  const applyCoordinates = (lat, lng, message = '') => {
    if (!isValidLatLng(lat, lng)) {
      setLocationMessage('Please enter valid latitude and longitude values.');
      setLocationStatus('error');
      return;
    }
    setCoordinates({ lat, lng });
    setMapCenter({ lat, lng });
    if (message) {
      setLocationMessage(message);
      setLocationStatus('success');
    } else {
      setLocationMessage('');
      setLocationStatus('');
    }
  };

  const onGeocode = async () => {
    if (!form.address.trim()) {
      setLocationMessage('Enter an address or area name to search.');
      setLocationStatus('error');
      return;
    }
    setGeocoding(true);
    setLocationMessage('');
    setLocationStatus('');
    try {
      const baseUrl = import.meta.env.VITE_NOMINATIM_BASE_URL || 'https://nominatim.openstreetmap.org';
      const url = new URL('/search', baseUrl);
      url.searchParams.set('q', form.address.trim());
      url.searchParams.set('format', 'json');
      url.searchParams.set('limit', '1');

      // Learning-only: OpenStreetMap Nominatim geocoding for map previews (no paid API keys required).
      const response = await fetch(url.toString());
      const data = await response.json();
      if (!Array.isArray(data) || !data.length) {
        setLocationMessage('No results found for that address.');
        setLocationStatus('error');
        return;
      }
      const lat = Number(data[0].lat);
      const lng = Number(data[0].lon);
      applyCoordinates(lat, lng, 'Location pinned from OpenStreetMap.');
    } catch (err) {
      console.error(err);
      setLocationMessage('Failed to reach the geocoding service. Try manual coordinates.');
      setLocationStatus('error');
    } finally {
      setGeocoding(false);
    }
  };

  const onManualLatChange = (value) => {
    setManualLat(value);
    const lat = Number(value);
    const lng = Number(manualLng);
    if (isValidLatLng(lat, lng)) applyCoordinates(lat, lng);
  };

  const onManualLngChange = (value) => {
    setManualLng(value);
    const lat = Number(manualLat);
    const lng = Number(value);
    if (isValidLatLng(lat, lng)) applyCoordinates(lat, lng);
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const rentMonthError = !form.rentStartMonth
      ? 'Rent starting month is required.'
      : RENT_START_MONTH_PATTERN.test(form.rentStartMonth)
        ? ''
        : 'Use YYYY-MM format.';
    if (rentMonthError) {
      setRentStartMonthError(rentMonthError);
      setLoading(false);
      return;
    }
    if (!coordinates || !isValidLatLng(Number(coordinates.lat), Number(coordinates.lng))) {
      setError('Please select a valid map location before saving.');
      setLoading(false);
      return;
    }
    const payload = new FormData();
    payload.append('title', form.title);
    payload.append('description', form.description);
    payload.append('rent', form.rent);
    payload.append('rentStartMonth', form.rentStartMonth);
    payload.append('address', form.address);
    payload.append('roomType', form.roomType);
    payload.append('beds', form.beds);
    payload.append('baths', form.baths);
    payload.append('amenities', form.amenities);
    payload.append('status', form.status);
    payload.append('lat', coordinates.lat);
    payload.append('lng', coordinates.lng);
    existingPhotos.forEach((url) => payload.append('existingPhotos', url));
    newPhotos.forEach((p) => payload.append('photos', p.file));
    try {
      if (existingPhotos.length + newPhotos.length > 5) {
        setError('You can upload up to 5 photos total.');
        setLoading(false);
        return;
      }
      if (isEdit) {
        await api.put(`/listings/${id}`, payload, { headers: { 'Content-Type': 'multipart/form-data' } });
      } else {
        await api.post('/listings', payload, { headers: { 'Content-Type': 'multipart/form-data' } });
      }
      navigate('/landlord/listings');
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to save listing.');
    } finally {
      setLoading(false);
    }
  };

  const onPhotosChange = (e) => {
    const files = Array.from(e.target.files || []);
    const available = 5 - existingPhotos.length - newPhotos.length;
    const toAdd = files.slice(0, available);
    const mapped = toAdd.map((file) => ({ file, preview: URL.createObjectURL(file) }));
    setNewPhotos((prev) => [...prev, ...mapped]);
    if (files.length > toAdd.length) {
      setError('Only 5 photos total are allowed.');
    } else {
      setError('');
    }
  };

  const removeExistingPhoto = (idx) => {
    setExistingPhotos((prev) => prev.filter((_, i) => i !== idx));
  };

  const removeNewPhoto = (idx) => {
    setNewPhotos((prev) => {
      const copy = [...prev];
      const [removed] = copy.splice(idx, 1);
      if (removed?.preview?.startsWith('blob:')) URL.revokeObjectURL(removed.preview);
      return copy;
    });
  };

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <h1 className="text-3xl font-bold text-slate-900">{isEdit ? 'Edit Listing' : 'Create New Listing'}</h1>
      <form onSubmit={onSubmit} className="mt-6 space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label className="text-sm font-semibold text-slate-700">Title</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              required
            />
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-700">Rent Price (per month)</label>
            <input
              type="number"
              value={form.rent}
              onChange={(e) => setForm((f) => ({ ...f, rent: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              required
            />
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-700">Rent starting month</label>
            <input
              type="month"
              value={form.rentStartMonth}
              onChange={(e) => {
                const nextValue = e.target.value;
                setForm((f) => ({ ...f, rentStartMonth: nextValue }));
                if (rentStartMonthError) {
                  setRentStartMonthError(
                    !nextValue
                      ? 'Rent starting month is required.'
                      : RENT_START_MONTH_PATTERN.test(nextValue)
                        ? ''
                        : 'Use YYYY-MM format.'
                  );
                }
              }}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              required
            />
            {rentStartMonthError && <div className="mt-1 text-xs font-semibold text-red-600">{rentStartMonthError}</div>}
          </div>
        </div>
        <div>
          <label className="text-sm font-semibold text-slate-700">Description</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            rows={3}
          />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-sm font-semibold text-slate-700">Address</label>
            <input
              type="text"
              value={form.address}
              onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              required
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-sm font-semibold text-slate-700">Room Type</label>
              <select
                value={form.roomType}
                onChange={(e) => setForm((f) => ({ ...f, roomType: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              >
                <option>Entire Place</option>
                <option>Single</option>
                <option>Studio</option>
                <option>Shared</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-700">Beds</label>
              <input
                type="number"
                value={form.beds}
                onChange={(e) => setForm((f) => ({ ...f, beds: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-700">Baths</label>
              <input
                type="number"
                value={form.baths}
                onChange={(e) => setForm((f) => ({ ...f, baths: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-slate-700">Map Location</div>
              <div className="text-xs text-slate-500">
                Search an address or drop the pin to set the exact location.
              </div>
            </div>
            <button
              type="button"
              onClick={onGeocode}
              disabled={geocoding}
              className="rounded-lg bg-blue-700 px-3 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {geocoding ? 'Searching...' : 'Search Address on Map'}
            </button>
          </div>

          <div className="mt-4 h-64 overflow-hidden rounded-lg border border-slate-200">
            <MapContainer center={[mapCenter.lat, mapCenter.lng]} zoom={13} className="h-full w-full">
              <MapRecenter center={mapCenter} />
              <MapClickHandler
                onSelect={(latlng) => {
                  applyCoordinates(latlng.lat, latlng.lng);
                }}
              />
              {/* Learning-only map: OpenStreetMap + Leaflet (no paid API keys required). */}
              <TileLayer
                attribution="&copy; OpenStreetMap contributors"
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {coordinates && (
                <Marker
                  position={[coordinates.lat, coordinates.lng]}
                  draggable
                  eventHandlers={{
                    dragend: (event) => {
                      const { lat, lng } = event.target.getLatLng();
                      applyCoordinates(lat, lng);
                    },
                  }}
                />
              )}
            </MapContainer>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div>
              <label className="text-xs font-semibold text-slate-600">Latitude (optional)</label>
              <input
                type="number"
                value={manualLat}
                onChange={(e) => onManualLatChange(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                placeholder="e.g. 23.8103"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600">Longitude (optional)</label>
              <input
                type="number"
                value={manualLng}
                onChange={(e) => onManualLngChange(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                placeholder="e.g. 90.4125"
              />
            </div>
          </div>

          {locationMessage && (
            <div
              className={`mt-3 text-sm font-semibold ${
                locationStatus === 'error' ? 'text-red-600' : 'text-green-600'
              }`}
            >
              {locationMessage}
            </div>
          )}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-sm font-semibold text-slate-700">Amenities (comma separated)</label>
            <input
              type="text"
              value={form.amenities}
              onChange={(e) => setForm((f) => ({ ...f, amenities: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              placeholder="Wi-Fi, Parking, Gym"
            />
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-700">Photos (up to 5)</label>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={onPhotosChange}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
            <p className="mt-1 text-xs text-slate-500">Upload JPG or PNG. Remaining slots: {5 - existingPhotos.length - newPhotos.length}</p>
            {(existingPhotos.length > 0 || newPhotos.length > 0) && (
              <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-3">
                {existingPhotos.map((url, idx) => (
                  <div key={url + idx} className="relative rounded-lg border border-slate-200 bg-slate-50 p-2">
                    <img src={url} alt={`Existing ${idx + 1}`} className="h-28 w-full rounded object-cover" />
                    <button
                      type="button"
                      onClick={() => removeExistingPhoto(idx)}
                      className="absolute right-1 top-1 rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-red-600 shadow"
                    >
                      Remove
                    </button>
                  </div>
                ))}
                {newPhotos.map((p, idx) => (
                  <div key={p.preview} className="relative rounded-lg border border-slate-200 bg-slate-50 p-2">
                    <img src={p.preview} alt={`New ${idx + 1}`} className="h-28 w-full rounded object-cover" />
                    <button
                      type="button"
                      onClick={() => removeNewPhoto(idx)}
                      className="absolute right-1 top-1 rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-red-600 shadow"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        {error && <div className="text-sm font-semibold text-red-600">{error}</div>}
        <div className="flex items-center gap-3">
          <label className="text-sm font-semibold text-slate-700">Status</label>
          <select
            value={form.status}
            onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
          >
            <option value="active">Active</option>
            <option value="archived">Archived</option>
          </select>
        </div>
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white"
          >
            {loading ? 'Saving...' : 'Save Listing'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/landlord/listings')}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default ListingFormPage;
