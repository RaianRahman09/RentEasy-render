const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
  convId: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation', required: true, index: true },
  senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  receiverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  text: { type: String, required: true, trim: true },
  sentAt: { type: Date, default: Date.now },
  readAt: { type: Date, default: null },
});

module.exports = mongoose.model('Message', MessageSchema);
