const express = require('express');
const { auth, requireRole } = require('../middleware/auth');
const {
  getPendingVerifications,
  getVerificationDetails,
  approveVerification,
  rejectVerification,
} = require('../controllers/verificationController');

const router = express.Router();

router.get('/admin/verification/pending', auth, requireRole('admin'), getPendingVerifications);
router.get('/admin/verification/:userId', auth, requireRole('admin'), getVerificationDetails);
router.post('/admin/verification/:userId/approve', auth, requireRole('admin'), approveVerification);
router.post('/admin/verification/:userId/reject', auth, requireRole('admin'), rejectVerification);

module.exports = router;
