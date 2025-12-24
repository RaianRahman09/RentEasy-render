const express = require('express');
const { auth, requireRole } = require('../middleware/auth');
const { createAvailability, getAvailability } = require('../controllers/availabilityController');

const router = express.Router();

router.post('/availability', auth, requireRole('landlord'), createAvailability);
router.get('/availability/:listingId', auth, requireRole('tenant', 'landlord'), getAvailability);

module.exports = router;
