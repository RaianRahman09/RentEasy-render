import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../api/axios';
import { monthLabel } from '../utils/months';

const statusStyles = {
  succeeded: 'bg-green-100 text-green-700',
  processing: 'bg-yellow-100 text-yellow-700',
  failed: 'bg-red-100 text-red-700',
};

const formatCurrency = (value) => `৳${Number(value || 0).toLocaleString()}`;
const apiBase = (import.meta.env.VITE_API_BASE || 'http://localhost:5001/api').replace(/\/$/, '');

const buildReceiptUrl = (paymentId, mode) => {
  const token = localStorage.getItem('accessToken');
  const params = new URLSearchParams();
  if (mode) params.set('mode', mode);
  if (token) params.set('token', token);
  return `${apiBase}/payments/${paymentId}/receipt?${params.toString()}`;
};

const TenantPaymentsPage = () => {
  const [payments, setPayments] = useState([]);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get('/payments');
        setPayments(res.data.payments || []);
      } catch (err) {
        toast.error(err.response?.data?.message || 'Failed to load payments.');
      }
    };
    load();
  }, []);

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

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase text-slate-500">Payments</p>
        <h1 className="text-3xl font-bold text-slate-900">Payment History</h1>
        <p className="text-sm text-slate-600">Review your rent payments and download receipts.</p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="overflow-auto">
          <table className="w-full min-w-[720px] text-sm text-slate-700">
            <thead className="text-xs uppercase text-slate-500">
              <tr>
                <th className="py-2 text-left">Date</th>
                <th className="py-2 text-left">Listing</th>
                <th className="py-2 text-left">Months Paid</th>
                <th className="py-2 text-left">Amount</th>
                <th className="py-2 text-left">Status</th>
                <th className="py-2 text-right">Receipt</th>
              </tr>
            </thead>
            <tbody>
              {payments.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-sm text-slate-500">
                    No payments yet.
                  </td>
                </tr>
              )}
              {payments.map((payment) => (
                <tr key={payment._id} className="border-t border-slate-100">
                  <td className="py-3">{new Date(payment.createdAt).toLocaleDateString()}</td>
                  <td className="py-3">{payment.listingId?.title || 'Listing'}</td>
                  <td className="py-3">
                    {(payment.monthsPaid || []).map((month) => monthLabel(month)).join(', ') || '—'}
                  </td>
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
                  <td className="py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => handlePreview(payment._id)}
                        disabled={payment.status !== 'succeeded'}
                        title={payment.status === 'failed' ? 'Receipt available only for successful payments' : undefined}
                        className="text-xs font-semibold text-blue-700 disabled:cursor-not-allowed disabled:text-slate-400"
                      >
                        Preview
                      </button>
                      <button
                        onClick={() => handleDownload(payment._id)}
                        disabled={payment.status !== 'succeeded'}
                        title={payment.status === 'failed' ? 'Receipt available only for successful payments' : undefined}
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
    </div>
  );
};

export default TenantPaymentsPage;
