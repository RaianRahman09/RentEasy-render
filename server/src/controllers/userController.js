const User = require('../models/User');
const Listing = require('../models/Listing');
const Rental = require('../models/Rental');
const { sanitizeUser } = require('./authController');
const cloudinary = require('../utils/cloudinary');
const { destroyCloudinaryAssets } = require('../utils/cloudinaryAssets');

const resolveListingImages = (listing) => {
  if (Array.isArray(listing.images) && listing.images.length) return listing.images;
  if (Array.isArray(listing.imageUrls) && listing.imageUrls.length) return listing.imageUrls;
  if (Array.isArray(listing.photos) && listing.photos.length) return listing.photos;
  return [];
};

exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    return res.json({ user: sanitizeUser(user) });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Failed to load profile' });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (typeof req.body.name !== 'undefined') user.name = req.body.name;
    if (typeof req.body.phone !== 'undefined') user.phone = req.body.phone;
    if (req.body.avatarUrl) user.avatarUrl = req.body.avatarUrl;

    if (req.file) {
      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: 'rentapp/avatars',
        transformation: [{ width: 400, height: 400, crop: 'limit' }],
      });
      user.avatarUrl = result.secure_url;
    }

    await user.save();
    return res.json({ user: sanitizeUser(user) });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Failed to update profile' });
  }
};

exports.getVerificationStatus = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    return res.json({
      status: user.verificationStatus,
      note: user.verificationNote,
      docs: user.verificationDocs,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Failed to fetch status' });
  }
};

exports.deleteMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (user.role === 'landlord') {
      const listings = await Listing.find({ owner: user._id }).select('photos images imageUrls');
      const listingIds = listings.map((listing) => listing._id);
      if (listingIds.length) {
        const activeRental = await Rental.findOne({
          listingId: { $in: listingIds },
          status: 'active',
        }).select('_id');
        if (activeRental) {
          return res
            .status(400)
            .json({ message: 'Profile can not be deleted while you have rented properties' });
        }
      }

      const allImages = listings.flatMap((listing) => resolveListingImages(listing));
      if (allImages.length) {
        await destroyCloudinaryAssets(allImages);
      }
      if (listingIds.length) {
        await Listing.deleteMany({ _id: { $in: listingIds } });
      }
    }

    if (user.role === 'tenant') {
      const activeRental = await Rental.findOne({ tenantId: user._id, status: 'active' }).select('_id');
      if (activeRental) {
        return res
          .status(400)
          .json({ message: 'Profile can not be deleted while you are renting a property' });
      }
    }

    await User.findByIdAndDelete(user._id);
    res.clearCookie('refreshToken');
    return res.json({ message: 'Profile deleted' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Failed to delete profile' });
  }
};
