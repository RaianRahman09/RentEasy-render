const { normalizeAddress } = require('../utils/address');
const { geocodeLocationText } = require('../utils/geocode');

exports.geocodeAddress = async (req, res) => {
  try {
    const normalized = normalizeAddress(req.body || {});
    if (!normalized.country || !normalized.city || !normalized.line1) {
      return res.status(400).json({ message: 'Country, city/area, and street are required.' });
    }
    const fullAddress = normalized.formatted;
    const geo = await geocodeLocationText(fullAddress);
    if (!geo) {
      return res.status(404).json({ message: "Couldn't find this address. Refine your street/city." });
    }
    return res.json({
      lat: geo.lat,
      lng: geo.lng,
      formattedAddress: fullAddress,
    });
  } catch (err) {
    console.error('Geocode failed', err);
    return res.status(500).json({ message: 'Failed to geocode address.' });
  }
};
