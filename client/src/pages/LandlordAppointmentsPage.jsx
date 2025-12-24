import React, { useEffect, useState } from 'react';
import api from '../api/axios';
import { formatAppointmentWindow } from '../utils/appointments';

const statusStyles = {
  REQUESTED: 'bg-amber-100 text-amber-700',
  ACCEPTED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
  CANCELLED: 'bg-slate-100 text-slate-700',
};

const LandlordAppointmentsPage = () => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [tone, setTone] = useState('');

  const loadAppointments = async () => {
    setLoading(true);
    try {
      const res = await api.get('/appointments/landlord');
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

  const handleAction = async (id, action) => {
    setMessage('');
    setTone('');
    try {
      await api.patch(`/appointments/${id}/${action}`);
      setMessage(`Appointment ${action}ed.`);
      setTone('success');
      loadAppointments();
    } catch (err) {
      setMessage(err.response?.data?.message || 'Failed to update appointment.');
      setTone('error');
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Viewing Requests</h1>
          <p className="text-sm text-slate-600">Accept or reject tenant requests.</p>
        </div>
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
              <th className="px-4 py-3">Tenant</th>
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
                <td className="px-4 py-3">{appointment.tenantId?.name || 'Tenant'}</td>
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
                <td className="px-4 py-3 space-x-2 text-xs font-semibold">
                  {appointment.status === 'REQUESTED' ? (
                    <>
                      <button
                        onClick={() => handleAction(appointment._id, 'accept')}
                        className="rounded-md bg-green-600 px-3 py-1 text-white"
                      >
                        Accept
                      </button>
                      <button
                        onClick={() => handleAction(appointment._id, 'reject')}
                        className="rounded-md border border-slate-300 px-3 py-1 text-slate-700"
                      >
                        Reject
                      </button>
                    </>
                  ) : (
                    <span className="text-xs text-slate-400">No actions</span>
                  )}
                </td>
              </tr>
            ))}
            {!appointments.length && !loading && (
              <tr>
                <td colSpan="5" className="px-4 py-8 text-center text-sm text-slate-500">
                  No appointment requests yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        {loading && <div className="px-4 py-4 text-sm text-slate-500">Loading...</div>}
      </div>
    </div>
  );
};

export default LandlordAppointmentsPage;
