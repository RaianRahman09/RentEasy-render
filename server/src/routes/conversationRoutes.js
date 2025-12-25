const express = require('express');
const { auth, requireRole } = require('../middleware/auth');
const {
  createConversation,
  listConversations,
  getConversationMessages,
  markConversationRead,
} = require('../controllers/conversationController');

const router = express.Router();

router.post('/conversations', auth, requireRole('tenant'), createConversation);
router.get('/conversations', auth, listConversations);
router.get('/conversations/:id/messages', auth, getConversationMessages);
router.patch('/conversations/:id/read', auth, markConversationRead);

module.exports = router;
