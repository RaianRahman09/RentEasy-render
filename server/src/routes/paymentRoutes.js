const express = require('express');
const { auth, requireRole } = require('../middleware/auth');
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
router.get('/payments/:id/receipt', auth, getPaymentReceipt);
router.get('/landlord/payments', auth, requireRole('landlord'), getLandlordPayments);
router.get('/landlord/payments/summary', auth, requireRole('landlord'), getLandlordPaymentsSummary);
router.get('/landlord/payments/:id/receipt', auth, requireRole('landlord'), getPaymentReceipt);

module.exports = router;
