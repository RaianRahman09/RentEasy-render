const Listing = require('../models/Listing');
const cloudinary = require('../utils/cloudinary');
const { notifyTenantsForListing } = require('../services/notificationService');

const toArray = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.filter(Boolean);
    } catch (e) {
      // ignore JSON parse errors and fallback
    }
    return value
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean);
  }
  return [];
};

const buildFilters = (body = {}) => {
  const { location, minRent, maxRent, roomType, amenities, status, title } = body;
  const filter = {};
  if (status) filter.status = status;
  if (title) filter.title = { $regex: title, $options: 'i' };
  if (roomType) filter.roomType = roomType;
  const amenityList = toArray(amenities);
  if (amenityList.length) filter.amenities = { $all: amenityList };
  if (location) filter.address = { $regex: location, $options: 'i' };
  if (minRent || maxRent) {
    filter.rent = {};
    if (minRent) filter.rent.$gte = Number(minRent);
    if (maxRent) filter.rent.$lte = Number(maxRent);
  }
  return filter;
};

exports.getFeaturedListings = async (_req, res) => {
  try {
    const listings = await Listing.find({ status: 'active' }).sort({ createdAt: -1 }).limit(6);
    return res.json({ listings });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Failed to load listings' });
  }
};

exports.searchListings = async (req, res) => {
  try {
    const filter = buildFilters(req.body);
    const listings = await Listing.find(filter).populate('owner', 'name verificationStatus');
    const mapped = listings.map((l) => ({
      ...l.toObject(),
      explanation: `Matches ${req.body.location ? 'location,' : ''} within your budget.`,
    }));
    return res.json({ listings: mapped });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Search failed' });
  }
};

exports.getListingById = async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id).populate('owner', 'name verificationStatus');
    if (!listing) return res.status(404).json({ message: 'Listing not found' });
    return res.json({ listing });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Failed to load listing' });
  }
};

exports.getMyListings = async (req, res) => {
  try {
    const filter = buildFilters(req.query);
    filter.owner = req.user.id;
    const listings = await Listing.find(filter).sort({ updatedAt: -1 });
    return res.json({ listings });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Failed to fetch listings' });
  }
};

exports.createListing = async (req, res) => {
  try {
    const { title, description, rent, address, roomType, beds, baths, status = 'active' } = req.body;
    const amenities = toArray(req.body.amenities);
    const existingPhotos = toArray(req.body.existingPhotos);

    const uploadedPhotos = [];
    if (req.files?.length) {
      for (const file of req.files) {
        const result = await cloudinary.uploader.upload(file.path, {
          folder: 'rentapp/listings',
        });
        uploadedPhotos.push(result.secure_url);
      }
    }

    const photos = [...existingPhotos, ...uploadedPhotos];
    if (photos.length > 5) {
      return res.status(400).json({ message: 'You can upload up to 5 photos.' });
    }

    const listing = await Listing.create({
      owner: req.user.id,
      title,
      description,
      rent: Number(rent),
      address,
      roomType,
      beds: Number(beds),
      baths: Number(baths),
      amenities,
      photos,
      status,
    });
    try {
      await notifyTenantsForListing(listing);
    } catch (notifyErr) {
      console.error('Failed to notify tenants for new listing', notifyErr);
    }
    return res.status(201).json({ listing });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Failed to create listing', error: err.message });
  }
};

exports.updateListing = async (req, res) => {
  try {
    const listing = await Listing.findOne({ _id: req.params.id, owner: req.user.id });
    if (!listing) return res.status(404).json({ message: 'Listing not found' });

    const { title, description, rent, address, roomType, beds, baths, status } = req.body;
    const amenities = toArray(req.body.amenities);
    const existingPhotos = toArray(req.body.existingPhotos);
    const uploadedPhotos = [];
    if (req.files?.length) {
      for (const file of req.files) {
        const result = await cloudinary.uploader.upload(file.path, {
          folder: 'rentapp/listings',
        });
        uploadedPhotos.push(result.secure_url);
      }
    }
    const photos = [...existingPhotos, ...uploadedPhotos];
    if (photos.length > 5) {
      return res.status(400).json({ message: 'You can upload up to 5 photos.' });
    }

    if (title) listing.title = title;
    if (typeof description !== 'undefined') listing.description = description;
    if (rent) listing.rent = Number(rent);
    if (address) listing.address = address;
    if (roomType) listing.roomType = roomType;
    if (beds) listing.beds = Number(beds);
    if (baths) listing.baths = Number(baths);
    if (status) listing.status = status;
    listing.amenities = amenities.length ? amenities : [];
    listing.photos = photos;

    await listing.save();
    return res.json({ listing });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Failed to update listing', error: err.message });
  }
};
