const express = require('express');
const { auth } = require('../middleware/auth');
const {
  listNotifications,
  getUnreadCount,
  markRead,
  markOneRead,
  deleteNotification,
  createDevNotification,
} = require('../controllers/notificationController');

const router = express.Router();

router.get('/', auth, listNotifications);
router.get('/unread-count', auth, getUnreadCount);
router.post('/dev', auth, createDevNotification);
router.patch('/mark-read', auth, markRead);
router.patch('/:id/read', auth, markOneRead);
router.delete('/:id', auth, deleteNotification);

module.exports = router;
