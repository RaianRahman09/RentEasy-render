const mongoose = require('mongoose');
const Listing = require('../models/Listing');
const PropertyReview = require('../models/PropertyReview');
const {
  REVIEW_NOT_ELIGIBLE_MESSAGE,
  getReviewEligibility,
  refreshListingRatingSummary,
} = require('../services/reviewService');

const MAX_REVIEW_LENGTH = 2000;
const DEFAULT_REVIEW_LIMIT = 5;
const MAX_REVIEW_LIMIT = 30;

const parseWouldRecommend = (value) => {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true') return true;
    if (normalized === 'false') return false;
  }
  return null;
};

const mapReview = (review) => ({
  _id: review._id,
  rating: review.rating,
  reviewText: review.reviewText,
  wouldRecommend: typeof review.wouldRecommend === 'boolean' ? review.wouldRecommend : null,
  createdAt: review.createdAt,
  updatedAt: review.updatedAt,
  reviewer: {
    _id: review.tenantId?._id || null,
    name: review.tenantId?.name || 'Verified tenant',
    avatarUrl: review.tenantId?.avatarUrl || null,
  },
});

const parseReviewLimit = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) return DEFAULT_REVIEW_LIMIT;
  return Math.min(Math.trunc(parsed), MAX_REVIEW_LIMIT);
};

exports.submitPropertyReview = async (req, res) => {
  try {
    const listingId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(listingId)) {
      return res.status(400).json({ message: 'Invalid listing id.' });
    }

    const listing = await Listing.findById(listingId).select('_id');
    if (!listing) return res.status(404).json({ message: 'Listing not found.' });

    const rating = Number(req.body?.rating);
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Rating must be an integer from 1 to 5.' });
    }

    const reviewText = String(req.body?.reviewText || '').trim();
    if (reviewText.length > MAX_REVIEW_LENGTH) {
      return res.status(400).json({ message: `Review cannot exceed ${MAX_REVIEW_LENGTH} characters.` });
    }

    const wouldRecommend = parseWouldRecommend(req.body?.wouldRecommend);
    if (wouldRecommend === null) {
      return res.status(400).json({ message: 'Would recommend must be true or false when provided.' });
    }

    const eligibility = await getReviewEligibility({
      tenantId: req.user.id,
      listingId,
    });
    if (!eligibility.eligible || !eligibility.rental?._id) {
      return res
        .status(403)
        .json({ message: eligibility.message || REVIEW_NOT_ELIGIBLE_MESSAGE, reason: eligibility.reason });
    }

    let createdReview;
    try {
      createdReview = await PropertyReview.create({
        listingId,
        tenantId: req.user.id,
        rentalId: eligibility.rental._id,
        rating,
        reviewText,
        wouldRecommend,
      });
    } catch (createErr) {
      if (createErr?.code === 11000) {
        return res.status(409).json({ message: 'A review for this property already exists.' });
      }
      throw createErr;
    }

    const [summary, review] = await Promise.all([
      refreshListingRatingSummary(listingId),
      PropertyReview.findById(createdReview._id).populate('tenantId', 'name avatarUrl').lean(),
    ]);

    return res.status(201).json({
      message: 'Review submitted successfully.',
      review: mapReview(review),
      summary: {
        averageRating: summary?.ratingAverage || 0,
        totalReviews: summary?.ratingCount || 0,
        recommendCount: summary?.recommendCount || 0,
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Failed to submit review.' });
  }
};

exports.getPropertyReviews = async (req, res) => {
  try {
    const listingId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(listingId)) {
      return res.status(400).json({ message: 'Invalid listing id.' });
    }

    const listingExists = await Listing.exists({ _id: listingId });
    if (!listingExists) return res.status(404).json({ message: 'Listing not found.' });

    const reviews = await PropertyReview.find({ listingId })
      .sort({ createdAt: -1 })
      .limit(parseReviewLimit(req.query.limit))
      .populate('tenantId', 'name avatarUrl')
      .lean();

    return res.json({
      reviews: reviews.map(mapReview),
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Failed to load property reviews.' });
  }
};

exports.getPropertyRatingSummary = async (req, res) => {
  try {
    const listingId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(listingId)) {
      return res.status(400).json({ message: 'Invalid listing id.' });
    }

    const listing = await Listing.findById(listingId).select('ratingAverage ratingCount recommendCount');
    if (!listing) return res.status(404).json({ message: 'Listing not found.' });

    const totalReviews = Number(listing.ratingCount || 0);
    const recommendCount = Number(listing.recommendCount || 0);
    const averageRating = totalReviews ? Number(listing.ratingAverage || 0) : 0;

    return res.json({
      averageRating,
      totalReviews,
      recommendCount,
      recommendRate: totalReviews ? Number(((recommendCount / totalReviews) * 100).toFixed(1)) : null,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Failed to load rating summary.' });
  }
};

exports.getPropertyReviewEligibility = async (req, res) => {
  try {
    const listingId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(listingId)) {
      return res.status(400).json({ message: 'Invalid listing id.' });
    }

    const listingExists = await Listing.exists({ _id: listingId });
    if (!listingExists) return res.status(404).json({ message: 'Listing not found.' });

    const eligibility = await getReviewEligibility({
      tenantId: req.user.id,
      listingId,
    });

    return res.json({
      canReview: eligibility.eligible,
      message: eligibility.message || REVIEW_NOT_ELIGIBLE_MESSAGE,
      reason: eligibility.reason,
      dueMonths: eligibility.dueMonths || [],
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Failed to check review eligibility.' });
  }
};
