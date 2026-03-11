const { normalizeAddress } = require('../utils/address');
const { BANGLADESH_COUNTRY_NAME, isBangladeshCountry } = require('../utils/bangladeshGeo');
const { geocodeLocationText } = require('../utils/geocode');

exports.geocodeAddress = async (req, res) => {
  try {
    const normalized = normalizeAddress(req.body || {});
    if (!normalized.country || !normalized.city || !normalized.line1) {
      return res.status(400).json({ message: 'Country, city/area, and street are required.' });
    }
    if (!isBangladeshCountry(normalized.country)) {
      return res.status(400).json({ message: 'Only Bangladesh locations are supported.' });
    }
    const fullAddress = [normalized.line1, normalized.city, BANGLADESH_COUNTRY_NAME].filter(Boolean).join(', ');
    const geo = await geocodeLocationText(fullAddress, { limit: 8 });
    if (!geo) {
      return res
        .status(404)
        .json({ message: "No Bangladesh match found. Refine your city/area and street inside Bangladesh." });
    }
    return res.json({
      lat: geo.lat,
      lng: geo.lng,
      formattedAddress: geo.formattedAddress || fullAddress,
    });
  } catch (err) {
    console.error('Geocode failed', err);
    return res.status(500).json({ message: 'Failed to geocode address.' });
  }
};
