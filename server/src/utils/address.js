const trimValue = (value) => (typeof value === 'string' ? value.trim() : '');

const normalizeSearchText = (value) =>
  trimValue(value)
    .toLowerCase()
    .replace(/['’`]/g, '')
    .replace(/[^a-z0-9\u0980-\u09ff]+/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const normalizeCountryName = (value) => {
  const normalized = normalizeSearchText(value);
  if (!normalized) return '';
  if (normalized === 'bd' || normalized === 'bangla desh') return 'bangladesh';
  return normalized;
};

const buildFormattedAddress = ({ line1, city, country } = {}) => {
  const parts = [trimValue(line1), trimValue(city), trimValue(country)].filter(Boolean);
  return parts.join(', ');
};

const normalizeAddress = (address = {}) => {
  const country = trimValue(address.country);
  const city = trimValue(address.city);
  const line1 = trimValue(address.line1);
  const normalized = {
    country,
    city,
    line1,
    formatted: trimValue(address.formatted),
    countryNormalized: normalizeCountryName(country),
    cityNormalized: normalizeSearchText(city),
  };
  if (!normalized.formatted) {
    normalized.formatted = buildFormattedAddress(normalized);
  }
  return normalized;
};

const formatAddressValue = (address, legacyAddress) => {
  const legacy = typeof legacyAddress === 'string' ? legacyAddress.trim() : '';
  if (typeof address === 'string') return address;
  if (address && typeof address === 'object') {
    const formatted = address.formatted || buildFormattedAddress(address);
    return formatted || legacy || '';
  }
  return legacy || '';
};

const formatListingAddress = (listing = {}) =>
  formatAddressValue(listing.address, listing.legacyAddress);

module.exports = {
  buildFormattedAddress,
  normalizeSearchText,
  normalizeCountryName,
  normalizeAddress,
  formatAddressValue,
  formatListingAddress,
};
