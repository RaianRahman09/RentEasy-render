const express = require('express');
const { auth, requireRole } = require('../middleware/auth');
const {
  createTicket,
  listMyTickets,
  getTicket,
  addMessage,
  markRead,
  updateStatus,
  listAdminTickets,
  listLandlordTickets,
  getUnreadCount,
} = require('../controllers/ticketController');

const router = express.Router();

router.post('/tickets', auth, requireRole('tenant'), createTicket);
router.get('/tickets/my', auth, requireRole('tenant'), listMyTickets);
router.get('/tickets/unread-count', auth, getUnreadCount);
router.get('/tickets/:id', auth, getTicket);
router.post('/tickets/:id/messages', auth, addMessage);
router.post('/tickets/:id/read', auth, markRead);
router.patch('/tickets/:id/status', auth, updateStatus);

router.get('/admin/tickets', auth, requireRole('admin'), listAdminTickets);
router.get('/landlord/tickets', auth, requireRole('landlord'), listLandlordTickets);

module.exports = router;
