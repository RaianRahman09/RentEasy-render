const mongoose = require('mongoose');

const ListingSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    description: { type: String, default: '' },
    rent: { type: Number, required: true },
    address: { type: String, required: true },
    coordinates: {
      type: { type: String, enum: ['Point'] },
      coordinates: {
        type: [Number],
        validate: {
          validator: (val) => !val || (Array.isArray(val) && val.length === 2),
          message: 'Coordinates must be [lng, lat]',
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

ListingSchema.index({ coordinates: '2dsphere' });

module.exports = mongoose.model('Listing', ListingSchema);
