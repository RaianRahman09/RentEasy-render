const express = require('express');
const { auth, requireRole } = require('../middleware/auth');
const {
  requestAppointment,
  rescheduleAppointment,
  acceptAppointment,
  rejectAppointment,
  getLandlordAppointments,
  getTenantAppointments,
  getLandlordUpcomingCount,
} = require('../controllers/appointmentController');

const router = express.Router();

router.post('/appointments/request', auth, requireRole('tenant'), requestAppointment);
router.patch('/appointments/:id/reschedule', auth, requireRole('tenant'), rescheduleAppointment);
router.get('/appointments/tenant', auth, requireRole('tenant'), getTenantAppointments);

router.get('/appointments/landlord/upcoming-count', auth, requireRole('landlord'), getLandlordUpcomingCount);
router.get('/appointments/landlord', auth, requireRole('landlord'), getLandlordAppointments);
router.patch('/appointments/:id/accept', auth, requireRole('landlord'), acceptAppointment);
router.patch('/appointments/:id/reject', auth, requireRole('landlord'), rejectAppointment);

module.exports = router;
