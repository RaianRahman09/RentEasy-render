const mongoose = require('mongoose');

const TicketSchema = new mongoose.Schema(
  {
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    assignedToRole: { type: String, enum: ['admin', 'landlord'], required: true },
    assignedToUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    listingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Listing' },
    rentalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Rental' },
    subject: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    type: { type: String, enum: ['technical', 'property'], required: true },
    labelKey: { type: String, required: true },
    labelName: { type: String, required: true },
    labelColor: { type: String, required: true },
    status: { type: String, enum: ['open', 'in_progress', 'resolved', 'closed'], default: 'open' },
    priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
    lastMessageAt: { type: Date, default: Date.now },
    unreadFor: {
      tenant: { type: Number, default: 0, min: 0 },
      admin: { type: Number, default: 0, min: 0 },
      landlord: { type: Number, default: 0, min: 0 },
    },
  },
  { timestamps: true }
);

TicketSchema.index({ createdBy: 1, lastMessageAt: -1 });
TicketSchema.index({ assignedToUserId: 1, lastMessageAt: -1 });
TicketSchema.index({ type: 1, status: 1, priority: 1 });
TicketSchema.index({ listingId: 1 });

module.exports = mongoose.model('Ticket', TicketSchema);
