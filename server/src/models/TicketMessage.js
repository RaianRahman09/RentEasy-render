const mongoose = require('mongoose');

const TicketMessageSchema = new mongoose.Schema(
  {
    ticketId: { type: mongoose.Schema.Types.ObjectId, ref: 'Ticket', required: true, index: true },
    senderRole: { type: String, enum: ['tenant', 'admin', 'landlord'], required: true },
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    text: { type: String, required: true, trim: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

TicketMessageSchema.index({ ticketId: 1, createdAt: 1 });

module.exports = mongoose.model('TicketMessage', TicketMessageSchema);
