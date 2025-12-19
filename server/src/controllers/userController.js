const User = require('../models/User');
const { sanitizeUser } = require('./authController');
const cloudinary = require('../utils/cloudinary');

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
