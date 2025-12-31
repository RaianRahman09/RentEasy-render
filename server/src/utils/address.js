const trimValue = (value) => (typeof value === 'string' ? value.trim() : '');

const buildFormattedAddress = ({ line1, city, country } = {}) => {
  const parts = [trimValue(line1), trimValue(city), trimValue(country)].filter(Boolean);
  return parts.join(', ');
};

const normalizeAddress = (address = {}) => {
  const normalized = {
    country: trimValue(address.country),
    city: trimValue(address.city),
    line1: trimValue(address.line1),
    formatted: trimValue(address.formatted),
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
  normalizeAddress,
  formatAddressValue,
  formatListingAddress,
};
