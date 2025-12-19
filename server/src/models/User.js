const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const VerificationDocsSchema = new mongoose.Schema({
  frontUrl: String,
  backUrl: String,
});

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true, select: false },
    googleId: { type: String, unique: true, sparse: true, select: false },
    role: { type: String, enum: ['tenant', 'landlord', 'admin'], required: true },
    phone: String,
    avatarUrl: String,
    verificationStatus: {
      type: String,
      enum: ['unverified', 'pending', 'verified', 'rejected'],
      default: 'unverified',
    },
    verificationNote: String,
    verificationDocs: VerificationDocsSchema,
    refreshToken: { type: String, select: false },
  },
  { timestamps: true }
);

UserSchema.pre('save', async function preSave() {
  if (!this.isModified('password')) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

UserSchema.methods.comparePassword = function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.password);
};

module.exports = mongoose.model('User', UserSchema);
