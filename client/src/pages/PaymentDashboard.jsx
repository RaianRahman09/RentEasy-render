import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../api/axios';
import { downloadReceipt } from '../utils/receipt';

const formatCurrency = (value) => `৳${Number(value || 0).toLocaleString()}`;

const statusStyles = {
  succeeded: 'bg-green-100 text-green-700',
  processing: 'bg-yellow-100 text-yellow-700',
  failed: 'bg-red-100 text-red-700',
};

const StatCard = ({ label, value, helper }) => (
  <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
    <div className="text-xs font-semibold uppercase text-slate-500">{label}</div>
    <div className="mt-2 text-2xl font-bold text-slate-900">{value}</div>
    {helper && <div className="mt-1 text-xs text-slate-500">{helper}</div>}
  </div>
);

const PaymentDashboard = () => {
  const [payments, setPayments] = useState([]);
  const [summary, setSummary] = useState({ thisMonth: 0, lastMonth: 0, allTime: 0, upcomingPayout: null });
  const [filters, setFilters] = useState({ range: '30', status: 'all', listing: 'all' });
  const [selectedPayment, setSelectedPayment] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [summaryRes, paymentsRes] = await Promise.all([
          api.get('/landlord/payments/summary'),
          api.get('/landlord/payments'),
        ]);
        setSummary(summaryRes.data);
        setPayments(paymentsRes.data.payments || []);
      } catch (err) {
        toast.error(err.response?.data?.message || 'Failed to load payments.');
      }
    };
    load();
  }, []);

  const listingOptions = useMemo(() => {
    const unique = new Map();
    payments.forEach((payment) => {
      if (payment.listingId?.title) unique.set(payment.listingId._id, payment.listingId.title);
    });
    return Array.from(unique.entries()).map(([id, title]) => ({ id, title }));
  }, [payments]);

  const filteredPayments = useMemo(() => {
    let filtered = [...payments];
    if (filters.status !== 'all') {
      filtered = filtered.filter((payment) => payment.status === filters.status);
    }
    if (filters.listing !== 'all') {
      filtered = filtered.filter((payment) => payment.listingId?._id === filters.listing);
    }
    if (filters.range !== 'all') {
      const days = Number(filters.range);
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);
      filtered = filtered.filter((payment) => new Date(payment.createdAt) >= cutoff);
    }
    return filtered;
  }, [payments, filters]);

  const listingSlices = useMemo(() => {
    const totals = {};
    payments
      .filter((payment) => payment.status === 'succeeded')
      .forEach((payment) => {
        const title = payment.listingId?.title || 'Listing';
        totals[title] = (totals[title] || 0) + Number(payment.total || 0);
      });
    return Object.entries(totals)
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 4)
      .map((slice, index) => ({
        ...slice,
        color: ['#2563eb', '#f97316', '#22c55e', '#a855f7'][index % 4],
      }));
  }, [payments]);

  const incomeTrend = useMemo(() => {
    const now = new Date();
    const buckets = [];
    for (let i = 5; i >= 0; i -= 1) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${date.getFullYear()}-${date.getMonth()}`;
      buckets.push({
        key,
        label: date.toLocaleDateString(undefined, { month: 'short' }),
        amount: 0,
      });
    }
    payments
      .filter((payment) => payment.status === 'succeeded')
      .forEach((payment) => {
        const date = new Date(payment.createdAt);
        const key = `${date.getFullYear()}-${date.getMonth()}`;
        const bucket = buckets.find((item) => item.key === key);
        if (bucket) bucket.amount += Number(payment.total || 0);
      });
    return buckets;
  }, [payments]);

  const donutStops = useMemo(() => {
    if (!listingSlices.length) return [];
    const total = listingSlices.reduce((sum, item) => sum + item.value, 0) || 1;
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
  const maxIncome = Math.max(...incomeTrend.map((p) => p.amount), 1);
  const linePoints = incomeTrend
    .map((point, idx) => {
      const x = (idx / (incomeTrend.length - 1)) * chartWidth;
      const y = chartHeight - (point.amount / maxIncome) * chartHeight;
      return `${x},${y}`;
    })
    .join(' ');
  const areaPoints = `0,${chartHeight} ${linePoints} ${chartWidth},${chartHeight}`;

  const handleReceipt = async (paymentId) => {
    try {
      await downloadReceipt(paymentId, { routeBase: '/landlord/payments' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Receipt not available yet.');
    }
  };

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
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-4">
        <StatCard label="This Month's Earnings" value={formatCurrency(summary.thisMonth)} />
        <StatCard label="Last Month's Earnings" value={formatCurrency(summary.lastMonth)} />
        <StatCard label="All-Time Earnings" value={formatCurrency(summary.allTime)} />
        <StatCard
          label="Upcoming Payout"
          value={summary.upcomingPayout ? formatCurrency(summary.upcomingPayout) : 'N/A'}
          helper={summary.upcomingPayout ? 'Scheduled' : 'Stripe Connect not enabled'}
        />
      </div>

      <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <h2 className="text-lg font-semibold text-slate-900">Payment Overview</h2>
          <div className="flex flex-wrap gap-2 text-sm text-slate-600">
            <select
              className="rounded-lg border border-slate-200 bg-white px-3 py-2"
              value={filters.range}
              onChange={(e) => setFilters((prev) => ({ ...prev, range: e.target.value }))}
            >
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
              <option value="365">Last year</option>
              <option value="all">All time</option>
            </select>
            <select
              className="rounded-lg border border-slate-200 bg-white px-3 py-2"
              value={filters.listing}
              onChange={(e) => setFilters((prev) => ({ ...prev, listing: e.target.value }))}
            >
              <option value="all">All listings</option>
              {listingOptions.map((listing) => (
                <option key={listing.id} value={listing.id}>
                  {listing.title}
                </option>
              ))}
            </select>
            <select
              className="rounded-lg border border-slate-200 bg-white px-3 py-2"
              value={filters.status}
              onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}
            >
              <option value="all">All statuses</option>
              <option value="succeeded">Succeeded</option>
              <option value="processing">Processing</option>
              <option value="failed">Failed</option>
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
                style={{ backgroundImage: donutStops.length ? donutBackground : 'none' }}
                aria-hidden
              />
              <ul className="space-y-2 text-sm text-slate-700">
                {listingSlices.length === 0 && <li className="text-xs text-slate-500">No earnings yet.</li>}
                {donutStops.map((slice) => (
                  <li key={slice.label} className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full" style={{ backgroundColor: slice.color }} />
                      <span>{slice.label}</span>
                    </div>
                    <span className="font-semibold text-slate-900">{formatCurrency(slice.value)}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="rounded-xl border border-slate-100 p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-800">Income Over Months</p>
              <span className="text-xs text-slate-500">BDT</span>
            </div>
            <div className="mt-4">
              <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="h-48 w-full">
                <defs>
                  <linearGradient id="lineGradient" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#2563eb" stopOpacity="0.28" />
                    <stop offset="100%" stopColor="#2563eb" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <polyline fill="url(#lineGradient)" points={areaPoints} stroke="none" />
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
          </div>
          <div className="mt-3 overflow-auto">
            <table className="w-full min-w-[640px] text-sm text-slate-700">
              <thead className="text-xs uppercase text-slate-500">
                <tr>
                  <th className="py-2 text-left">Date</th>
                  <th className="py-2 text-left">Tenant</th>
                  <th className="py-2 text-left">Listing</th>
                  <th className="py-2 text-left">Amount</th>
                  <th className="py-2 text-left">Status</th>
                  <th className="py-2 text-left">Transaction</th>
                  <th className="py-2 text-right">Receipt</th>
                </tr>
              </thead>
              <tbody>
                {filteredPayments.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-6 text-center text-sm text-slate-500">
                      No payments found.
                    </td>
                  </tr>
                )}
                {filteredPayments.map((payment) => (
                  <tr
                    key={payment._id}
                    className="border-t border-slate-100 hover:bg-slate-50"
                    onClick={() => setSelectedPayment(payment)}
                  >
                    <td className="py-3">{new Date(payment.createdAt).toLocaleDateString()}</td>
                    <td className="py-3">{payment.tenantId?.name || 'Tenant'}</td>
                    <td className="py-3">{payment.listingId?.title || 'Listing'}</td>
                    <td className="py-3 font-semibold text-slate-900">{formatCurrency(payment.total)}</td>
                    <td className="py-3">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          statusStyles[payment.status] || 'bg-slate-100 text-slate-600'
                        }`}
                        title={payment.status === 'processing' ? 'Waiting for Stripe confirmation' : undefined}
                      >
                        {payment.status}
                      </span>
                    </td>
                    <td className="py-3 text-xs text-slate-500">
                      {payment.stripePaymentIntentId?.slice(0, 12) || '—'}
                    </td>
                    <td className="py-3 text-right">
                      <button
                        onClick={(event) => {
                          event.stopPropagation();
                          handleReceipt(payment._id);
                        }}
                        disabled={payment.status !== 'succeeded'}
                        className="text-xs font-semibold text-blue-700 disabled:cursor-not-allowed disabled:text-slate-400"
                      >
                        Download
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Payment Detail</h2>
          {selectedPayment ? (
            <div className="mt-4 space-y-3 text-sm text-slate-600">
              <div>
                <div className="text-xs font-semibold uppercase text-slate-500">Listing</div>
                <div className="text-sm font-semibold text-slate-900">
                  {selectedPayment.listingId?.title || 'Listing'}
                </div>
              </div>
              <div>
                <div className="text-xs font-semibold uppercase text-slate-500">Tenant</div>
                <div className="text-sm font-semibold text-slate-900">{selectedPayment.tenantId?.name || 'Tenant'}</div>
                <div className="text-xs text-slate-500">{selectedPayment.tenantId?.email}</div>
              </div>
              <div className="border-t border-slate-200 pt-3">
                <div className="flex items-center justify-between">
                  <span>Rent subtotal</span>
                  <span className="font-semibold text-slate-900">{formatCurrency(selectedPayment.rentSubtotal)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Service charge</span>
                  <span className="font-semibold text-slate-900">{formatCurrency(selectedPayment.serviceCharge)}</span>
                </div>
                {selectedPayment.penaltyAmount ? (
                  <div className="flex items-center justify-between">
                    <span>Penalty</span>
                    <span className="font-semibold text-slate-900">{formatCurrency(selectedPayment.penaltyAmount)}</span>
                  </div>
                ) : null}
                <div className="flex items-center justify-between">
                  <span>Tax</span>
                  <span className="font-semibold text-slate-900">{formatCurrency(selectedPayment.tax)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Platform fee</span>
                  <span className="font-semibold text-slate-900">{formatCurrency(selectedPayment.platformFee)}</span>
                </div>
                <div className="mt-2 flex items-center justify-between border-t border-slate-200 pt-2">
                  <span className="font-semibold text-slate-900">Total</span>
                  <span className="font-semibold text-slate-900">{formatCurrency(selectedPayment.total)}</span>
                </div>
              </div>
              <button
                onClick={() => handleReceipt(selectedPayment._id)}
                disabled={selectedPayment.status !== 'succeeded'}
                className="w-full rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70"
              >
                Download Receipt (PDF)
              </button>
            </div>
          ) : (
            <div className="mt-4 text-sm text-slate-500">Select a payment to view details.</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PaymentDashboard;
