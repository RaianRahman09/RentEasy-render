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
} = require('../controllers/listingController');

const router = express.Router();

// public
router.get('/featured', getFeaturedListings);
router.get('/search', searchListingsByLocation);
router.get('/in-bounds', getListingsInBounds);
router.post('/search', searchListings);
router.get('/:id', getListingById);

// landlord protected
router.get('/', auth, requireRole('landlord'), getMyListings);
router.get('/:id/owner', auth, requireRole('landlord'), getListingByIdForOwner);
router.post('/', auth, requireRole('landlord'), upload.array('photos', 5), createListing);
router.put('/:id', auth, requireRole('landlord'), upload.array('photos', 5), updateListing);

module.exports = router;
