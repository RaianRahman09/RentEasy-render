const buildFormattedAddress = ({ line1, city, country } = {}) => {
  const parts = [line1, city, country]
    .map((value) => (typeof value === 'string' ? value.trim() : ''))
    .filter(Boolean);
  return parts.join(', ');
};

export const formatAddress = (address, legacyAddress) => {
  const legacy = typeof legacyAddress === 'string' ? legacyAddress.trim() : '';
  if (typeof address === 'string') return address;
  if (address && typeof address === 'object') {
    const formatted = address.formatted || buildFormattedAddress(address);
    return formatted || legacy || '';
  }
  return legacy || '';
};

export const formatListingAddress = (listing) =>
  formatAddress(listing?.address, listing?.legacyAddress);
