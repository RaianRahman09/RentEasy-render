import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api from '../api/axios';
import { formatAppointmentWindow } from '../utils/appointments';

const RequestAppointmentPage = () => {
  const { listingId } = useParams();
  const navigate = useNavigate();
  const [listing, setListing] = useState(null);
  const [date, setDate] = useState('');
  const [slots, setSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState('');
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [tone, setTone] = useState('');

  useEffect(() => {
    const loadListing = async () => {
      try {
        const res = await api.get(`/listings/${listingId}`);
        setListing(res.data.listing);
      } catch (err) {
        console.error(err);
      }
    };
    loadListing();
  }, [listingId]);

  useEffect(() => {
    const loadSlots = async () => {
      if (!date) {
        setSlots([]);
        return;
      }
      setLoadingSlots(true);
      try {
        const res = await api.get(`/availability/${listingId}`, { params: { date } });
        setSlots(res.data.slots || []);
      } catch (err) {
        console.error(err);
        setSlots([]);
      } finally {
        setLoadingSlots(false);
      }
    };
    loadSlots();
  }, [listingId, date]);

  const submitRequest = async () => {
    if (!selectedSlot) return;
    setSubmitting(true);
    setMessage('');
    setTone('');
    try {
      await api.post('/appointments/request', { listingId, slotId: selectedSlot });
      setMessage('Viewing request submitted.');
      setTone('success');
      navigate('/tenant/appointments');
    } catch (err) {
      setMessage(err.response?.data?.message || 'Failed to request appointment.');
      setTone('error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Request a Viewing</h1>
          <p className="text-sm text-slate-600">Choose a landlord-approved slot.</p>
        </div>
        <Link
          to={`/listing/${listingId}`}
          className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700"
        >
          Back to Listing
        </Link>
      </div>

      <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">{listing?.title || 'Listing'}</h2>
            <p className="text-sm text-slate-500">{listing?.address}</p>
          </div>
          <div className="text-sm font-semibold text-slate-700">${listing?.rent || ''}/mo</div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <label className="text-sm font-semibold text-slate-700">
            Select date
            <input
              type="date"
              value={date}
              onChange={(e) => {
                setDate(e.target.value);
                setSelectedSlot('');
              }}
              className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </label>
        </div>

        <div className="mt-4">
          <div className="text-sm font-semibold text-slate-700">Available slots</div>
          {loadingSlots && <div className="mt-2 text-sm text-slate-500">Loading slots...</div>}
          {!loadingSlots && !slots.length && date && (
            <div className="mt-2 text-sm text-slate-500">No slots available for this date.</div>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            {slots.map((slot) => (
              <button
                key={slot._id}
                type="button"
                onClick={() => setSelectedSlot(slot._id)}
                className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                  selectedSlot === slot._id
                    ? 'border-blue-700 bg-blue-700 text-white'
                    : 'border-slate-200 text-slate-700'
                }`}
              >
                {formatAppointmentWindow(slot.startTime, slot.endTime)}
              </button>
            ))}
          </div>
        </div>

        {message && (
          <div className={`mt-4 text-sm font-semibold ${tone === 'error' ? 'text-red-600' : 'text-green-700'}`}>
            {message}
          </div>
        )}

        <button
          onClick={submitRequest}
          disabled={!selectedSlot || submitting}
          className="mt-4 rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {submitting ? 'Submitting...' : 'Request Viewing'}
        </button>
      </div>
    </div>
  );
};

export default RequestAppointmentPage;
