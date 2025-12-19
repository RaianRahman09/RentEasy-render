const cloudinary = require('../utils/cloudinary');
const User = require('../models/User');

exports.uploadVerification = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const uploads = {};
    if (req.files?.front?.[0]) {
      const result = await cloudinary.uploader.upload(req.files.front[0].path, {
        folder: 'rentapp/ids',
      });
      uploads.frontUrl = result.secure_url;
    }
    if (req.files?.back?.[0]) {
      const result = await cloudinary.uploader.upload(req.files.back[0].path, {
        folder: 'rentapp/ids',
      });
      uploads.backUrl = result.secure_url;
    }

    if (!uploads.frontUrl && !uploads.backUrl && !req.body.frontUrl && !req.body.backUrl) {
      return res.status(400).json({ message: 'No files uploaded' });
    }

    const verificationDocs = {
      frontUrl: uploads.frontUrl || req.body.frontUrl,
      backUrl: uploads.backUrl || req.body.backUrl,
    };

    user.verificationDocs = verificationDocs;
    user.verificationStatus = 'pending';
    user.verificationNote = undefined;
    await user.save();

    return res.json({
      message: 'Documents uploaded, awaiting review',
      status: user.verificationStatus,
      docs: user.verificationDocs,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Upload failed', error: err.message });
  }
};

exports.getPendingVerifications = async (_req, res) => {
  try {
    const pending = await User.find({ verificationStatus: 'pending' }).sort({ updatedAt: -1 });
    const requests = pending.map((u) => ({
      id: u._id,
      name: u.name,
      email: u.email,
      phone: u.phone,
      role: u.role,
      status: u.verificationStatus,
      note: u.verificationNote,
      docs: u.verificationDocs,
      submittedAt: u.updatedAt,
    }));
    return res.json({ requests });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Failed to load pending verifications' });
  }
};

exports.getVerificationDetails = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    return res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        status: user.verificationStatus,
        note: user.verificationNote,
        docs: user.verificationDocs,
        submittedAt: user.updatedAt,
        createdAt: user.createdAt,
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Failed to load verification details' });
  }
};

exports.approveVerification = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });
    user.verificationStatus = 'verified';
    user.verificationNote = req.body?.note;
    await user.save();
    return res.json({
      message: 'Verification approved',
      status: user.verificationStatus,
      note: user.verificationNote,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Failed to approve verification' });
  }
};

exports.rejectVerification = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });
    user.verificationStatus = 'rejected';
    user.verificationNote = req.body?.note || 'Rejected by admin';
    await user.save();
    return res.json({
      message: 'Verification rejected',
      status: user.verificationStatus,
      note: user.verificationNote,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Failed to reject verification' });
  }
};
