import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../api/axios';

const statusPill = {
  pending: 'bg-yellow-100 text-amber-700',
  verified: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  unverified: 'bg-slate-100 text-slate-700',
};

const AdminVerificationReview = () => {
  const { userId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get(`/admin/verification/${userId}`);
        setData(res.data.user);
        setNote(res.data.user?.note || '');
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load verification request.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [userId]);

  const formatDateTime = (value) => {
    if (!value) return 'N/A';
    const d = new Date(value);
    return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
  };

  const decide = async (decision) => {
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const res = await api.post(`/admin/verification/${userId}/${decision}`, { note });
      setData((prev) => (prev ? { ...prev, status: res.data.status, note: res.data.note } : prev));
      setMessage(decision === 'approve' ? 'Verification approved.' : 'Verification rejected.');
    } catch (err) {
      setError(err.response?.data?.message || 'Action failed. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return null;
  if (!data) return <div className="mx-auto max-w-5xl px-6 py-10 text-sm text-red-600">{error}</div>;

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link to="/dashboard/admin" className="text-sm font-semibold text-blue-700">
            &larr; Back to dashboard
          </Link>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">Verification Review</h1>
          <p className="text-sm text-slate-600">Review uploaded IDs and update the verification status.</p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            statusPill[data.status] || statusPill.unverified
          }`}
        >
          {data.status?.charAt(0).toUpperCase() + data.status?.slice(1)}
        </span>
      </div>

      {message && <div className="mt-4 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">{message}</div>}
      {error && <div className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

      <div className="mt-6 space-y-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-lg font-semibold text-slate-900">Applicant</div>
          <dl className="mt-3 grid gap-4 md:grid-cols-2">
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-500">Name</dt>
              <dd className="text-sm font-semibold text-slate-900">{data.name}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-500">Role</dt>
              <dd className="text-sm font-semibold text-slate-900">{data.role}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-500">Email</dt>
              <dd className="text-sm text-slate-800">{data.email}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-500">Phone</dt>
              <dd className="text-sm text-slate-800">{data.phone || 'Not provided'}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-500">Submitted</dt>
              <dd className="text-sm text-slate-800">{formatDateTime(data.submittedAt)}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-500">Account Created</dt>
              <dd className="text-sm text-slate-800">{formatDateTime(data.createdAt)}</dd>
            </div>
          </dl>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-lg font-semibold text-slate-900">Documents</div>
          <div className="mt-3 grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <div className="text-sm font-semibold text-slate-700">Front ID</div>
              {data.docs?.frontUrl ? (
                <img
                  src={data.docs.frontUrl}
                  alt="Front ID"
                  className="mt-2 h-56 w-full rounded-md bg-white object-contain"
                />
              ) : (
                <p className="mt-2 text-xs text-slate-500">Not uploaded</p>
              )}
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <div className="text-sm font-semibold text-slate-700">Back ID / Student ID</div>
              {data.docs?.backUrl ? (
                <img
                  src={data.docs.backUrl}
                  alt="Back ID"
                  className="mt-2 h-56 w-full rounded-md bg-white object-contain"
                />
              ) : (
                <p className="mt-2 text-xs text-slate-500">Not uploaded</p>
              )}
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="text-lg font-semibold text-slate-900">Decision</div>
            {data.note && (
              <span className="text-xs font-semibold text-slate-500">Last note: {data.note}</span>
            )}
          </div>
          <label className="mt-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
            Admin Note (optional)
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            placeholder="Add a note for the user..."
          />
          <div className="mt-3 flex flex-wrap gap-3">
            <button
              onClick={() => decide('approve')}
              disabled={saving || data.status === 'verified'}
              className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-blue-200"
            >
              {saving ? 'Saving...' : 'Approve'}
            </button>
            <button
              onClick={() => decide('reject')}
              disabled={saving}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-red-200"
            >
              {saving ? 'Saving...' : 'Reject'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminVerificationReview;
