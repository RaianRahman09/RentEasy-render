import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api/axios';

const defaultState = {
  title: '',
  description: '',
  rent: '',
  address: '',
  roomType: 'Entire Place',
  beds: 1,
  baths: 1,
  amenities: '',
  status: 'active',
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

  useEffect(() => {
    const load = async () => {
      if (!isEdit) return;
      const res = await api.get(`/listings/${id}`);
      const l = res.data.listing;
      setForm({
        title: l.title,
        description: l.description,
        rent: l.rent,
        address: l.address,
        roomType: l.roomType,
        beds: l.beds,
        baths: l.baths,
        amenities: (l.amenities || []).join(', '),
        status: l.status,
      });
      setExistingPhotos(l.photos || []);
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

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const payload = new FormData();
    payload.append('title', form.title);
    payload.append('description', form.description);
    payload.append('rent', form.rent);
    payload.append('address', form.address);
    payload.append('roomType', form.roomType);
    payload.append('beds', form.beds);
    payload.append('baths', form.baths);
    payload.append('amenities', form.amenities);
    payload.append('status', form.status);
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
        <div className="grid gap-4 md:grid-cols-2">
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
