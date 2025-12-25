const jwt = require('jsonwebtoken');

const resolveHeaderToken = (req) => {
  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) {
    return header.split(' ')[1];
  }
  return null;
};

const resolveReceiptToken = (req) => {
  return resolveHeaderToken(req) || (req.query?.token ? String(req.query.token) : null);
};

const auth = (req, res, next) => {
  const token = resolveHeaderToken(req);
  if (!token) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: decoded.id, role: decoded.role };
    next();
  } catch (err) {
    console.error(err);
    return res.status(401).json({ message: 'Token invalid or expired' });
  }
};

const authReceipt = (req, res, next) => {
  const token = resolveReceiptToken(req);
  if (!token) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: decoded.id, role: decoded.role };
    next();
  } catch (err) {
    console.error(err);
    return res.status(401).json({ message: 'Token invalid or expired' });
  }
};

const requireRole = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ message: 'Forbidden' });
  }
  next();
};

module.exports = { auth, authReceipt, requireRole };
