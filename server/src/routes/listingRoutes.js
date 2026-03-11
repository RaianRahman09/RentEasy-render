const express = require('express');
const { auth, requireRole } = require('../middleware/auth');
const upload = require('../middleware/upload');
const {
  getMyListings,
  createListing,
  updateListing,
  getListingById,
  getListingByIdForOwner,
  getFeaturedListings,
  searchListings,
  searchListingsByLocation,
  getListingsInBounds,
  deleteListing,
} = require('../controllers/listingController');
const {
  submitPropertyReview,
  getPropertyReviews,
  getPropertyRatingSummary,
  getPropertyReviewEligibility,
} = require('../controllers/reviewController');

const router = express.Router();

// public
router.get('/featured', getFeaturedListings);
router.get('/search', searchListingsByLocation);
router.get('/in-bounds', getListingsInBounds);
router.post('/search', searchListings);
router.get('/:id/reviews', getPropertyReviews);
router.post('/:id/reviews', auth, requireRole('tenant'), submitPropertyReview);
router.get('/:id/rating-summary', getPropertyRatingSummary);
router.get('/:id/review-eligibility', auth, requireRole('tenant'), getPropertyReviewEligibility);
router.get('/:id', getListingById);

// landlord protected
router.get('/', auth, requireRole('landlord'), getMyListings);
router.get('/:id/owner', auth, requireRole('landlord'), getListingByIdForOwner);
router.post('/', auth, requireRole('landlord'), upload.array('photos', 5), createListing);
router.put('/:id', auth, requireRole('landlord'), upload.array('photos', 5), updateListing);
router.delete('/:id', auth, requireRole('landlord'), deleteListing);

module.exports = router;
