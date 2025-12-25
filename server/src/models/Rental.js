const mongoose = require('mongoose');
const { MONTH_REGEX } = require('../utils/months');

const RentalSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    landlordId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    listingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Listing', required: true },
    startMonth: { type: String, required: true, match: MONTH_REGEX },
    status: { type: String, enum: ['active', 'ended'], default: 'active' },
    moveOutNoticeMonth: { type: String, match: MONTH_REGEX },
    moveOutNoticeGivenAt: { type: Date },
    endMonth: { type: String, match: MONTH_REGEX },
    endedAt: { type: Date },
  },
  { timestamps: true }
);

RentalSchema.index(
  { tenantId: 1, listingId: 1, status: 1 },
  { unique: true, partialFilterExpression: { status: 'active' } }
);
RentalSchema.index({ tenantId: 1, status: 1 });
RentalSchema.index({ listingId: 1, status: 1 });

module.exports = mongoose.model('Rental', RentalSchema);
