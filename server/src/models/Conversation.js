const mongoose = require('mongoose');

const ConversationSchema = new mongoose.Schema(
  {
    listingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Listing', required: true, index: true },
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    landlordId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    lastMessageText: { type: String, default: '' },
    lastMessageAt: { type: Date, default: null },
    unreadCountTenant: { type: Number, default: 0, min: 0 },
    unreadCountLandlord: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

ConversationSchema.index({ listingId: 1, tenantId: 1, landlordId: 1 }, { unique: true });

module.exports = mongoose.model('Conversation', ConversationSchema);
