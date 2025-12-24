const mongoose = require('mongoose');

const AppointmentSchema = new mongoose.Schema(
  {
    listingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Listing', required: true },
    landlordId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    slotId: { type: mongoose.Schema.Types.ObjectId, ref: 'AvailabilitySlot', required: true },
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    status: {
      type: String,
      enum: ['REQUESTED', 'ACCEPTED', 'REJECTED', 'CANCELLED'],
      default: 'REQUESTED',
    },
    rescheduleCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

AppointmentSchema.index({ landlordId: 1, startTime: 1 });
AppointmentSchema.index({ tenantId: 1, startTime: 1 });
AppointmentSchema.index(
  { slotId: 1 },
  {
    unique: true,
    partialFilterExpression: { status: { $in: ['REQUESTED', 'ACCEPTED'] } },
  }
);

module.exports = mongoose.model('Appointment', AppointmentSchema);
