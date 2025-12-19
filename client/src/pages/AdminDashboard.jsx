import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const [dashRes, pendingRes] = await Promise.all([
          api.get('/dashboard/admin'),
          api.get('/admin/verification/pending'),
        ]);
        setData(dashRes.data);
        setRequests(pendingRes.data.requests || []);
      } catch (err) {
        console.error(err);
        setError('Failed to load admin data.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) return null;
  if (error) {
    return (
      <div className="mx-auto max-w-6xl px-6 py-10 text-sm text-red-600">
        {error} Please refresh or try again.
      </div>
    );
  }
  if (!data) return null;

  const formatSubmitted = (date) => {
    if (!date) return 'Unknown';
    const d = new Date(date);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <h1 className="text-3xl font-bold text-slate-900">Admin Dashboard</h1>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Pending Verification Requests</h2>
          <ul className="mt-3 space-y-2 text-sm text-slate-700">
            {requests.length === 0 && <li className="text-xs text-slate-500">No pending requests.</li>}
            {requests.map((r) => (
              <li key={r.id} className="rounded-lg bg-slate-50 px-3 py-2">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-slate-900">{r.name}</div>
                    <div className="text-xs text-slate-500">
                      {r.role} • Submitted {formatSubmitted(r.submittedAt)}
                    </div>
                  </div>
                  <span className="rounded-full bg-blue-100 px-2 py-1 text-[11px] font-semibold text-blue-700">
                    Pending
                  </span>
                </div>
                <div className="mt-2 flex gap-3 text-xs font-semibold text-blue-700">
                  <button
                    onClick={() => navigate(`/dashboard/admin/verification/${r.id}`)}
                    className="rounded-md bg-blue-600 px-3 py-1 text-white"
                  >
                    Review
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Platform Overview</h2>
          <div className="mt-2 text-sm text-slate-700">Total Users: {data.stats.totalUsers}</div>
          <div className="text-sm text-slate-700">Active Listings: {data.stats.activeListings}</div>
          <div className="text-sm text-slate-700">Active Bookings: {data.stats.activeBookings}</div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
