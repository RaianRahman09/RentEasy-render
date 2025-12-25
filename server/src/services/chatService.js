const mongoose = require('mongoose');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');

const createError = (status, message) => {
  const err = new Error(message);
  err.status = status;
  return err;
};

const ensureConversationAccess = async (conversationId, userId) => {
  if (!mongoose.Types.ObjectId.isValid(conversationId)) {
    throw createError(400, 'Invalid conversation id');
  }
  const conversation = await Conversation.findById(conversationId);
  if (!conversation) {
    throw createError(404, 'Conversation not found');
  }
  const userKey = String(userId);
  if (String(conversation.tenantId) !== userKey && String(conversation.landlordId) !== userKey) {
    throw createError(403, 'Forbidden');
  }
  return conversation;
};

const resolveReceiverId = (conversation, senderId) => {
  const senderKey = String(senderId);
  if (String(conversation.tenantId) === senderKey) return conversation.landlordId;
  if (String(conversation.landlordId) === senderKey) return conversation.tenantId;
  return null;
};

const createMessage = async ({ conversationId, senderId, text }) => {
  const conversation = await ensureConversationAccess(conversationId, senderId);
  const receiverId = resolveReceiverId(conversation, senderId);
  if (!receiverId) {
    throw createError(403, 'Forbidden');
  }
  const trimmedText = String(text || '').trim();
  if (!trimmedText) {
    throw createError(400, 'Message text is required');
  }

  const message = await Message.create({
    convId: conversationId,
    senderId,
    receiverId,
    text: trimmedText,
  });

  const update = {
    $set: { lastMessageText: trimmedText, lastMessageAt: new Date() },
    $inc:
      String(receiverId) === String(conversation.tenantId)
        ? { unreadCountTenant: 1 }
        : { unreadCountLandlord: 1 },
  };

  const updatedConversation = await Conversation.findByIdAndUpdate(conversationId, update, { new: true });
  if (!updatedConversation) {
    throw createError(404, 'Conversation not found');
  }

  return { message, conversation: updatedConversation, receiverId };
};

const markConversationRead = async ({ conversationId, userId }) => {
  const conversation = await ensureConversationAccess(conversationId, userId);
  const now = new Date();
  await Message.updateMany({ convId: conversationId, receiverId: userId, readAt: null }, { $set: { readAt: now } });

  const update =
    String(userId) === String(conversation.tenantId)
      ? { unreadCountTenant: 0 }
      : { unreadCountLandlord: 0 };

  const updatedConversation = await Conversation.findByIdAndUpdate(conversationId, { $set: update }, { new: true });
  if (!updatedConversation) {
    throw createError(404, 'Conversation not found');
  }
  return updatedConversation;
};

const getTotalUnreadCount = async (userId) => {
  const [tenantConversations, landlordConversations] = await Promise.all([
    Conversation.find({ tenantId: userId }).select('unreadCountTenant').lean(),
    Conversation.find({ landlordId: userId }).select('unreadCountLandlord').lean(),
  ]);

  const tenantTotal = tenantConversations.reduce((sum, conversation) => sum + (conversation.unreadCountTenant || 0), 0);
  const landlordTotal = landlordConversations.reduce(
    (sum, conversation) => sum + (conversation.unreadCountLandlord || 0),
    0
  );

  return tenantTotal + landlordTotal;
};

module.exports = { ensureConversationAccess, createMessage, markConversationRead, getTotalUnreadCount };
