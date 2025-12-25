const express = require('express');
const { auth, authReceipt, requireRole } = require('../middleware/auth');
const {
  createPaymentIntent,
  getTenantPayments,
  getLandlordPayments,
  getLandlordPaymentsSummary,
  getPaymentStatus,
  getPaymentReceipt,
} = require('../controllers/paymentController');

const router = express.Router();

router.post('/payments/create-intent', auth, requireRole('tenant'), createPaymentIntent);
router.get('/payments', auth, requireRole('tenant'), getTenantPayments);
router.get('/payments/:id/status', auth, getPaymentStatus);
router.get('/payments/:id/receipt', authReceipt, getPaymentReceipt);
router.get('/landlord/payments', auth, requireRole('landlord'), getLandlordPayments);
router.get('/landlord/payments/summary', auth, requireRole('landlord'), getLandlordPaymentsSummary);
router.get('/landlord/payments/:id/receipt', authReceipt, requireRole('landlord'), getPaymentReceipt);

module.exports = router;
