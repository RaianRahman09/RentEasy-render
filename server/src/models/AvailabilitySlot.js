const mongoose = require('mongoose');

const AvailabilitySlotSchema = new mongoose.Schema(
  {
    listingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Listing', required: true, index: true },
    landlordId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    date: { type: String, required: true, index: true },
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    isBooked: { type: Boolean, default: false },
  },
  { timestamps: true }
);

AvailabilitySlotSchema.index({ listingId: 1, date: 1, startTime: 1 });
AvailabilitySlotSchema.index({ landlordId: 1, date: 1 });

module.exports = mongoose.model('AvailabilitySlot', AvailabilitySlotSchema);
