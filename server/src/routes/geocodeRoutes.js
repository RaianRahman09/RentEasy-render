const express = require('express');
const { geocodeAddress } = require('../controllers/geocodeController');

const router = express.Router();

router.post('/geocode', geocodeAddress);

module.exports = router;
