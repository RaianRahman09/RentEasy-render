import React, { useEffect, useMemo, useState } from 'react';
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../api/axios';
import { addMonths, compareMonths, listMonths, monthLabel } from '../utils/months';
import { downloadReceipt } from '../utils/receipt';

const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '';
const stripePromise = publishableKey ? loadStripe(publishableKey) : null;
const MONTH_WINDOW = 12;

const formatCurrency = (value) => `৳${Number(value || 0).toLocaleString()}`;

const CheckoutForm = ({ clientSecret, paymentId, onSuccess }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);

  const onSubmit = async (event) => {
    event.preventDefault();
    if (!stripe || !elements) return;
    setProcessing(true);
    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: 'if_required',
    });
    if (error) {
      toast.error(error.message || 'Payment failed. Please try again.');
      setProcessing(false);
      return;
    }
    if (paymentIntent?.status === 'succeeded' || paymentIntent?.status === 'processing') {
      onSuccess?.(paymentId);
      return;
    }
    toast.error('Payment was not completed.');
    setProcessing(false);
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <PaymentElement />
      <button
        type="submit"
        disabled={!stripe || processing}
        className="w-full rounded-lg bg-blue-700 px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70"
      >
        {processing ? 'Processing...' : 'Pay now'}
      </button>
    </form>
  );
};

const BookingPaymentPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const leaveFlow = location.state?.mode === 'LEAVE_FLOW';
  const [rental, setRental] = useState(null);
  const [listing, setListing] = useState(null);
  const [blockedMonths, setBlockedMonths] = useState([]);
  const [paidMonths, setPaidMonths] = useState([]);
  const [selectedMonths, setSelectedMonths] = useState([]);
  const [lockedMonths, setLockedMonths] = useState([]);
  const [selectionLocked, setSelectionLocked] = useState(false);
  const [clientSecret, setClientSecret] = useState('');
  const [paymentId, setPaymentId] = useState('');
  const [creatingIntent, setCreatingIntent] = useState(false);
  const [success, setSuccess] = useState(false);
  const [moveOutMonth, setMoveOutMonth] = useState('');
  const [penaltyAmount, setPenaltyAmount] = useState(0);
  const [nextUnpaidMonth, setNextUnpaidMonth] = useState('');
  const [leaveNoDue, setLeaveNoDue] = useState(false);
  const [leaveSubmitting, setLeaveSubmitting] = useState(false);

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const res = await api.get(`/rentals/${id}`);
        setRental(res.data.rental);
        setListing(res.data.listing);
        setBlockedMonths(res.data.blockedMonths || []);
        setPaidMonths(res.data.paidMonths || []);
        setNextUnpaidMonth(res.data.nextUnpaidMonth || '');
        setSelectionLocked(false);
        setLockedMonths([]);
        setSelectedMonths([]);
        setPenaltyAmount(0);
        setMoveOutMonth('');
        setLeaveNoDue(false);

        if (leaveFlow) {
          try {
            const dueRes = await api.get(`/rentals/${id}/moveout-due`);
            const dueMonths = dueRes.data.dueMonths || [];
            const fineAmount = Number(dueRes.data.fineAmount || 0);
            setMoveOutMonth(dueRes.data.moveOutMonth || res.data.rental?.moveOutNoticeMonth || '');
            setPenaltyAmount(fineAmount);
            setSelectedMonths([...dueMonths].sort());
            setLockedMonths([...dueMonths].sort());
            setSelectionLocked(true);
            setLeaveNoDue(dueMonths.length === 0 && fineAmount === 0);
            if (dueRes.data.overstay) {
              toast.error(dueRes.data.message || 'Move-out month has passed. Please settle through the current month.');
            }
          } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to load move-out due.');
            navigate('/dashboard/tenant');
          }
          return;
        }

        const preselected = location.state?.requiredMonths || [];
        const locked = location.state?.lockedMonths || location.state?.requiredMonths || [];
        const initialMoveOut = location.state?.moveOutMonth || '';
        const initialPenalty = Number(location.state?.penaltyAmount || 0);

        setMoveOutMonth(initialMoveOut);
        setPenaltyAmount(initialPenalty);

        if (preselected.length) {
          setSelectedMonths([...preselected].sort());
          setLockedMonths([...locked].sort());
          setSelectionLocked(true);
          return;
        }

        const nextMonth = res.data.nextUnpaidMonth;
        const serverLocked = res.data.lockedMonths || [];
        setLockedMonths(serverLocked);
        if (serverLocked.length) {
          setSelectedMonths([...serverLocked].sort());
          return;
        }
        if (nextMonth) {
          setSelectedMonths([nextMonth]);
        }
      } catch (err) {
        toast.error(err.response?.data?.message || 'Failed to load rental.');
        if (leaveFlow) {
          navigate('/dashboard/tenant');
        }
      }
    };
    bootstrap();
  }, [id, location.state, leaveFlow, navigate]);

  const startMonth = listing?.rentStartMonth;
  const listStart = useMemo(() => {
    if (!startMonth) return null;
    if (nextUnpaidMonth) {
      const windowEnd = addMonths(startMonth, MONTH_WINDOW - 1);
      if (windowEnd && compareMonths(nextUnpaidMonth, windowEnd) > 0) {
        return nextUnpaidMonth;
      }
    }
    return startMonth;
  }, [nextUnpaidMonth, startMonth]);
  const monthOptions = useMemo(() => (listStart ? listMonths(listStart, MONTH_WINDOW) : []), [listStart]);
  const rawStartIndex = nextUnpaidMonth ? monthOptions.indexOf(nextUnpaidMonth) : -1;
  const startIndex = rawStartIndex >= 0 ? rawStartIndex : monthOptions.length;
  const blockedSet = useMemo(() => new Set(blockedMonths), [blockedMonths]);
  const paidSet = useMemo(() => new Set(paidMonths), [paidMonths]);
  const lockedSet = useMemo(() => new Set(lockedMonths), [lockedMonths]);
  const startMonthPending =
    listing?.rentStartMonth && blockedSet.has(listing.rentStartMonth) && !paidSet.has(listing.rentStartMonth);
  const firstBlockedIndex = monthOptions.findIndex(
    (month, idx) => idx >= startIndex && blockedSet.has(month)
  );
  const maxSelectableIndex = firstBlockedIndex === -1 ? monthOptions.length - 1 : firstBlockedIndex - 1;

  const toggleMonth = (month, idx) => {
    if (selectionLocked) return;
    if (lockedSet.has(month)) return;
    if (idx < startIndex || idx > maxSelectableIndex || blockedSet.has(month)) return;
    if (selectedMonths.includes(month)) {
      const kept = selectedMonths.filter((m) => compareMonths(m, month) < 0 || lockedSet.has(m));
      setSelectedMonths(kept);
      return;
    }
    const range = monthOptions.slice(startIndex, idx + 1).filter((m) => !blockedSet.has(m));
    const merged = Array.from(new Set([...lockedMonths, ...range])).sort();
    setSelectedMonths(merged);
  };

  const monthsCount = selectedMonths.length;
  const rentSubtotal = listing ? listing.rent * monthsCount : 0;
  const serviceChargePerMonth = Number(listing?.serviceCharge || 0);
  const serviceChargeTotal = serviceChargePerMonth * monthsCount;
  const base = rentSubtotal + serviceChargeTotal + penaltyAmount;
  const tax = Math.round(base * 0.05);
  const platformFee = Math.round(base * 0.02);
  const total = base + tax + platformFee;

  const handleCreateIntent = async () => {
    if (!selectedMonths.length && !penaltyAmount) {
      toast.error('Select at least one month to pay.');
      return;
    }
    const blocked = new Set(blockedMonths);
    const paidInSelection = selectedMonths.find((month) => blocked.has(month));
    if (paidInSelection) {
      toast.error(`Month ${paidInSelection} is already paid.`);
      return;
    }
    setCreatingIntent(true);
    try {
      const payload = {
        rentalId: id,
        selectedMonths,
      };
      if (leaveFlow) {
        payload.leaveFlow = true;
      }
      const res = await api.post('/payments/create-intent', payload);
      setClientSecret(res.data.clientSecret);
      setPaymentId(res.data.paymentId);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to start payment.');
    } finally {
      setCreatingIntent(false);
    }
  };

  const handlePaymentSuccess = (completedPaymentId) => {
    setSuccess(true);
    setPaymentId(completedPaymentId);
  };

  useEffect(() => {
    if (!success || !paymentId) return;
    api.get(`/payments/${paymentId}/status`).catch(() => {});
  }, [success, paymentId]);

  const handleLeave = async () => {
    setLeaveSubmitting(true);
    try {
      await api.post(`/rentals/${id}/leave`);
      toast.success('You have left the property.');
      navigate('/dashboard/tenant');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to leave the property.');
    } finally {
      setLeaveSubmitting(false);
    }
  };

  const handleReceiptDownload = async () => {
    try {
      await downloadReceipt(paymentId);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Receipt is not ready yet.');
    }
  };

  if (!listing || !rental) return null;

  if (success) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-12">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-2xl font-bold text-slate-900">Payment successful</h1>
          <p className="mt-2 text-sm text-slate-600">
            {leaveFlow
              ? 'Your final payment is recorded. Complete the move-out to finish.'
              : 'Your rent payment has been recorded successfully.'}
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            {leaveFlow && (
              <button
                onClick={handleLeave}
                disabled={leaveSubmitting}
                className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70"
              >
                {leaveSubmitting ? 'Finishing...' : 'Complete move-out'}
              </button>
            )}
            <button
              onClick={handleReceiptDownload}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700"
            >
              Download receipt
            </button>
            <button
              onClick={() => navigate('/dashboard/tenant')}
              className={`rounded-lg px-4 py-2 text-sm font-semibold ${
                leaveFlow ? 'border border-slate-200 text-slate-700' : 'bg-blue-700 text-white'
              }`}
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase text-slate-500">Checkout</p>
          <h1 className="text-3xl font-bold text-slate-900">Pay rent</h1>
        </div>
        <Link to="/dashboard/tenant" className="text-sm font-semibold text-blue-700">
          Back to dashboard
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Listing summary</h2>
            <div className="mt-4 flex flex-col gap-4 sm:flex-row">
              <img
                src={
                  listing.photos?.[0] ||
                  'https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=800&q=80'
                }
                alt={listing.title}
                className="h-28 w-40 rounded-lg object-cover"
              />
              <div>
                <div className="text-lg font-semibold text-slate-900">{listing.title}</div>
                <div className="text-sm text-slate-600">{listing.address}</div>
                <div className="mt-2 text-sm text-slate-600">
                  Monthly rent: {formatCurrency(listing.rent)}
                </div>
                <div className="text-sm text-slate-600">
                  Available from: {monthLabel(listing.rentStartMonth)}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Select months</h2>
                {nextUnpaidMonth && (
                  <p className="text-sm text-slate-600">
                    Next payment date: {new Date(`${nextUnpaidMonth}-01`).toLocaleDateString()}
                  </p>
                )}
              </div>
              {moveOutMonth && (
                <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                  Move-out flow
                </span>
              )}
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {monthOptions.map((month, idx) => {
                const isPaid = paidSet.has(month);
                const isProcessing = blockedSet.has(month) && !paidSet.has(month);
                const isLocked = lockedSet.has(month);
                const isSelected = selectedMonths.includes(month);
                const isDisabled = idx < startIndex || idx > maxSelectableIndex || blockedSet.has(month) || isLocked;
                return (
                  <button
                    type="button"
                    key={month}
                    onClick={() => toggleMonth(month, idx)}
                    className={`flex items-center justify-between rounded-lg border px-3 py-2 text-sm font-semibold ${
                      isSelected ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-700'
                    } ${isDisabled ? 'cursor-not-allowed opacity-60' : ''}`}
                  >
                    <span>{monthLabel(month)}</span>
                    {isPaid && <span className="text-xs text-slate-500">Paid</span>}
                    {isProcessing && <span className="text-xs text-slate-500">Processing</span>}
                    {isLocked && !isPaid && <span className="text-xs text-slate-500">Locked</span>}
                  </button>
                );
              })}
            </div>
            {selectionLocked && (
              <div className="mt-3 text-xs text-slate-500">This payment selection is fixed for move-out.</div>
            )}
            {leaveNoDue && (
              <div className="mt-3 text-xs text-slate-500">No due payment remains for this move-out.</div>
            )}
            {startMonthPending && (
              <div className="mt-3 text-xs font-semibold text-yellow-600">
                Your first month payment is still processing. Please wait for Stripe confirmation.
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Price breakdown</h2>
            <div className="mt-4 space-y-2 text-sm text-slate-600">
              <div className="flex items-center justify-between">
                <span>Rent subtotal</span>
                <span className="font-semibold text-slate-900">{formatCurrency(rentSubtotal)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>
                  Service charge ({formatCurrency(serviceChargePerMonth)} x {monthsCount}{' '}
                  {monthsCount === 1 ? 'month' : 'months'}) =
                </span>
                <span className="font-semibold text-slate-900">{formatCurrency(serviceChargeTotal)}</span>
              </div>
              {penaltyAmount > 0 && (
                <div className="flex items-center justify-between">
                  <span>Notice penalty</span>
                  <span className="font-semibold text-slate-900">{formatCurrency(penaltyAmount)}</span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span>Tax (5%)</span>
                <span className="font-semibold text-slate-900">{formatCurrency(tax)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Platform fee (2%)</span>
                <span className="font-semibold text-slate-900">{formatCurrency(platformFee)}</span>
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-slate-200 pt-3">
                <span className="text-base font-semibold text-slate-900">Total due</span>
                <span className="text-base font-bold text-slate-900">{formatCurrency(total)}</span>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            {leaveFlow && leaveNoDue ? (
              <>
                <p className="text-sm text-slate-600">No due payment. Confirm leave to end the rental.</p>
                <button
                  type="button"
                  onClick={handleLeave}
                  disabled={leaveSubmitting}
                  className="mt-4 w-full rounded-lg bg-blue-700 px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {leaveSubmitting ? 'Finishing...' : 'Confirm leave'}
                </button>
              </>
            ) : !clientSecret ? (
              <>
                <button
                  type="button"
                  onClick={handleCreateIntent}
                  disabled={creatingIntent || startMonthPending}
                  className="w-full rounded-lg bg-blue-700 px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {creatingIntent ? 'Preparing payment...' : 'Pay with Stripe'}
                </button>
                <p className="mt-3 text-xs text-slate-500">Secure checkout powered by Stripe.</p>
              </>
            ) : stripePromise ? (
              <Elements stripe={stripePromise} options={{ clientSecret }}>
                <CheckoutForm clientSecret={clientSecret} paymentId={paymentId} onSuccess={handlePaymentSuccess} />
              </Elements>
            ) : (
              <div className="text-sm text-slate-500">Stripe publishable key is missing.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookingPaymentPage;
