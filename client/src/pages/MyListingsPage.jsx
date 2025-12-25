import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../api/axios';

const StatusBadge = ({ status }) => (
  <span
    className={`rounded-full px-2 py-1 text-xs font-semibold ${
      status === 'active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-700'
    }`}
  >
    {status}
  </span>
);

const MyListingsPage = () => {
  const [listings, setListings] = useState([]);
  const [searchParams, setSearchParams] = useSearchParams();
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '');
  const navigate = useNavigate();

  const load = async () => {
    const res = await api.get('/listings', { params: statusFilter ? { status: statusFilter } : {} });
    setListings(res.data.listings || []);
  };

  useEffect(() => {
    const statusFromUrl = searchParams.get('status') || '';
    if (statusFromUrl !== statusFilter) {
      setStatusFilter(statusFromUrl);
    }
  }, [searchParams, statusFilter]);

  useEffect(() => {
    const currentParam = searchParams.get('status') || '';
    if (currentParam !== statusFilter) {
      const params = statusFilter ? { status: statusFilter } : {};
      setSearchParams(params, { replace: true });
    }
    load();
  }, [statusFilter]);

  const updateStatus = async (id, status) => {
    try {
      await api.put(`/listings/${id}`, { status });
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update listing status.');
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold text-slate-900">My Listings</h1>
        <button
          onClick={() => navigate('/landlord/listings/new')}
          className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white"
        >
          Add New Listing
        </button>
      </div>
      <div className="mt-4 flex items-center gap-3">
        <label className="text-sm font-semibold text-slate-700">Filter by status</label>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
        >
          <option value="">All</option>
          <option value="active">Active</option>
          <option value="archived">Archived</option>
        </select>
      </div>
      <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm text-slate-700">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">Rent</th>
              <th className="px-4 py-3">Location</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Last Updated</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {listings.map((l) => (
              <tr key={l._id} className="border-t border-slate-100">
                <td className="px-4 py-3">{l.title}</td>
                <td className="px-4 py-3">${l.rent}/mo</td>
                <td className="px-4 py-3">{l.address}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={l.status} />
                </td>
                <td className="px-4 py-3">
                  {new Date(l.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                </td>
                <td className="px-4 py-3 space-x-2 text-xs font-semibold">
                  <Link to={`/landlord/listings/${l._id}/edit`} className="text-blue-700">
                    Edit
                  </Link>
                  <Link to={`/listing/${l._id}`} className="text-slate-700">
                    View
                  </Link>
                  {l.status === 'active' ? (
                    <button onClick={() => updateStatus(l._id, 'archived')} className="text-red-600">
                      Archive
                    </button>
                  ) : (
                    <button
                      onClick={() => updateStatus(l._id, 'active')}
                      disabled={l.activeRental}
                      title={l.activeRental ? 'Active after tenant leaves' : undefined}
                      className={`${
                        l.activeRental ? 'cursor-not-allowed text-slate-400' : 'text-blue-700'
                      }`}
                    >
                      Activate listing
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {!listings.length && (
              <tr>
                <td colSpan="6" className="px-4 py-6 text-center text-slate-600">
                  No listings yet. Create your first listing.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default MyListingsPage;
