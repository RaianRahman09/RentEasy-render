const mongoose = require('mongoose');

const ListingSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    description: { type: String, default: '' },
    rent: { type: Number, required: true },
    serviceCharge: { type: Number, default: 0, min: 0 },
    rentStartMonth: {
      type: String,
      required: true,
      match: [/^\d{4}-(0[1-9]|1[0-2])$/, 'Rent start month must be in YYYY-MM format'],
    },
    address: { type: mongoose.Schema.Types.Mixed, required: true },
    legacyAddress: { type: String },
    location: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: {
        type: [Number],
        required: true,
        validate: {
          validator: (val) =>
            Array.isArray(val) &&
            val.length === 2 &&
            Number.isFinite(val[0]) &&
            Number.isFinite(val[1]) &&
            val[0] >= -180 &&
            val[0] <= 180 &&
            val[1] >= -90 &&
            val[1] <= 90,
          message: 'Coordinates must be [lng, lat] with valid ranges',
        },
      },
    },
    roomType: { type: String, default: 'Entire Place' },
    beds: { type: Number, default: 1 },
    baths: { type: Number, default: 1 },
    amenities: [{ type: String }],
    photos: [{ type: String }],
    status: { type: String, enum: ['active', 'archived'], default: 'active' },
    featured: { type: Boolean, default: false },
  },
  { timestamps: true }
);

ListingSchema.index({ location: '2dsphere' });
ListingSchema.index({ rentStartMonth: 1 });

module.exports = mongoose.model('Listing', ListingSchema);
