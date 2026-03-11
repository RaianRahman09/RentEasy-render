const mongoose = require('mongoose');

const PropertyReviewSchema = new mongoose.Schema(
  {
    listingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Listing', required: true },
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    rentalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Rental', required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    reviewText: { type: String, trim: true, default: '', maxlength: 2000 },
    wouldRecommend: { type: Boolean, default: undefined },
  },
  { timestamps: true }
);

PropertyReviewSchema.index({ listingId: 1, createdAt: -1 });
PropertyReviewSchema.index({ listingId: 1, rating: -1 });
PropertyReviewSchema.index({ listingId: 1, tenantId: 1 }, { unique: true });
PropertyReviewSchema.index({ rentalId: 1 }, { unique: true });

module.exports = mongoose.model('PropertyReview', PropertyReviewSchema);
