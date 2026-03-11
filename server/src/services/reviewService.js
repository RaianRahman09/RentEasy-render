const mongoose = require('mongoose');
const Listing = require('../models/Listing');
const Payment = require('../models/Payment');
const PropertyReview = require('../models/PropertyReview');
const Rental = require('../models/Rental');
const { currentMonth, listMonths } = require('../utils/months');

const REVIEW_NOT_ELIGIBLE_MESSAGE =
  'You can review this property after your stay is complete and all payments are cleared.';
const REVIEW_ALREADY_SUBMITTED_MESSAGE = 'You have already submitted a review for this property.';

const toObjectId = (value) =>
  mongoose.Types.ObjectId.isValid(value) ? new mongoose.Types.ObjectId(value) : null;

const collectPaymentCoverage = (payments = []) => {
  const paidMonths = new Set();
  const processingMonths = new Set();
  let succeededPayments = 0;

  payments.forEach((payment) => {
    if (payment.status === 'succeeded') {
      succeededPayments += 1;
    }
    (payment.monthsPaid || []).forEach((month) => {
      if (payment.status === 'succeeded') {
        paidMonths.add(month);
      }
      if (payment.status === 'processing') {
        processingMonths.add(month);
      }
    });
  });

  return { paidMonths, processingMonths, succeededPayments };
};

const resolveRentalEndMonth = (rental = {}) =>
  rental.endMonth || rental.moveOutNoticeMonth || currentMonth(rental.endedAt || rental.updatedAt || new Date());

const evaluateRentalPaymentCompletion = (rental, payments = []) => {
  if (!rental || rental.status !== 'ended') {
    return {
      isPaidInFull: false,
      dueMonths: [],
      reason: 'stay_not_completed',
    };
  }

  const { paidMonths, processingMonths, succeededPayments } = collectPaymentCoverage(payments);
  if (processingMonths.size) {
    return {
      isPaidInFull: false,
      dueMonths: [],
      reason: 'processing_payment_pending',
    };
  }

  const requiredUntil = resolveRentalEndMonth(rental);
  const requiredMonths = listMonths(rental.startMonth, requiredUntil);
  const dueMonths = requiredMonths.filter((month) => !paidMonths.has(month));

  if (succeededPayments === 0) {
    return {
      isPaidInFull: false,
      dueMonths,
      reason: 'no_paid_rent_history',
    };
  }

  if (dueMonths.length) {
    return {
      isPaidInFull: false,
      dueMonths,
      reason: 'due_months_pending',
    };
  }

  return {
    isPaidInFull: true,
    dueMonths: [],
    reason: null,
  };
};

const resolveEligibilityMessage = (reason) => {
  if (reason === 'already_reviewed') return REVIEW_ALREADY_SUBMITTED_MESSAGE;
  return REVIEW_NOT_ELIGIBLE_MESSAGE;
};

const getReviewEligibility = async ({ tenantId, listingId }) => {
  const [existingReview, endedRentals] = await Promise.all([
    PropertyReview.findOne({ tenantId, listingId }).select('_id').lean(),
    Rental.find({ tenantId, listingId, status: 'ended' })
      .sort({ endedAt: -1, updatedAt: -1, createdAt: -1 })
      .select('_id listingId tenantId status startMonth endMonth moveOutNoticeMonth endedAt updatedAt')
      .lean(),
  ]);

  if (existingReview) {
    return {
      eligible: false,
      reason: 'already_reviewed',
      message: resolveEligibilityMessage('already_reviewed'),
      rental: null,
      dueMonths: [],
    };
  }

  if (!endedRentals.length) {
    return {
      eligible: false,
      reason: 'stay_not_completed',
      message: resolveEligibilityMessage('stay_not_completed'),
      rental: null,
      dueMonths: [],
    };
  }

  let mostRelevantIneligible = {
    reason: 'stay_not_completed',
    message: resolveEligibilityMessage('stay_not_completed'),
    dueMonths: [],
  };

  for (const rental of endedRentals) {
    const payments = await Payment.find({
      rentalId: rental._id,
      status: { $in: ['succeeded', 'processing'] },
    })
      .select('status monthsPaid')
      .lean();

    const paymentStatus = evaluateRentalPaymentCompletion(rental, payments);
    if (paymentStatus.isPaidInFull) {
      return {
        eligible: true,
        reason: null,
        message: 'You are eligible to review this property.',
        rental,
        dueMonths: [],
      };
    }

    mostRelevantIneligible = {
      reason: paymentStatus.reason,
      message: resolveEligibilityMessage(paymentStatus.reason),
      dueMonths: paymentStatus.dueMonths,
    };
  }

  return {
    eligible: false,
    reason: mostRelevantIneligible.reason,
    message: mostRelevantIneligible.message,
    rental: null,
    dueMonths: mostRelevantIneligible.dueMonths,
  };
};

const refreshListingRatingSummary = async (listingId) => {
  const listingObjectId = toObjectId(listingId);
  if (!listingObjectId) return null;

  const [summary] = await PropertyReview.aggregate([
    { $match: { listingId: listingObjectId } },
    {
      $group: {
        _id: '$listingId',
        ratingAverage: { $avg: '$rating' },
        ratingCount: { $sum: 1 },
        recommendCount: {
          $sum: {
            $cond: [{ $eq: ['$wouldRecommend', true] }, 1, 0],
          },
        },
      },
    },
  ]);

  const payload = summary
    ? {
        ratingAverage: Number(summary.ratingAverage.toFixed(2)),
        ratingCount: summary.ratingCount,
        recommendCount: summary.recommendCount,
      }
    : {
        ratingAverage: 0,
        ratingCount: 0,
        recommendCount: 0,
      };

  await Listing.findByIdAndUpdate(listingObjectId, payload);
  return payload;
};

module.exports = {
  REVIEW_NOT_ELIGIBLE_MESSAGE,
  REVIEW_ALREADY_SUBMITTED_MESSAGE,
  collectPaymentCoverage,
  evaluateRentalPaymentCompletion,
  getReviewEligibility,
  refreshListingRatingSummary,
};
