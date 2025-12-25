const mongoose = require('mongoose');
const Conversation = require('../models/Conversation');
const Listing = require('../models/Listing');
const Message = require('../models/Message');
const { ensureConversationAccess, markConversationRead, getTotalUnreadCount } = require('../services/chatService');

const toConversationSummary = (conversation, userId) => {
  const isTenant = String(conversation.tenantId?._id || conversation.tenantId) === String(userId);
  const listing = conversation.listingId || {};
  const tenant = conversation.tenantId || {};
  const landlord = conversation.landlordId || {};
  return {
    _id: conversation._id,
    listingId: listing._id || conversation.listingId,
    listingTitle: listing.title,
    listingPhoto: Array.isArray(listing.photos) ? listing.photos[0] : undefined,
    tenantId: tenant._id || conversation.tenantId,
    tenantName: tenant.name,
    landlordId: landlord._id || conversation.landlordId,
    landlordName: landlord.name,
    lastMessageText: conversation.lastMessageText,
    lastMessageAt: conversation.lastMessageAt,
    unreadCount: isTenant ? conversation.unreadCountTenant : conversation.unreadCountLandlord,
    unreadCountTenant: conversation.unreadCountTenant,
    unreadCountLandlord: conversation.unreadCountLandlord,
  };
};

exports.createConversation = async (req, res) => {
  try {
    if (req.user.role !== 'tenant') {
      return res.status(403).json({ message: 'Forbidden' });
    }
    const { listingId } = req.body || {};
    if (!mongoose.Types.ObjectId.isValid(listingId)) {
      return res.status(400).json({ message: 'Invalid listing id' });
    }

    const listing = await Listing.findById(listingId).select('owner');
    if (!listing) {
      return res.status(404).json({ message: 'Listing not found' });
    }

    const tenantId = req.user.id;
    const landlordId = listing.owner;

    const conversation = await Conversation.findOneAndUpdate(
      { listingId, tenantId, landlordId },
      { $setOnInsert: { listingId, tenantId, landlordId } },
      { new: true, upsert: true }
    );

    return res.json({ conversationId: conversation._id });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Failed to start conversation' });
  }
};

exports.listConversations = async (req, res) => {
  try {
    const userId = req.user.id;
    const query = { $or: [{ tenantId: userId }, { landlordId: userId }] };
    const conversations = await Conversation.find(query)
      .populate('listingId', 'title photos')
      .populate('tenantId', 'name')
      .populate('landlordId', 'name')
      .sort({ lastMessageAt: -1, updatedAt: -1 })
      .lean();

    return res.json({
      conversations: conversations.map((conversation) => toConversationSummary(conversation, userId)),
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Failed to load conversations' });
  }
};

exports.getConversationMessages = async (req, res) => {
  try {
    const { id } = req.params;
    await ensureConversationAccess(id, req.user.id);
    const messages = await Message.find({ convId: id }).sort({ sentAt: 1 }).lean();
    return res.json({ messages });
  } catch (err) {
    console.error(err);
    return res.status(err.status || 500).json({ message: err.message || 'Failed to load messages' });
  }
};

exports.markConversationRead = async (req, res) => {
  try {
    const { id } = req.params;
    const updatedConversation = await markConversationRead({ conversationId: id, userId: req.user.id });
    const isTenant = String(updatedConversation.tenantId) === String(req.user.id);
    const unreadCount = isTenant ? updatedConversation.unreadCountTenant : updatedConversation.unreadCountLandlord;
    const totalUnread = await getTotalUnreadCount(req.user.id);
    return res.json({ success: true, conversationId: updatedConversation._id, unreadCount, totalUnread });
  } catch (err) {
    console.error(err);
    return res.status(err.status || 500).json({ message: err.message || 'Failed to mark messages as read' });
  }
};

exports.getUnreadCount = async (req, res) => {
  try {
    const totalUnread = await getTotalUnreadCount(req.user.id);
    return res.json({ totalUnread });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Failed to load unread count' });
  }
};
