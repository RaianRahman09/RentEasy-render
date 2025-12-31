import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api/axios';
import { CircleMarker, MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet';

const defaultState = {
  title: '',
  description: '',
  rent: '',
  serviceCharge: '',
  rentStartMonth: '',
  address: {
    country: 'Bangladesh',
    city: '',
    line1: '',
    formatted: '',
  },
  roomType: 'Entire Place',
  beds: 1,
  baths: 1,
  amenities: '',
  status: 'active',
};

const COUNTRY_OPTIONS = [
  'Bangladesh',
  'India',
  'Pakistan',
  'Nepal',
  'Sri Lanka',
  'United States',
  'United Kingdom',
  'Canada',
  'Australia',
  'United Arab Emirates',
  'Singapore',
  'Malaysia',
];

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

const MapRecenter = ({ center, zoom }) => {
  const map = useMap();
  useEffect(() => {
    if (!center?.lat || !center?.lng) return;
    map.setView([center.lat, center.lng], zoom ?? map.getZoom(), { animate: true });
  }, [center, map, zoom]);
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
  const [addressErrors, setAddressErrors] = useState({});
  const [isLegacyAddress, setIsLegacyAddress] = useState(false);
  const [coordinates, setCoordinates] = useState(null);
  const [mapCenter, setMapCenter] = useState(DEFAULT_CENTER);
  const [mapZoom, setMapZoom] = useState(13);
  const [manualLat, setManualLat] = useState('');
  const [manualLng, setManualLng] = useState('');
  const [locationMessage, setLocationMessage] = useState('');
  const [locationStatus, setLocationStatus] = useState('');
  const [geocoding, setGeocoding] = useState(false);
  const [locationConfirmed, setLocationConfirmed] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [locatingUser, setLocatingUser] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!isEdit) return;
      const res = await api.get(`/listings/${id}/owner`);
      const l = res.data.listing;
      const hasStructuredAddress = l?.address && typeof l.address === 'object' && !Array.isArray(l.address);
      const nextAddress = hasStructuredAddress
        ? {
            country: l.address.country || '',
            city: l.address.city || '',
            line1: l.address.line1 || '',
            formatted: l.address.formatted || '',
          }
        : {
            country: '',
            city: '',
            line1: typeof l.address === 'string' ? l.address : '',
            formatted: typeof l.address === 'string' ? l.address : '',
          };
      setIsLegacyAddress(!hasStructuredAddress || !nextAddress.country || !nextAddress.city);
      setForm({
        title: l.title,
        description: l.description,
        rent: l.rent,
        serviceCharge: Number.isFinite(l.serviceCharge) ? String(l.serviceCharge) : '0',
        rentStartMonth: l.rentStartMonth || '',
        address: nextAddress,
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
        setMapZoom(15);
        setManualLat(String(lat));
        setManualLng(String(lng));
        setLocationConfirmed(true);
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
    setLocationConfirmed(true);
    if (message) {
      setLocationMessage(message);
      setLocationStatus('success');
    } else {
      setLocationMessage('');
      setLocationStatus('');
    }
  };

  const buildFullAddress = ({ line1, city, country }) =>
    [line1?.trim(), city?.trim(), country?.trim()].filter(Boolean).join(', ');

  const validateAddress = ({ requireFull } = {}) => {
    const needsFullAddress = typeof requireFull === 'boolean' ? requireFull : !isEdit || !isLegacyAddress;
    const errors = {};
    if (!form.address.line1?.trim()) {
      errors.line1 = 'Street / Road / House No. is required.';
    }
    if (needsFullAddress && !form.address.country?.trim()) {
      errors.country = 'Country is required.';
    }
    if (needsFullAddress && !form.address.city?.trim()) {
      errors.city = 'City/Area is required.';
    }
    setAddressErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleAddressChange = (field, value) => {
    setForm((prev) => ({
      ...prev,
      address: {
        ...prev.address,
        [field]: value,
        formatted: field === 'formatted' ? value : '',
      },
    }));
    if (addressErrors[field]) {
      setAddressErrors((prev) => ({ ...prev, [field]: undefined }));
    }
    if (locationConfirmed) {
      setLocationConfirmed(false);
    }
  };

  const onGeocode = async () => {
    if (!validateAddress({ requireFull: true })) {
      toast.error('Add country, city/area, and street to search the map.');
      return;
    }
    setGeocoding(true);
    setLocationConfirmed(false);
    setLocationMessage('');
    setLocationStatus('');
    try {
      const res = await api.post('/geocode', {
        country: form.address.country.trim(),
        city: form.address.city.trim(),
        line1: form.address.line1.trim(),
      });
      const lat = Number(res.data.lat);
      const lng = Number(res.data.lng);
      const formattedAddress = res.data.formattedAddress || buildFullAddress(form.address);
      setForm((prev) => ({
        ...prev,
        address: {
          ...prev.address,
          formatted: formattedAddress,
        },
      }));
      setMapZoom(15);
      applyCoordinates(lat, lng, 'Location pinned from OpenStreetMap.');
    } catch (err) {
      console.error(err);
      setLocationMessage('Could not find this address. Refine your street or city.');
      setLocationStatus('error');
      toast.error(err.response?.data?.message || "Couldn't find this address, refine your street/city.");
    } finally {
      setGeocoding(false);
    }
  };

  const onLocateUser = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser.');
      return;
    }
    setLocatingUser(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const next = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        setUserLocation(next);
        setMapCenter(next);
        setMapZoom(15);
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

  const onUseUserLocation = () => {
    if (!userLocation) return;
    setMapZoom(16);
    applyCoordinates(userLocation.lat, userLocation.lng, 'Listing location updated from your position.');
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
    setError('');
    if (!validateAddress()) {
      setLoading(false);
      return;
    }
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
    if (!locationConfirmed || !coordinates || !isValidLatLng(Number(coordinates.lat), Number(coordinates.lng))) {
      setError('Please select a valid map location before saving.');
      setLoading(false);
      return;
    }
    const formattedAddress =
      form.address.formatted?.trim() || buildFullAddress(form.address);
    const addressPayload = {
      country: form.address.country.trim(),
      city: form.address.city.trim(),
      line1: form.address.line1.trim(),
      formatted: formattedAddress,
    };
    const payload = new FormData();
    payload.append('title', form.title);
    payload.append('description', form.description);
    payload.append('rent', form.rent);
    payload.append('serviceCharge', form.serviceCharge);
    payload.append('rentStartMonth', form.rentStartMonth);
    payload.append('address', JSON.stringify(addressPayload));
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
        <div className="grid gap-4 md:grid-cols-4">
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
            <label className="text-sm font-semibold text-slate-700">Service charge (BDT)</label>
            <input
              type="number"
              min="0"
              value={form.serviceCharge}
              onChange={(e) => setForm((f) => ({ ...f, serviceCharge: e.target.value }))}
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
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-slate-700">Address</div>
              <div className="text-xs text-slate-500">
                Country helps avoid ambiguous locations like Mirpur10.
              </div>
            </div>
            {isLegacyAddress && (
              <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-700">
                Legacy listing
              </span>
            )}
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <div>
              <label className="text-sm font-semibold text-slate-700">Country</label>
              <input
                type="text"
                list="country-options"
                value={form.address.country}
                onChange={(e) => handleAddressChange('country', e.target.value)}
                className={`mt-1 w-full rounded-lg border px-3 py-2 text-sm focus:outline-none ${
                  addressErrors.country ? 'border-red-500 focus:border-red-500' : 'border-slate-200 focus:border-blue-500'
                }`}
                placeholder="Bangladesh"
                required={!isEdit || !isLegacyAddress}
              />
              {addressErrors.country && (
                <div className="mt-1 text-xs font-semibold text-red-600">{addressErrors.country}</div>
              )}
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-700">City / Area</label>
              <input
                type="text"
                value={form.address.city}
                onChange={(e) => handleAddressChange('city', e.target.value)}
                className={`mt-1 w-full rounded-lg border px-3 py-2 text-sm focus:outline-none ${
                  addressErrors.city ? 'border-red-500 focus:border-red-500' : 'border-slate-200 focus:border-blue-500'
                }`}
                placeholder="Banani, Gulshan, Dhanmondi"
                required={!isEdit || !isLegacyAddress}
              />
              {addressErrors.city && (
                <div className="mt-1 text-xs font-semibold text-red-600">{addressErrors.city}</div>
              )}
            </div>
            <div className="md:col-span-3">
              <label className="text-sm font-semibold text-slate-700">Street / Road / House No.</label>
              <input
                type="text"
                value={form.address.line1}
                onChange={(e) => handleAddressChange('line1', e.target.value)}
                className={`mt-1 w-full rounded-lg border px-3 py-2 text-sm focus:outline-none ${
                  addressErrors.line1 ? 'border-red-500 focus:border-red-500' : 'border-slate-200 focus:border-blue-500'
                }`}
                placeholder="Road 12, House 7"
                required
              />
              {addressErrors.line1 && (
                <div className="mt-1 text-xs font-semibold text-red-600">{addressErrors.line1}</div>
              )}
            </div>
          </div>
          {isLegacyAddress && (!form.address.country.trim() || !form.address.city.trim()) && (
            <div className="mt-3 text-xs font-semibold text-amber-600">
              This listing uses a legacy address. Please fill in the missing country/city for accurate geocoding.
            </div>
          )}
          <datalist id="country-options">
            {COUNTRY_OPTIONS.map((country) => (
              <option key={country} value={country} />
            ))}
          </datalist>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
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

          <div className="relative mt-4 h-64 overflow-hidden rounded-lg border border-slate-200">
            <button
              type="button"
              onClick={onLocateUser}
              disabled={locatingUser}
              title="Find my location"
              aria-label="Find my location"
              className="absolute right-3 top-3 z-[500] rounded-full bg-white/90 p-2 text-slate-700 shadow-md ring-1 ring-slate-200 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-70"
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
            <MapContainer center={[mapCenter.lat, mapCenter.lng]} zoom={mapZoom} className="h-full w-full">
              <MapRecenter center={mapCenter} zoom={mapZoom} />
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
              {userLocation && (
                <CircleMarker
                  center={[userLocation.lat, userLocation.lng]}
                  radius={8}
                  pathOptions={{ color: '#0ea5e9', fillColor: '#38bdf8', fillOpacity: 0.8, weight: 2 }}
                />
              )}
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
          {userLocation && (
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
              <span>Showing your location for reference.</span>
              <button
                type="button"
                onClick={onUseUserLocation}
                className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 hover:border-blue-300 hover:text-blue-700"
              >
                Use my location as listing location
              </button>
            </div>
          )}

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
          {!locationConfirmed && (
            <div className="mt-2 text-xs font-semibold text-amber-600">
              Save is disabled until a valid map location is selected.
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
            disabled={loading || !locationConfirmed}
            className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70"
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
