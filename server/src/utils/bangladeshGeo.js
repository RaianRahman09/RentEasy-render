const BANGLADESH_COUNTRY_NAME = 'Bangladesh';
const BANGLADESH_COUNTRY_CODE = 'bd';
const BANGLADESH_CENTER = Object.freeze({ lat: 23.685, lng: 90.3563 });
const BANGLADESH_BOUNDS = Object.freeze({
  sw: Object.freeze({ lat: 20.670883, lng: 88.084422 }),
  ne: Object.freeze({ lat: 26.638, lng: 92.680115 }),
});

const normalizeText = (value) =>
  (typeof value === 'string' ? value : String(value || ''))
    .trim()
    .toLowerCase()
    .replace(/\./g, '')
    .replace(/\s+/g, ' ');

const isBangladeshCountry = (value) => {
  const normalized = normalizeText(value);
  return normalized === 'bangladesh' || normalized === 'bangla desh' || normalized === 'bd';
};

const isBangladeshCoordinates = (lat, lng) =>
  Number.isFinite(lat) &&
  Number.isFinite(lng) &&
  lat >= BANGLADESH_BOUNDS.sw.lat &&
  lat <= BANGLADESH_BOUNDS.ne.lat &&
  lng >= BANGLADESH_BOUNDS.sw.lng &&
  lng <= BANGLADESH_BOUNDS.ne.lng;

const clampToRange = (value, min, max) => Math.min(Math.max(value, min), max);

const clampCoordinatesToBangladesh = ({ lat, lng }) => ({
  lat: clampToRange(lat, BANGLADESH_BOUNDS.sw.lat, BANGLADESH_BOUNDS.ne.lat),
  lng: clampToRange(lng, BANGLADESH_BOUNDS.sw.lng, BANGLADESH_BOUNDS.ne.lng),
});

const clampBoundsToBangladesh = (bounds) => {
  if (!bounds?.ne || !bounds?.sw) return null;
  const ne = clampCoordinatesToBangladesh(bounds.ne);
  const sw = clampCoordinatesToBangladesh(bounds.sw);
  const normalizedNe = {
    lat: Math.max(ne.lat, sw.lat),
    lng: Math.max(ne.lng, sw.lng),
  };
  const normalizedSw = {
    lat: Math.min(sw.lat, ne.lat),
    lng: Math.min(sw.lng, ne.lng),
  };
  return { ne: normalizedNe, sw: normalizedSw };
};

const BANGLADESH_VIEWBOX = [
  BANGLADESH_BOUNDS.sw.lng,
  BANGLADESH_BOUNDS.ne.lat,
  BANGLADESH_BOUNDS.ne.lng,
  BANGLADESH_BOUNDS.sw.lat,
].join(',');

const isBangladeshNominatimResult = (result = {}) => {
  const countryCode = normalizeText(result?.address?.country_code || result?.country_code);
  const countryName = result?.address?.country || result?.country;
  const lat = Number(result.lat);
  const lng = Number(result.lon);
  if (countryCode && countryCode !== BANGLADESH_COUNTRY_CODE) return false;
  if (countryName && !isBangladeshCountry(countryName) && countryCode !== BANGLADESH_COUNTRY_CODE) {
    return false;
  }
  return isBangladeshCoordinates(lat, lng);
};

module.exports = {
  BANGLADESH_COUNTRY_NAME,
  BANGLADESH_COUNTRY_CODE,
  BANGLADESH_CENTER,
  BANGLADESH_BOUNDS,
  BANGLADESH_VIEWBOX,
  isBangladeshCountry,
  isBangladeshCoordinates,
  clampCoordinatesToBangladesh,
  clampBoundsToBangladesh,
  isBangladeshNominatimResult,
};
