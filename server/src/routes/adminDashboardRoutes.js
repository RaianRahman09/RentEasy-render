const express = require('express');
const { auth, requireRole } = require('../middleware/auth');
const { getAdminDashboardMetrics } = require('../controllers/adminDashboardController');

const router = express.Router();

router.get('/metrics', auth, requireRole('admin'), getAdminDashboardMetrics);

module.exports = router;
