const jwt = require('jsonwebtoken');
const User = require('../models/User');

const ACCESS_EXPIRY = '30m';
const REFRESH_EXPIRY = '7d';

const signTokens = (user) => {
  const payload = { id: user._id, role: user.role };
  const accessToken = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: ACCESS_EXPIRY });
  const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET, { expiresIn: REFRESH_EXPIRY });
  return { accessToken, refreshToken };
};

const attachRefreshCookie = (res, token) => {
  res.cookie('refreshToken', token, {
    httpOnly: true,
    secure: false,
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
};

const sanitizeUser = (user) => {
  const obj = user.toObject();
  delete obj.password;
  delete obj.refreshToken;
  return obj;
};

exports.signup = async (req, res) => {
  try {
    const { name, email, password, role, phone } = req.body;
    if (!['tenant', 'landlord'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ message: 'Email already in use' });

    const user = await User.create({ name, email, password, role, phone });
    const tokens = signTokens(user);
    user.refreshToken = tokens.refreshToken;
    await user.save();
    attachRefreshCookie(res, tokens.refreshToken);
    return res.status(201).json({ user: sanitizeUser(user), accessToken: tokens.accessToken });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Signup failed', error: err.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email }).select('+password +refreshToken');
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });
    const isMatch = await user.comparePassword(password);
    if (!isMatch) return res.status(401).json({ message: 'Invalid credentials' });

    const tokens = signTokens(user);
    user.refreshToken = tokens.refreshToken;
    await user.save();
    attachRefreshCookie(res, tokens.refreshToken);
    return res.json({ user: sanitizeUser(user), accessToken: tokens.accessToken });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Login failed', error: err.message });
  }
};

exports.refresh = async (req, res) => {
  const refreshToken = req.cookies.refreshToken || req.body.refreshToken;
  if (!refreshToken) return res.status(401).json({ message: 'Missing refresh token' });
  try {
    const payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(payload.id).select('+refreshToken');
    if (!user || user.refreshToken !== refreshToken) {
      return res.status(401).json({ message: 'Invalid refresh token' });
    }
    const tokens = signTokens(user);
    user.refreshToken = tokens.refreshToken;
    await user.save();
    attachRefreshCookie(res, tokens.refreshToken);
    return res.json({ user: sanitizeUser(user), accessToken: tokens.accessToken });
  } catch (err) {
    console.error(err);
    return res.status(401).json({ message: 'Invalid refresh token' });
  }
};

exports.logout = async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;
    if (refreshToken) {
      const payload = jwt.decode(refreshToken);
      if (payload?.id) {
        await User.findByIdAndUpdate(payload.id, { refreshToken: null });
      }
    }
    res.clearCookie('refreshToken');
    return res.json({ message: 'Logged out' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Logout failed' });
  }
};

exports.sanitizeUser = sanitizeUser;
