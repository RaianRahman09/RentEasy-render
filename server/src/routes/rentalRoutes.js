const express = require('express');
const { auth, requireRole } = require('../middleware/auth');
const {
  startRental,
  getTenantRentals,
  getRentalById,
  giveMoveOutNotice,
  getMoveOutDue,
  leaveRental,
  stopRental,
} = require('../controllers/rentalController');

const router = express.Router();

router.post('/rentals/:listingId/start', auth, requireRole('tenant'), startRental);
router.get('/rentals/:id', auth, requireRole('tenant'), getRentalById);
router.get('/tenant/rentals', auth, requireRole('tenant'), getTenantRentals);
router.post('/rentals/:rentalId/moveout-notice', auth, requireRole('tenant'), giveMoveOutNotice);
router.get('/rentals/:rentalId/moveout-due', auth, requireRole('tenant'), getMoveOutDue);
router.post('/rentals/:rentalId/leave', auth, requireRole('tenant'), leaveRental);
router.post('/rentals/:id/stop', auth, requireRole('tenant'), stopRental);

module.exports = router;
