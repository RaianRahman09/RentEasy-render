const express = require('express');
const { auth, requireRole } = require('../middleware/auth');
const {
  createConversation,
  listConversations,
  getConversationMessages,
  markConversationRead,
  getUnreadCount,
} = require('../controllers/conversationController');

const router = express.Router();

router.get('/unread-count', auth, getUnreadCount);
router.get('/conversations', auth, listConversations);
router.post('/conversations', auth, requireRole('tenant'), createConversation);
router.get('/conversations/:id/messages', auth, getConversationMessages);
router.post('/conversations/:id/read', auth, markConversationRead);

module.exports = router;
