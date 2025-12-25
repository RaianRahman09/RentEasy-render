const mongoose = require('mongoose');
const { MONTH_REGEX } = require('../utils/months');

const PaymentSchema = new mongoose.Schema(
  {
    rentalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Rental', required: true },
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    landlordId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    listingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Listing', required: true },
    monthsPaid: [{ type: String, match: MONTH_REGEX }],
    rentSubtotal: { type: Number, required: true },
    serviceCharge: { type: Number, required: true },
    tax: { type: Number, required: true },
    platformFee: { type: Number, required: true },
    penaltyAmount: { type: Number, default: 0 },
    total: { type: Number, required: true },
    currency: { type: String, default: 'bdt' },
    status: {
      type: String,
      enum: ['succeeded', 'failed', 'processing'],
      default: 'processing',
    },
    stripePaymentIntentId: { type: String },
    stripeChargeId: { type: String },
    receiptUrl: { type: String },
    receiptPdfUrl: { type: String },
    receiptPdfPath: { type: String },
    paidAt: { type: Date },
    failureReason: { type: String },
    moveOutMonth: { type: String, match: MONTH_REGEX },
  },
  { timestamps: true }
);

PaymentSchema.index({ rentalId: 1, status: 1 });
PaymentSchema.index({ tenantId: 1, createdAt: -1 });
PaymentSchema.index({ landlordId: 1, createdAt: -1 });
PaymentSchema.index({ stripePaymentIntentId: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('Payment', PaymentSchema);
