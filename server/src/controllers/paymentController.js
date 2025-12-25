const mongoose = require('mongoose');
const stripeSdk = require('stripe');
const Listing = require('../models/Listing');
const Payment = require('../models/Payment');
const Rental = require('../models/Rental');
const { MONTH_REGEX, addMonths, compareMonths, currentMonth, listMonths, nextUnpaidMonth } = require('../utils/months');
const {
  finalizeSucceededPayment,
  finalizeFailedPayment,
  reconcileProcessingPayments,
} = require('../services/paymentService');

const stripe = stripeSdk(process.env.STRIPE_SECRET_KEY || 'sk_test_missing');

const normalizeMonths = (months) => {
  const unique = Array.from(new Set(months.map((m) => String(m).trim())));
  return unique.sort();
};

const calculateTotals = ({ rentPrice, serviceChargePerMonth, monthsCount, penaltyAmount }) => {
  const normalizedServiceCharge = Number(serviceChargePerMonth || 0);
  const rentSubtotal = rentPrice * monthsCount;
  const serviceChargeTotal = normalizedServiceCharge * monthsCount;
  const base = rentSubtotal + serviceChargeTotal + penaltyAmount;
  const tax = Math.round(base * 0.05);
  const platformFee = Math.round(base * 0.02);
  const total = base + tax + platformFee;
  return {
    rentSubtotal,
    serviceCharge: serviceChargeTotal,
    serviceChargeTotal,
    serviceChargePerMonth: normalizedServiceCharge,
    tax,
    platformFee,
    total,
  };
};

const collectPaymentMonths = (payments = []) => {
  const paidMonths = new Set();
  const processingMonths = new Set();
  const blockedMonths = new Set();
  payments.forEach((payment) => {
    (payment.monthsPaid || []).forEach((month) => {
      blockedMonths.add(month);
      if (payment.status === 'succeeded') {
        paidMonths.add(month);
      }
      if (payment.status === 'processing') {
        processingMonths.add(month);
      }
    });
  });
  return { paidMonths, processingMonths, blockedMonths };
};


exports.createPaymentIntent = async (req, res) => {
  try {
    const { rentalId, selectedMonths = [], moveOutMonth, leaveFlow } = req.body;
    if (!rentalId) return res.status(400).json({ message: 'Rental id is required.' });

    const rental = await Rental.findOne({ _id: rentalId, tenantId: req.user.id, status: 'active' });
    if (!rental) return res.status(404).json({ message: 'Rental not found.' });

    const listing = await Listing.findById(rental.listingId);
    if (!listing) return res.status(404).json({ message: 'Listing not found.' });

    const incomingMonths = Array.isArray(selectedMonths) ? selectedMonths : [];
    const normalizedMonths = normalizeMonths(incomingMonths);
    if (normalizedMonths.length !== incomingMonths.length) {
      return res.status(400).json({ message: 'Duplicate months selected.' });
    }
    const invalidMonth = normalizedMonths.find((month) => !MONTH_REGEX.test(month));
    if (invalidMonth) {
      return res.status(400).json({ message: `Invalid month format: ${invalidMonth}` });
    }

    const useLeaveFlow = Boolean(leaveFlow || moveOutMonth);
    let penaltyAmount = 0;
    let effectiveMoveOutMonth = null;

    if (useLeaveFlow) {
      if (moveOutMonth && !MONTH_REGEX.test(moveOutMonth)) {
        return res.status(400).json({ message: 'Move-out month must be in YYYY-MM format.' });
      }
      effectiveMoveOutMonth = rental.moveOutNoticeMonth;
      if (!effectiveMoveOutMonth) {
        return res.status(400).json({ message: 'Give move-out notice first.' });
      }
      if (moveOutMonth && moveOutMonth !== effectiveMoveOutMonth) {
        return res.status(400).json({ message: 'Move-out month does not match your notice.' });
      }
      if (compareMonths(effectiveMoveOutMonth, rental.startMonth) < 0) {
        return res.status(400).json({ message: 'Move-out month cannot be before the rental start month.' });
      }

      const payments = await Payment.find({
        rentalId: rental._id,
        status: { $in: ['succeeded', 'processing'] },
      });
      await reconcileProcessingPayments(payments);
      const activePayments = payments.filter((payment) => ['succeeded', 'processing'].includes(payment.status));
      const { paidMonths, processingMonths } = collectPaymentMonths(activePayments);

      const noticeMonth = rental.moveOutNoticeGivenAt ? currentMonth(rental.moveOutNoticeGivenAt) : currentMonth();
      const noticeValidMonth = addMonths(noticeMonth, 1);
      penaltyAmount = compareMonths(effectiveMoveOutMonth, noticeValidMonth) < 0 ? listing.rent : 0;

      const nowMonth = currentMonth();
      const requiredPaidUntil =
        compareMonths(nowMonth, effectiveMoveOutMonth) > 0 ? nowMonth : effectiveMoveOutMonth;
      const nextMonth = nextUnpaidMonth(rental.startMonth, paidMonths);
      const dueRange =
        nextMonth && compareMonths(nextMonth, requiredPaidUntil) <= 0
          ? listMonths(nextMonth, requiredPaidUntil)
          : [];
      const dueMonths = dueRange.filter((month) => !paidMonths.has(month));

      if (dueMonths.some((month) => processingMonths.has(month))) {
        return res
          .status(409)
          .json({ message: 'A payment is still processing. Please wait for confirmation.' });
      }

      const dueSorted = [...dueMonths].sort();
      if (
        normalizedMonths.length !== dueSorted.length ||
        normalizedMonths.some((month, idx) => month !== dueSorted[idx])
      ) {
        return res.status(400).json({ message: 'Selected months must match the due months for move-out.' });
      }

      if (!normalizedMonths.length && !penaltyAmount) {
        return res.status(400).json({ message: 'No due payment remains for this move-out.' });
      }
    } else {
      const payments = await Payment.find({
        rentalId: rental._id,
        status: { $in: ['succeeded', 'processing'] },
      });
      await reconcileProcessingPayments(payments);
      const activePayments = payments.filter((payment) => ['succeeded', 'processing'].includes(payment.status));
      const { paidMonths, blockedMonths } = collectPaymentMonths(activePayments);
      const expectedStart = nextUnpaidMonth(rental.startMonth, blockedMonths);

      if (!expectedStart && normalizedMonths.length) {
        return res.status(400).json({ message: 'No unpaid months remain for this rental.' });
      }

      if (normalizedMonths.length) {
        if (normalizedMonths[0] !== expectedStart) {
          return res.status(400).json({ message: 'Selected months must start from the next unpaid month.' });
        }
        for (let i = 0; i < normalizedMonths.length; i += 1) {
          const expected = addMonths(expectedStart, i);
          if (normalizedMonths[i] !== expected) {
            return res.status(400).json({ message: 'Selected months must be contiguous.' });
          }
        }
      }

      const startMonthPaid = paidMonths.has(listing.rentStartMonth);
      const startMonthBlocked = blockedMonths.has(listing.rentStartMonth);
      if (!startMonthPaid && startMonthBlocked) {
        return res
          .status(409)
          .json({ message: 'Start month payment is still processing. Please wait for confirmation.' });
      }
      if (!startMonthPaid && normalizedMonths.length && normalizedMonths[0] !== listing.rentStartMonth) {
        return res.status(400).json({ message: 'First payment must include the rent start month.' });
      }

      const paidMonth = normalizedMonths.find((month) => paidMonths.has(month));
      if (paidMonth) {
        return res.status(400).json({ message: `Month ${paidMonth} has already been paid.` });
      }

      const duplicateMonth = normalizedMonths.find((month) => blockedMonths.has(month));
      if (duplicateMonth) {
        return res.status(400).json({ message: `Month ${duplicateMonth} has already been paid.` });
      }
    }

    const serviceChargePerMonth = Number(listing.serviceCharge || 0);
    const monthsCount = normalizedMonths.length;

    if (!monthsCount && !penaltyAmount) {
      return res.status(400).json({ message: 'Please select at least one month to pay.' });
    }

    const { rentSubtotal, serviceChargeTotal, tax, platformFee, total } = calculateTotals({
      rentPrice: listing.rent,
      serviceChargePerMonth,
      monthsCount,
      penaltyAmount,
    });

    if (!process.env.STRIPE_SECRET_KEY) {
      return res.status(500).json({ message: 'Stripe is not configured.' });
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: total,
      currency: 'bdt',
      automatic_payment_methods: { enabled: true },
      metadata: {
        rentalId: rental._id.toString(),
        tenantId: req.user.id,
      },
    });

    const payment = await Payment.create({
      rentalId: rental._id,
      tenantId: rental.tenantId,
      landlordId: rental.landlordId,
      listingId: rental.listingId,
      monthsPaid: normalizedMonths,
      rentSubtotal,
      serviceCharge: serviceChargeTotal,
      serviceChargePerMonth,
      tax,
      platformFee,
      penaltyAmount,
      total,
      currency: 'bdt',
      status: 'processing',
      stripePaymentIntentId: paymentIntent.id,
      moveOutMonth: useLeaveFlow ? effectiveMoveOutMonth : undefined,
    });

    return res.json({
      clientSecret: paymentIntent.client_secret,
      paymentId: payment._id,
      total,
      rentSubtotal,
      serviceCharge: serviceChargeTotal,
      serviceChargePerMonth,
      serviceChargeTotal,
      tax,
      platformFee,
      penaltyAmount,
      monthsPaid: normalizedMonths,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Failed to create payment intent.' });
  }
};

exports.handleStripeWebhook = async (req, res) => {
  const signature = req.headers['stripe-signature'];
  if (!signature) return res.status(400).json({ message: 'Missing Stripe signature.' });
  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    return res.status(500).json({ message: 'Stripe webhook secret is not configured.' });
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, signature, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Stripe webhook signature verification failed', err.message);
    return res.status(400).json({ message: `Webhook error: ${err.message}` });
  }

  const paymentIntent = event.data?.object;
  if (!paymentIntent?.id) return res.json({ received: true });

  try {
    if (event.type === 'payment_intent.succeeded') {
      const payment = await Payment.findOne({ stripePaymentIntentId: paymentIntent.id });
      if (!payment) return res.json({ received: true });

      await finalizeSucceededPayment(payment, paymentIntent);
    }

    if (event.type === 'payment_intent.payment_failed') {
      const payment = await Payment.findOne({ stripePaymentIntentId: paymentIntent.id });
      if (!payment) return res.json({ received: true });
      await finalizeFailedPayment(payment, paymentIntent);
    }
  } catch (err) {
    console.error('Stripe webhook handler error', err);
    return res.status(500).json({ message: 'Webhook handler failed.' });
  }

  return res.json({ received: true });
};

exports.getTenantPayments = async (req, res) => {
  try {
    const limit = Number(req.query.limit);
    const query = { tenantId: req.user.id };
    const processingPayments = await Payment.find({
      ...query,
      status: 'processing',
      stripePaymentIntentId: { $exists: true },
    });
    await reconcileProcessingPayments(processingPayments);

    const payments = await Payment.find(query)
      .populate('listingId', 'title address')
      .sort({ createdAt: -1 })
      .limit(Number.isFinite(limit) ? limit : 0)
      .lean();
    return res.json({ payments });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Failed to load payments.' });
  }
};

exports.getLandlordPayments = async (req, res) => {
  try {
    const { status, listingId, startDate, endDate } = req.query;
    const query = { landlordId: req.user.id };
    if (status) query.status = status;
    if (listingId) query.listingId = listingId;
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }
    const processingPayments = await Payment.find({
      ...query,
      status: 'processing',
      stripePaymentIntentId: { $exists: true },
    });
    await reconcileProcessingPayments(processingPayments);

    const payments = await Payment.find(query)
      .populate('listingId', 'title')
      .populate('tenantId', 'name email')
      .sort({ createdAt: -1 })
      .lean();
    return res.json({ payments });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Failed to load landlord payments.' });
  }
};

exports.getLandlordPaymentsSummary = async (req, res) => {
  try {
    const landlordId = new mongoose.Types.ObjectId(req.user.id);
    const now = new Date();
    const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const [thisMonth] = await Payment.aggregate([
      { $match: { landlordId, status: 'succeeded', createdAt: { $gte: startOfThisMonth, $lt: startOfNextMonth } } },
      { $group: { _id: null, total: { $sum: '$total' } } },
    ]);

    const [lastMonth] = await Payment.aggregate([
      { $match: { landlordId, status: 'succeeded', createdAt: { $gte: startOfLastMonth, $lt: startOfThisMonth } } },
      { $group: { _id: null, total: { $sum: '$total' } } },
    ]);

    const [allTime] = await Payment.aggregate([
      { $match: { landlordId, status: 'succeeded' } },
      { $group: { _id: null, total: { $sum: '$total' } } },
    ]);

    return res.json({
      thisMonth: thisMonth?.total || 0,
      lastMonth: lastMonth?.total || 0,
      allTime: allTime?.total || 0,
      upcomingPayout: null,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Failed to load payment summary.' });
  }
};

exports.getPaymentStatus = async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id);
    if (!payment) return res.status(404).json({ message: 'Payment not found.' });

    const isTenantOwner = String(payment.tenantId) === req.user.id;
    const isLandlordOwner = String(payment.landlordId) === req.user.id;
    if (!isTenantOwner && !isLandlordOwner && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden.' });
    }

    if (!payment.stripePaymentIntentId) {
      return res.json({ status: payment.status });
    }

    const paymentIntent = await stripe.paymentIntents.retrieve(payment.stripePaymentIntentId, {
      expand: ['charges.data'],
    });
    if (paymentIntent.status === 'succeeded') {
      await finalizeSucceededPayment(payment, paymentIntent);
    } else if (['requires_payment_method', 'canceled'].includes(paymentIntent.status)) {
      await finalizeFailedPayment(payment, paymentIntent);
    }

    return res.json({ status: payment.status });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Failed to refresh payment status.' });
  }
};

exports.getPaymentReceipt = async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id);
    if (!payment) return res.status(404).json({ message: 'Payment not found.' });

    const isTenantOwner = String(payment.tenantId) === req.user.id;
    const isLandlordOwner = String(payment.landlordId) === req.user.id;
    if (!isTenantOwner && !isLandlordOwner && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden.' });
    }

    if (payment.receiptUrl) {
      return res.json({ url: payment.receiptUrl });
    }
    return res.status(404).json({ message: 'Receipt not available yet.' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Failed to download receipt.' });
  }
};
