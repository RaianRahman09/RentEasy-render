import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';

const StatCard = ({ label, value, helper }) => (
  <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
    <div className="text-xs font-semibold uppercase text-slate-500">{label}</div>
    <div className="mt-2 text-2xl font-bold text-slate-900">{value}</div>
    {helper && <div className="mt-1 text-xs text-slate-500">{helper}</div>}
  </div>
);

const PaymentDashboard = () => {
  const payouts = [
    { label: "This Month's Earnings", value: '$1,250', helper: '12% vs last month' },
    { label: "Last Month's Earnings", value: '$980', helper: 'Settled Oct 02' },
    { label: 'All-Time Earnings', value: '$14,300', helper: 'Since joining' },
    { label: 'Upcoming Payout', value: '$720', helper: 'Scheduled Nov 02' }
  ];

  const listingSlices = [
    { label: 'Suburban House', value: 4200, color: '#2563eb' },
    { label: 'Shewrapara Studio', value: 3100, color: '#f97316' },
    { label: 'Gulshan Flat', value: 2700, color: '#22c55e' },
    { label: 'Banani Shared', value: 1800, color: '#a855f7' }
  ];

  const incomeTrend = [
    { label: 'May', amount: 500 },
    { label: 'Jun', amount: 900 },
    { label: 'Jul', amount: 820 },
    { label: 'Aug', amount: 1000 },
    { label: 'Sep', amount: 1300 },
    { label: 'Oct', amount: 1250 }
  ];

  const transactions = [
    { id: 1, date: 'Oct 27', listing: 'Shewrapara Studio Apartment', type: 'Rent', amount: 1500, status: 'Cleared' },
    { id: 2, date: 'Oct 24', listing: 'Gulshan shared flat', type: 'Deposit', amount: 800, status: 'Processing' },
    { id: 3, date: 'Oct 19', listing: 'Banani shared flat', type: 'Late fee', amount: 120, status: 'Cleared' },
    { id: 4, date: 'Oct 12', listing: 'Suburban House', type: 'Rent', amount: 1800, status: 'Cleared' }
  ];

  const donutStops = useMemo(() => {
    const total = listingSlices.reduce((sum, item) => sum + item.value, 0);
    let cursor = 0;
    return listingSlices.map((item) => {
      const from = cursor;
      const to = cursor + (item.value / total) * 100;
      cursor = to;
      return { ...item, from, to };
    });
  }, [listingSlices]);

  const lastStop = donutStops.length ? donutStops[donutStops.length - 1].to : 0;
  const donutBackground = `conic-gradient(${donutStops
    .map((slice) => `${slice.color} ${slice.from}% ${slice.to}%`)
    .join(', ')}, #e2e8f0 ${lastStop}% 100%)`;

  const chartWidth = 320;
  const chartHeight = 140;
  const maxIncome = Math.max(...incomeTrend.map((p) => p.amount));
  const linePoints = incomeTrend
    .map((point, idx) => {
      const x = (idx / (incomeTrend.length - 1)) * chartWidth;
      const y = chartHeight - (point.amount / maxIncome) * chartHeight;
      return `${x},${y}`;
    })
    .join(' ');
  const areaPoints = `0,${chartHeight} ${linePoints} ${chartWidth},${chartHeight}`;

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase text-slate-500">Payments</p>
          <h1 className="text-3xl font-bold text-slate-900">Payment Dashboard</h1>
          <p className="mt-1 text-sm text-slate-600">Track earnings, payouts, and recent transactions.</p>
        </div>
        <div className="flex gap-3">
          <Link
            to="/dashboard/landlord"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700"
          >
            ← Back to Dashboard
          </Link>
          <button className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
            Payout Settings
          </button>
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-4">
        {payouts.map((item) => (
          <StatCard key={item.label} label={item.label} value={item.value} helper={item.helper} />
        ))}
      </div>

      <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <h2 className="text-lg font-semibold text-slate-900">Payment Overview</h2>
          <div className="flex flex-wrap gap-2 text-sm text-slate-600">
            <select className="rounded-lg border border-slate-200 bg-white px-3 py-2">
              <option>Date Range</option>
              <option>Last 30 days</option>
              <option>Last quarter</option>
              <option>Last year</option>
            </select>
            <select className="rounded-lg border border-slate-200 bg-white px-3 py-2">
              <option>Listing</option>
              <option>All listings</option>
              <option>Suburban House</option>
              <option>Gulshan flat</option>
            </select>
            <select className="rounded-lg border border-slate-200 bg-white px-3 py-2">
              <option>Status</option>
              <option>Cleared</option>
              <option>Processing</option>
              <option>Upcoming</option>
            </select>
          </div>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-slate-100 p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-800">Earnings by Listing</p>
              <span className="text-xs text-slate-500">Last 6 months</span>
            </div>
            <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-center">
              <div
                className="mx-auto h-40 w-40 rounded-full shadow-inner"
                style={{ backgroundImage: donutBackground }}
                aria-hidden
              />
              <ul className="space-y-2 text-sm text-slate-700">
                {donutStops.map((slice) => (
                  <li key={slice.label} className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full" style={{ backgroundColor: slice.color }} />
                      <span>{slice.label}</span>
                    </div>
                    <span className="font-semibold text-slate-900">${slice.value.toLocaleString()}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="rounded-xl border border-slate-100 p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-800">Income Over Months</p>
              <span className="text-xs text-slate-500">USD</span>
            </div>
            <div className="mt-4">
              <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="h-48 w-full">
                <defs>
                  <linearGradient id="lineGradient" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#2563eb" stopOpacity="0.28" />
                    <stop offset="100%" stopColor="#2563eb" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <polyline
                  fill="url(#lineGradient)"
                  points={areaPoints}
                  stroke="none"
                />
                <polyline
                  fill="none"
                  stroke="#2563eb"
                  strokeWidth="3"
                  points={linePoints}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {incomeTrend.map((point, idx) => {
                  const x = (idx / (incomeTrend.length - 1)) * chartWidth;
                  const y = chartHeight - (point.amount / maxIncome) * chartHeight;
                  return (
                    <g key={point.label}>
                      <circle cx={x} cy={y} r="4" fill="#2563eb" />
                      <text x={x} y={chartHeight + 12} textAnchor="middle" className="fill-slate-500 text-[10px]">
                        {point.label}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Recent Transactions</h2>
            <button className="text-sm font-semibold text-blue-700">Export CSV</button>
          </div>
          <div className="mt-3 overflow-auto">
            <table className="w-full min-w-[540px] text-sm text-slate-700">
              <thead>
                <tr className="text-xs uppercase text-slate-500">
                  <th className="py-2 text-left">Date</th>
                  <th className="py-2 text-left">Listing</th>
                  <th className="py-2 text-left">Type</th>
                  <th className="py-2 text-left">Amount</th>
                  <th className="py-2 text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((t) => (
                  <tr key={t.id} className="border-t border-slate-100">
                    <td className="py-3">{t.date}</td>
                    <td className="py-3">{t.listing}</td>
                    <td className="py-3">{t.type}</td>
                    <td className="py-3 font-semibold text-slate-900">${t.amount.toLocaleString()}</td>
                    <td className="py-3">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                          t.status === 'Cleared'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {t.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-base font-semibold text-slate-900">Payout Schedule</h3>
            <ul className="mt-3 space-y-3 text-sm text-slate-700">
              <li className="flex items-center justify-between">
                <span>Next automated payout</span>
                <span className="font-semibold text-slate-900">$720 • Nov 02</span>
              </li>
              <li className="flex items-center justify-between">
                <span>Minimum balance rule</span>
                <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
                  $200 threshold
                </span>
              </li>
              <li className="flex items-center justify-between">
                <span>Destination</span>
                <span className="text-sm text-slate-600">Checking •••• 1420</span>
              </li>
            </ul>
            <button className="mt-4 w-full rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-800">
              Edit payout preferences
            </button>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-base font-semibold text-slate-900">Reminders</h3>
            <ul className="mt-3 space-y-3 text-sm text-slate-700">
              <li className="flex items-start gap-2">
                <span className="mt-1 h-2 w-2 rounded-full bg-amber-400" />
                <div>
                  <div className="font-semibold text-slate-900">Confirm bank statement</div>
                  <p className="text-slate-600">Upload latest proof to keep payouts uninterrupted.</p>
                </div>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 h-2 w-2 rounded-full bg-green-400" />
                <div>
                  <div className="font-semibold text-slate-900">Rent reminders</div>
                  <p className="text-slate-600">Automatic reminders scheduled 3 days before due.</p>
                </div>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentDashboard;
