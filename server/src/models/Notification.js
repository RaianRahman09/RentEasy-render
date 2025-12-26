const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    role: { type: String, enum: ['tenant', 'landlord', 'admin'] },
    type: {
      type: String,
      enum: [
        'MESSAGE',
        'BOOKING',
        'PAYMENT',
        'SUPPORT',
        'APPOINTMENT_REQUESTED',
        'APPOINTMENT_ACCEPTED',
        'APPOINTMENT_REJECTED',
        'APPOINTMENT_RESCHEDULED',
        'APPOINTMENT_REMINDER',
        'RENTAL',
        'ticket_created',
        'ticket_reply',
        'ticket_status',
      ],
      required: true,
    },
    title: { type: String, required: true },
    body: { type: String, default: '' },
    link: { type: String, required: true },
    isRead: { type: Boolean, default: false },
    metadata: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true }
);

NotificationSchema.index({ userId: 1, createdAt: -1 });
NotificationSchema.index({ userId: 1, isRead: 1 });

module.exports = mongoose.model('Notification', NotificationSchema);
