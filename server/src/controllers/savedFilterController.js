const SavedFilter = require('../models/SavedFilter');

const toArray = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean);
  }
  return [];
};

const parseNumber = (value) => {
  if (value === null) return null;
  if (value === undefined || value === '') return undefined;
  const num = Number(value);
  return Number.isNaN(num) ? undefined : num;
};

const cleanPayload = (body = {}) => {
  const amenities = toArray(body.amenities);
  return {
    name: body.name?.trim(),
    title: body.title?.trim(),
    location: body.location?.trim(),
    minRent: parseNumber(body.minRent),
    maxRent: parseNumber(body.maxRent),
    roomType: body.roomType?.trim(),
    status: body.status?.trim(),
    amenities,
  };
};

const deriveName = (body) => {
  if (body.name) return body.name;
  const parts = [body.title, body.location, body.roomType, body.maxRent && `<= $${body.maxRent}`].filter(Boolean);
  return parts.join(' • ') || 'My Saved Filter';
};

exports.createSavedFilter = async (req, res) => {
  try {
    const payload = cleanPayload(req.body);
    payload.name = deriveName(payload);
    payload.tenant = req.user.id;

    const filter = await SavedFilter.create(payload);
    return res.status(201).json({ filter });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Failed to save filter' });
  }
};

exports.getSavedFilters = async (req, res) => {
  try {
    const filters = await SavedFilter.find({ tenant: req.user.id }).sort({ updatedAt: -1 });
    return res.json({ filters });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Failed to load filters' });
  }
};

exports.updateSavedFilter = async (req, res) => {
  try {
    const filter = await SavedFilter.findOne({ _id: req.params.id, tenant: req.user.id });
    if (!filter) return res.status(404).json({ message: 'Filter not found' });

    const payload = cleanPayload(req.body);
    if (payload.name !== undefined) filter.name = payload.name || deriveName({ ...payload, name: filter.name });
    if (typeof payload.title !== 'undefined') filter.title = payload.title || undefined;
    if (typeof payload.location !== 'undefined') filter.location = payload.location || undefined;
    if (typeof payload.minRent !== 'undefined')
      filter.minRent = payload.minRent === null ? undefined : payload.minRent;
    if (typeof payload.maxRent !== 'undefined')
      filter.maxRent = payload.maxRent === null ? undefined : payload.maxRent;
    if (typeof payload.roomType !== 'undefined') filter.roomType = payload.roomType || undefined;
    if (typeof payload.status !== 'undefined') filter.status = payload.status || undefined;
    if (payload.amenities) filter.amenities = payload.amenities;

    await filter.save();
    return res.json({ filter });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Failed to update filter' });
  }
};

exports.deleteSavedFilter = async (req, res) => {
  try {
    const result = await SavedFilter.findOneAndDelete({ _id: req.params.id, tenant: req.user.id });
    if (!result) return res.status(404).json({ message: 'Filter not found' });
    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Failed to delete filter' });
  }
};
