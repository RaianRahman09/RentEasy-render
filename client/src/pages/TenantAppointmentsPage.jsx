import React, { useEffect, useState } from 'react';
import api from '../api/axios';
import { formatAppointmentWindow } from '../utils/appointments';

const statusStyles = {
  REQUESTED: 'bg-amber-100 text-amber-700',
  ACCEPTED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
  CANCELLED: 'bg-slate-100 text-slate-700',
};

const TenantAppointmentsPage = () => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [tone, setTone] = useState('');
  const [rescheduleTarget, setRescheduleTarget] = useState(null);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [availableSlots, setAvailableSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState('');
  const [loadingSlots, setLoadingSlots] = useState(false);

  const loadAppointments = async () => {
    setLoading(true);
    try {
      const res = await api.get('/appointments/tenant');
      setAppointments(res.data.appointments || []);
    } catch (err) {
      console.error(err);
      setMessage('Failed to load appointments.');
      setTone('error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAppointments();
  }, []);

  useEffect(() => {
    const loadSlots = async () => {
      if (!rescheduleTarget || !rescheduleDate) {
        setAvailableSlots([]);
        return;
      }
      setLoadingSlots(true);
      try {
        const listingId = rescheduleTarget.listingId?._id || rescheduleTarget.listingId;
        const res = await api.get(`/availability/${listingId}`, { params: { date: rescheduleDate } });
        setAvailableSlots(res.data.slots || []);
      } catch (err) {
        console.error(err);
        setAvailableSlots([]);
      } finally {
        setLoadingSlots(false);
      }
    };
    loadSlots();
  }, [rescheduleTarget, rescheduleDate]);

  const startReschedule = (appointment) => {
    setRescheduleTarget(appointment);
    setRescheduleDate('');
    setAvailableSlots([]);
    setSelectedSlot('');
    setMessage('');
    setTone('');
  };

  const cancelReschedule = () => {
    setRescheduleTarget(null);
    setRescheduleDate('');
    setAvailableSlots([]);
    setSelectedSlot('');
  };

  const confirmReschedule = async () => {
    if (!rescheduleTarget || !selectedSlot) return;
    setMessage('');
    setTone('');
    try {
      await api.patch(`/appointments/${rescheduleTarget._id}/reschedule`, { newSlotId: selectedSlot });
      setMessage('Reschedule request sent.');
      setTone('success');
      cancelReschedule();
      loadAppointments();
    } catch (err) {
      setMessage(err.response?.data?.message || 'Failed to reschedule appointment.');
      setTone('error');
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">My Appointments</h1>
        <p className="text-sm text-slate-600">Review your upcoming and past viewing requests.</p>
      </div>

      {message && (
        <div className={`mt-4 text-sm font-semibold ${tone === 'error' ? 'text-red-600' : 'text-green-700'}`}>
          {message}
        </div>
      )}

      <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm text-slate-700">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Listing</th>
              <th className="px-4 py-3">Landlord</th>
              <th className="px-4 py-3">Date & Time</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {appointments.map((appointment) => (
              <tr key={appointment._id} className="border-t border-slate-100">
                <td className="px-4 py-3 font-semibold text-slate-900">
                  {appointment.listingId?.title || 'Listing'}
                </td>
                <td className="px-4 py-3">{appointment.landlordId?.name || 'Landlord'}</td>
                <td className="px-4 py-3">{formatAppointmentWindow(appointment.startTime, appointment.endTime)}</td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-1 text-xs font-semibold ${
                      statusStyles[appointment.status] || 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {appointment.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs font-semibold">
                  {appointment.status !== 'CANCELLED' ? (
                    <button
                      onClick={() => startReschedule(appointment)}
                      className="rounded-md border border-slate-300 px-3 py-1 text-slate-700"
                    >
                      Reschedule
                    </button>
                  ) : (
                    <span className="text-xs text-slate-400">No actions</span>
                  )}
                </td>
              </tr>
            ))}
            {!appointments.length && !loading && (
              <tr>
                <td colSpan="5" className="px-4 py-8 text-center text-sm text-slate-500">
                  No appointments yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        {loading && <div className="px-4 py-4 text-sm text-slate-500">Loading...</div>}
      </div>

      {rescheduleTarget && (
        <div className="mt-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Reschedule Appointment</h2>
              <p className="text-sm text-slate-600">
                Select a new slot for {rescheduleTarget.listingId?.title || 'this listing'}.
              </p>
            </div>
            <button onClick={cancelReschedule} className="text-sm font-semibold text-slate-500">
              Close
            </button>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="text-sm font-semibold text-slate-700">
              New Date
              <input
                type="date"
                value={rescheduleDate}
                onChange={(e) => {
                  setRescheduleDate(e.target.value);
                  setSelectedSlot('');
                }}
                className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
            </label>
          </div>

          <div className="mt-4">
            <div className="text-sm font-semibold text-slate-700">Available Slots</div>
            {loadingSlots && <div className="mt-2 text-sm text-slate-500">Loading slots...</div>}
            {!loadingSlots && !availableSlots.length && rescheduleDate && (
              <div className="mt-2 text-sm text-slate-500">No slots available for that date.</div>
            )}
            <div className="mt-3 flex flex-wrap gap-2">
              {availableSlots.map((slot) => (
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

          <button
            onClick={confirmReschedule}
            disabled={!selectedSlot}
            className="mt-4 rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            Request Reschedule
          </button>
        </div>
      )}
    </div>
  );
};

export default TenantAppointmentsPage;
