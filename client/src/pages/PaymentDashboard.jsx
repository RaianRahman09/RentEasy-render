import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import api from '../api/axios';

const formatCurrency = (value) => `৳${Number(value || 0).toLocaleString()}`;
const apiBase = (import.meta.env.VITE_API_BASE || 'http://localhost:5001/api').replace(/\/$/, '');

const buildReceiptUrl = (paymentId, mode) => {
  const token = localStorage.getItem('accessToken');
  const params = new URLSearchParams();
  if (mode) params.set('mode', mode);
  if (token) params.set('token', token);
  return `${apiBase}/payments/${paymentId}/receipt?${params.toString()}`;
};

const statusStyles = {
  succeeded: 'bg-green-100 text-green-700',
  processing: 'bg-yellow-100 text-yellow-700',
  failed: 'bg-red-100 text-red-700',
};

const pieColors = ['#2563eb', '#f97316', '#22c55e', '#0f766e', '#eab308', '#ef4444'];

const StatCard = ({ label, value, helper }) => (
  <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
    <div className="text-xs font-semibold uppercase text-slate-500">{label}</div>
    <div className="mt-2 text-2xl font-bold text-slate-900">{value}</div>
    {helper && <div className="mt-1 text-xs text-slate-500">{helper}</div>}
  </div>
);

const PaymentDashboard = () => {
  const [payments, setPayments] = useState([]);
  const [summary, setSummary] = useState({ thisMonth: 0, lastMonth: 0, allTime: 0 });
  const [filters, setFilters] = useState({ range: '30', listing: 'all' });
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

  const paymentsInRange = useMemo(() => {
    let scoped = [...payments];
    if (filters.listing !== 'all') {
      scoped = scoped.filter((payment) => {
        const listingId = payment.listingId?._id || payment.listingId;
        return String(listingId) === String(filters.listing);
      });
    }
    if (filters.range !== 'all') {
      const days = Number(filters.range);
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);
      scoped = scoped.filter((payment) => new Date(payment.createdAt) >= cutoff);
    }
    return scoped;
  }, [payments, filters.listing, filters.range]);

  const earningsByListing = useMemo(() => {
    const totals = new Map();
    paymentsInRange
      .filter((payment) => payment.status === 'succeeded')
      .forEach((payment) => {
        const id = payment.listingId?._id || payment.listingId || 'listing';
        const name = payment.listingId?.title || 'Listing';
        const current = totals.get(id) || { id, name, value: 0 };
        current.value += Number(payment.total || 0);
        totals.set(id, current);
      });
    const sorted = Array.from(totals.values()).sort((a, b) => b.value - a.value);
    const total = sorted.reduce((sum, item) => sum + item.value, 0);
    return sorted.map((item, index) => ({
      ...item,
      percent: total ? (item.value / total) * 100 : 0,
      color: pieColors[index % pieColors.length],
    }));
  }, [paymentsInRange]);

  const rangeLabel = useMemo(() => {
    if (filters.range === 'all') return 'All time';
    if (filters.range === '365') return 'Last year';
    return `Last ${filters.range} days`;
  }, [filters.range]);

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

  const handlePreview = (paymentId) => {
    window.open(buildReceiptUrl(paymentId, 'preview'), '_blank', 'noopener,noreferrer');
  };

  const handleDownload = (paymentId) => {
    const link = document.createElement('a');
    link.href = buildReceiptUrl(paymentId, 'download');
    link.download = `receipt_${paymentId}.pdf`;
    link.rel = 'noopener';
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const renderListingTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const data = payload[0].payload;
    const percentLabel = `${Math.round(data.percent)}%`;
    return (
      <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 shadow-sm">
        <div className="font-semibold text-slate-900">
          {data.name} — {formatCurrency(data.value)} ({percentLabel})
        </div>
      </div>
    );
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

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <StatCard label="This Month's Earnings" value={formatCurrency(summary.thisMonth)} />
        <StatCard label="Last Month's Earnings" value={formatCurrency(summary.lastMonth)} />
        <StatCard label="All-Time Earnings" value={formatCurrency(summary.allTime)} />
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
          </div>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-slate-100 p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-800">Earnings by Listing</p>
              <span className="text-xs text-slate-500">{rangeLabel}</span>
            </div>
            <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-center">
              <div className="h-56 w-full lg:w-1/2">
                {earningsByListing.length ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={earningsByListing}
                        dataKey="value"
                        nameKey="name"
                        innerRadius="55%"
                        outerRadius="85%"
                        paddingAngle={2}
                        stroke="transparent"
                      >
                        {earningsByListing.map((entry) => (
                          <Cell key={String(entry.id)} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip content={renderListingTooltip} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-slate-500">
                    No earnings yet.
                  </div>
                )}
              </div>
              <ul className="w-full space-y-2 text-sm text-slate-700 lg:w-1/2">
                {earningsByListing.map((slice) => (
                  <li key={String(slice.id)} className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full" style={{ backgroundColor: slice.color }} />
                      <div>
                        <div className="font-medium text-slate-800">{slice.name}</div>
                        <div className="text-xs text-slate-500">{Math.round(slice.percent)}%</div>
                      </div>
                    </div>
                    <span className="font-semibold text-slate-900">{formatCurrency(slice.value)}</span>
                  </li>
                ))}
                {earningsByListing.length === 0 && <li className="text-xs text-slate-500">No earnings yet.</li>}
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
                    className={`border-t border-slate-100 hover:bg-slate-50 ${
                      selectedPayment?._id === payment._id ? 'bg-slate-50' : ''
                    }`}
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
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={(event) => {
                            event.stopPropagation();
                            handlePreview(payment._id);
                          }}
                          disabled={payment.status !== 'succeeded'}
                          title={
                            payment.status === 'failed' ? 'Receipt available only for successful payments' : undefined
                          }
                          className="text-xs font-semibold text-blue-700 disabled:cursor-not-allowed disabled:text-slate-400"
                        >
                          Preview
                        </button>
                        <button
                          onClick={(event) => {
                            event.stopPropagation();
                            handleDownload(payment._id);
                          }}
                          disabled={payment.status !== 'succeeded'}
                          title={
                            payment.status === 'failed' ? 'Receipt available only for successful payments' : undefined
                          }
                          className="text-xs font-semibold text-blue-700 disabled:cursor-not-allowed disabled:text-slate-400"
                        >
                          Download
                        </button>
                      </div>
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
              <div className="flex gap-2">
                <button
                  onClick={() => handlePreview(selectedPayment._id)}
                  disabled={selectedPayment.status !== 'succeeded'}
                  title={
                    selectedPayment.status === 'failed'
                      ? 'Receipt available only for successful payments'
                      : undefined
                  }
                  className="flex-1 rounded-lg border border-blue-700 px-4 py-2 text-sm font-semibold text-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  Preview Receipt
                </button>
                <button
                  onClick={() => handleDownload(selectedPayment._id)}
                  disabled={selectedPayment.status !== 'succeeded'}
                  title={
                    selectedPayment.status === 'failed'
                      ? 'Receipt available only for successful payments'
                      : undefined
                  }
                  className="flex-1 rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70"
                >
                  Download Receipt
                </button>
              </div>
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
