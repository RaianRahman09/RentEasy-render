import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import { formatAppointmentWindow } from '../utils/appointments';

const defaultForm = {
  listingId: '',
  date: '',
  startTime: '',
  endTime: '',
  slotCount: 4,
};

const LandlordAvailabilityPage = () => {
  const [listings, setListings] = useState([]);
  const [form, setForm] = useState(defaultForm);
  const [slots, setSlots] = useState([]);
  const [message, setMessage] = useState('');
  const [tone, setTone] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadListings = async () => {
      try {
        const res = await api.get('/listings');
        const items = res.data.listings || [];
        setListings(items);
        if (items.length) {
          setForm((prev) => (prev.listingId ? prev : { ...prev, listingId: items[0]._id }));
        }
      } catch (err) {
        console.error(err);
        setMessage('Failed to load listings.');
        setTone('error');
      }
    };
    loadListings();
  }, []);

  const updateField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    setMessage('');
    setTone('');
    setSlots([]);
    setLoading(true);
    try {
      const payload = {
        ...form,
        slotCount: Number(form.slotCount),
      };
      const res = await api.post('/availability', payload);
      setSlots(res.data.slots || []);
      setMessage('Availability slots created.');
      setTone('success');
    } catch (err) {
      setMessage(err.response?.data?.message || 'Failed to create availability.');
      setTone('error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Set Viewing Availability</h1>
          <p className="text-sm text-slate-600">Create viewing slots tenants can request.</p>
        </div>
        <Link
          to="/landlord/appointments"
          className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700"
        >
          View Appointments
        </Link>
      </div>

      <form onSubmit={onSubmit} className="mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="text-sm font-semibold text-slate-700">
            Listing
            <select
              value={form.listingId}
              onChange={(e) => updateField('listingId', e.target.value)}
              className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              required
            >
              <option value="">Select listing</option>
              {listings.map((listing) => (
                <option key={listing._id} value={listing._id}>
                  {listing.title}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-semibold text-slate-700">
            Date
            <input
              type="date"
              value={form.date}
              onChange={(e) => updateField('date', e.target.value)}
              className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              required
            />
          </label>
          <label className="text-sm font-semibold text-slate-700">
            Start Time
            <input
              type="time"
              value={form.startTime}
              onChange={(e) => updateField('startTime', e.target.value)}
              className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              required
            />
          </label>
          <label className="text-sm font-semibold text-slate-700">
            End Time
            <input
              type="time"
              value={form.endTime}
              onChange={(e) => updateField('endTime', e.target.value)}
              className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              required
            />
          </label>
          <label className="text-sm font-semibold text-slate-700">
            Slot Count
            <input
              type="number"
              min="1"
              value={form.slotCount}
              onChange={(e) => updateField('slotCount', e.target.value)}
              className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              required
            />
          </label>
        </div>

        {!listings.length && (
          <div className="mt-4 text-sm text-slate-500">Create a listing before setting availability.</div>
        )}

        {message && (
          <div
            className={`mt-4 text-sm font-semibold ${tone === 'error' ? 'text-red-600' : 'text-green-700'}`}
          >
            {message}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !listings.length}
          className="mt-4 inline-flex items-center justify-center rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-70"
        >
          {loading ? 'Saving...' : 'Create Slots'}
        </button>
      </form>

      <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Created Slots</h2>
        <p className="text-sm text-slate-600">Share these times with tenants for booking.</p>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {slots.map((slot) => (
            <div key={slot._id} className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-sm">
              <div className="font-semibold text-slate-900">{formatAppointmentWindow(slot.startTime, slot.endTime)}</div>
              <div className="text-xs text-slate-500">Status: {slot.isBooked ? 'Booked' : 'Open'}</div>
            </div>
          ))}
          {!slots.length && (
            <div className="rounded-lg border border-dashed border-slate-200 px-3 py-6 text-center text-sm text-slate-500">
              No slots created yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LandlordAvailabilityPage;
