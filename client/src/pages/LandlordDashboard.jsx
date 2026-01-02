import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';

const StatCard = ({ title, value, accent, to }) => {
  const content = (
    <>
      <div className="text-xs font-semibold uppercase text-slate-500">{title}</div>
      <div className={`mt-2 text-2xl font-bold ${accent || 'text-slate-900'}`}>{value}</div>
    </>
  );
  const classes =
    'rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md';
  return to ? (
    <Link to={to} className={`${classes} block`}>
      {content}
    </Link>
  ) : (
    <div className={classes}>{content}</div>
  );
};

const formatCurrency = (value) => `৳${Number(value || 0).toLocaleString('en-BD')}`;

const LandlordDashboard = () => {
  const [data, setData] = useState(null);

  useEffect(() => {
    const load = async () => {
      const res = await api.get('/dashboard/landlord');
      setData(res.data);
    };
    load();
  }, []);

  if (!data) return null;

  const pendingTickets = typeof data.pendingTickets === 'number' ? data.pendingTickets : 0;
  const unseenMessages = typeof data.unseenMessages === 'number' ? data.unseenMessages : 0;

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold text-slate-900">Landlord Dashboard</h1>
        <Link
          to="/landlord/availability"
          className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white"
        >
          Set Viewing Availability
        </Link>
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-4">
        <StatCard title="Active Listings" value={data.activeCount} to="/landlord/listings?status=active" />
        <StatCard title="Upcoming Viewings" value={data.upcomingViewings} to="/landlord/appointments" />
        <StatCard title="Pending Tickets" value={pendingTickets} />
        <StatCard title="Total Earnings" value={formatCurrency(data.earnings.allTime)} accent="text-purple-700" />
      </div>

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Listings Snapshot</h2>
            <Link to="/landlord/listings" className="text-sm font-semibold text-blue-700">
              View All Listings
            </Link>
          </div>
          <table className="mt-3 w-full text-left text-sm text-slate-700">
            <thead>
              <tr className="text-xs uppercase text-slate-500">
                <th className="py-2">Title</th>
                <th className="py-2">Rent</th>
                <th className="py-2">Location</th>
                <th className="py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {data.snapshot.map((item) => (
                <tr key={item.title} className="border-t border-slate-100">
                  <td className="py-2">{item.title}</td>
                  <td className="py-2">{formatCurrency(item.rent)}</td>
                  <td className="py-2">{item.location}</td>
                  <td className="py-2 capitalize">
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-semibold ${
                        item.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {item.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Upcoming Appointments</h2>
            <Link to="/landlord/appointments" className="text-sm font-semibold text-blue-700">
              Manage all
            </Link>
          </div>
          <ul className="mt-3 space-y-3 text-sm text-slate-700">
            {data.appointments.map((a) => (
              <li key={a.listing} className="rounded-lg bg-slate-50 px-3 py-2">
                <div className="font-semibold text-slate-900">
                  {a.tenant} • {a.listing}
                </div>
                <div className="text-xs text-slate-500">{a.when} • {a.status}</div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Payment Summary</h2>
          <div className="mt-2 text-sm text-slate-700">This Month: {formatCurrency(data.earnings.thisMonth)}</div>
          <Link
            to="/dashboard/landlord/payments"
            className="mt-3 inline-flex items-center justify-center rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:shadow-sm"
          >
            View Payment Dashboard
          </Link>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Support & Messages</h2>
          <div className="text-sm text-slate-700">Tickets: {pendingTickets} unresolved</div>
          <div className="text-sm text-slate-700">Messages: {unseenMessages} unseen</div>
          <div className="mt-3 flex gap-2">
            <Link
              to="/dashboard/landlord/support"
              className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700"
            >
              Support
            </Link>
            <Link to="/chat" className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white">
              Messages
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LandlordDashboard;
