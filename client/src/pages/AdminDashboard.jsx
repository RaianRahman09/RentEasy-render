import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';

const currencyFormatter = new Intl.NumberFormat('en-BD', {
  style: 'currency',
  currency: 'BDT',
  maximumFractionDigits: 0,
});

const formatCount = (value) => {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue.toLocaleString('en-BD') : '0';
};

const MetricCard = ({ title, value, children }) => (
  <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
    <div className="text-xs font-semibold uppercase text-slate-500">{title}</div>
    <div className="mt-2 text-2xl font-bold text-slate-900">{value}</div>
    {children}
  </div>
);

const SkeletonCard = () => (
  <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
    <div className="h-3 w-24 animate-pulse rounded bg-slate-200" />
    <div className="mt-3 h-7 w-32 animate-pulse rounded bg-slate-200" />
    <div className="mt-4 space-y-2">
      <div className="h-3 w-28 animate-pulse rounded bg-slate-100" />
      <div className="h-3 w-24 animate-pulse rounded bg-slate-100" />
    </div>
  </div>
);

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState(null);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const [metricsRes, pendingRes] = await Promise.all([
          api.get('/admin/dashboard/metrics'),
          api.get('/admin/verification/pending'),
        ]);
        setMetrics(metricsRes.data);
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

  const formatCurrency = (value) => currencyFormatter.format(Number(value) || 0);

  const formatSubmitted = (date) => {
    if (!date) return 'Unknown';
    const d = new Date(date);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-6 py-10">
        <h1 className="text-3xl font-bold text-slate-900">Admin Dashboard</h1>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
        <div className="mt-8 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="h-4 w-48 animate-pulse rounded bg-slate-200" />
          <div className="mt-4 space-y-3">
            <div className="h-3 w-full animate-pulse rounded bg-slate-100" />
            <div className="h-3 w-5/6 animate-pulse rounded bg-slate-100" />
            <div className="h-3 w-4/6 animate-pulse rounded bg-slate-100" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-6xl px-6 py-10 text-sm text-red-600">
        {error} Please refresh or try again.
      </div>
    );
  }

  if (!metrics) return null;

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <h1 className="text-3xl font-bold text-slate-900">Admin Dashboard</h1>
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <MetricCard title="Listings" value={formatCount(metrics.listings.total)}>
          <div className="mt-3 text-sm text-slate-600">
            <span className="font-semibold text-emerald-600">Active:</span> {formatCount(metrics.listings.active)}
          </div>
          <div className="text-sm text-slate-600">
            <span className="font-semibold text-slate-500">Archived:</span> {formatCount(metrics.listings.archived)}
          </div>
        </MetricCard>
        <MetricCard title="Users" value={formatCount(metrics.users.total)}>
          <div className="mt-3 text-sm text-slate-600">
            <span className="font-semibold text-blue-700">Tenants:</span> {formatCount(metrics.users.tenants)}
          </div>
          <div className="text-sm text-slate-600">
            <span className="font-semibold text-indigo-700">Landlords:</span> {formatCount(metrics.users.landlords)}
          </div>
        </MetricCard>
        <MetricCard title="Platform Revenue" value={formatCurrency(metrics.revenue.total)}>
          <div className="mt-3 text-sm text-slate-600">
            This month: {formatCurrency(metrics.revenue.thisMonth)}
          </div>
        </MetricCard>
      </div>
      <div className="mt-8 grid gap-4 md:grid-cols-2">
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
                    type="button"
                  >
                    Review
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Admin Tools</h2>
          <p className="mt-2 text-sm text-slate-600">
            Track platform health and stay on top of incoming verification requests.
          </p>
          <div className="mt-4">
            <button
              onClick={() => navigate('/admin/support')}
              className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white"
              type="button"
            >
              Open Support Inbox
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
