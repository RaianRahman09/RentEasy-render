const {
  BANGLADESH_COUNTRY_CODE,
  BANGLADESH_VIEWBOX,
  clampBoundsToBangladesh,
  isBangladeshNominatimResult,
} = require('./bangladeshGeo');

const toNumber = (value) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
};

const geocodeLocationText = async (locationText, options = {}) => {
  if (!locationText) return null;
  const { limit = 5 } = options;
  const baseUrl = process.env.NOMINATIM_BASE_URL || 'https://nominatim.openstreetmap.org';
  const url = new URL('/search', baseUrl);
  url.searchParams.set('q', String(locationText).trim());
  url.searchParams.set('format', 'json');
  url.searchParams.set('limit', String(Math.max(1, Math.min(Number(limit) || 5, 20))));
  url.searchParams.set('addressdetails', '1');
  url.searchParams.set('countrycodes', BANGLADESH_COUNTRY_CODE);
  url.searchParams.set('viewbox', BANGLADESH_VIEWBOX);
  url.searchParams.set('bounded', '1');
  const email = process.env.NOMINATIM_EMAIL;
  if (email) url.searchParams.set('email', email);

  // Learning-only: free geocoding via OpenStreetMap Nominatim (no paid API keys required).
  const response = await fetch(url.toString(), {
    headers: {
      'User-Agent': 'RentEasy (learning project)',
      Accept: 'application/json',
    },
  });
  if (!response.ok) {
    throw new Error(`Geocoding failed with status ${response.status}`);
  }
  const data = await response.json();
  if (!Array.isArray(data) || !data.length) return null;
  const result = data.find((item) => isBangladeshNominatimResult(item));
  if (!result) return null;
  const lat = toNumber(result.lat);
  const lng = toNumber(result.lon);
  if (lat === null || lng === null) return null;
  let bounds = null;
  if (Array.isArray(result.boundingbox) && result.boundingbox.length === 4) {
    const [south, north, west, east] = result.boundingbox.map((val) => toNumber(val));
    if ([south, north, west, east].every((val) => val !== null)) {
      bounds = {
        sw: { lat: south, lng: west },
        ne: { lat: north, lng: east },
      };
    }
  }
  bounds = clampBoundsToBangladesh(bounds);
  return {
    lat,
    lng,
    bounds,
    formattedAddress: result.display_name || '',
  };
};

module.exports = { geocodeLocationText };
