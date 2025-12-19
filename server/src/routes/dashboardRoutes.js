const express = require('express');
const { auth, requireRole } = require('../middleware/auth');
const {
  getTenantDashboard,
  getLandlordDashboard,
  getAdminDashboard,
} = require('../controllers/dashboardController');

const router = express.Router();

router.get('/tenant', auth, requireRole('tenant'), getTenantDashboard);
router.get('/landlord', auth, requireRole('landlord'), getLandlordDashboard);
router.get('/admin', auth, requireRole('admin'), getAdminDashboard);

module.exports = router;
