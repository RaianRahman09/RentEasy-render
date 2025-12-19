const mongoose = require('mongoose');

const SavedFilterSchema = new mongoose.Schema(
  {
    tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true },
    title: String,
    location: String,
    minRent: Number,
    maxRent: Number,
    roomType: String,
    amenities: [{ type: String }],
    status: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model('SavedFilter', SavedFilterSchema);
