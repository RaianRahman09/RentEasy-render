const Listing = require('../models/Listing');
const Rental = require('../models/Rental');
const cloudinary = require('../utils/cloudinary');
const { destroyCloudinaryAssets } = require('../utils/cloudinaryAssets');
const { notifyTenantsForListing } = require('../services/notificationService');
const { normalizeAddress, normalizeSearchText } = require('../utils/address');
const { geocodeLocationText } = require('../utils/geocode');
const {
  BANGLADESH_COUNTRY_NAME,
  BANGLADESH_CENTER,
  clampBoundsToBangladesh,
  isBangladeshCountry,
  isBangladeshCoordinates,
} = require('../utils/bangladeshGeo');

const RENT_START_MONTH_REGEX = /^\d{4}-(0[1-9]|1[0-2])$/;

const toArray = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.filter(Boolean);
    } catch (e) {
      // ignore JSON parse errors and fallback
    }
    return value
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean);
  }
  return [];
};

const resolveListingImages = (listing = {}) => {
  if (Array.isArray(listing.images) && listing.images.length) return listing.images;
  if (Array.isArray(listing.imageUrls) && listing.imageUrls.length) return listing.imageUrls;
  if (Array.isArray(listing.photos) && listing.photos.length) return listing.photos;
  return [];
};

const DEFAULT_SEARCH_RADIUS_KM = 8;
const DEFAULT_MAP_CENTER = BANGLADESH_CENTER;
const HIGHEST_RATED_SORT = 'highest_rated';
const BANGLADESH_COUNTRY_REGEX = /^\s*bangladesh\s*$/i;

const toNumber = (value) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
};

const hasValue = (value) => value !== null && value !== undefined && value !== '';

const applyRentStartMonthFilter = (filter, rentStartMonth) => {
  if (!rentStartMonth) return null;
  const normalizedRentStartMonth = String(rentStartMonth).trim();
  if (!RENT_START_MONTH_REGEX.test(normalizedRentStartMonth)) {
    return 'Rent start month must be in YYYY-MM format.';
  }
  filter.rentStartMonth = { $lte: normalizedRentStartMonth };
  return null;
};

const parseMinRating = (value) => {
  if (!hasValue(value)) return { value: null, error: null };
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1 || parsed > 5) {
    return { value: null, error: 'Minimum rating must be between 1 and 5.' };
  }
  return { value: parsed, error: null };
};

const applyMinRatingFilter = (filter, minRating) => {
  if (!Number.isFinite(minRating)) return;
  filter.ratingAverage = { $gte: minRating };
};

const resolveListingSort = (sortBy) => {
  if (sortBy === HIGHEST_RATED_SORT) {
    return { ratingAverage: -1, ratingCount: -1, createdAt: -1 };
  }
  return { createdAt: -1 };
};

const escapeRegex = (value) => String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const buildLooseRegex = (value) => ({
  $regex: escapeRegex(value).replace(/\s+/g, '\\s+'),
  $options: 'i',
});

const buildBangladeshCountryClause = () => ({
  $or: [{ 'address.countryNormalized': 'bangladesh' }, { 'address.country': BANGLADESH_COUNTRY_REGEX }],
});

const buildAreaLocationClause = (locationQuery) => {
  const original = String(locationQuery || '').trim();
  const normalized = normalizeSearchText(original);
  const clauses = [];
  if (normalized) {
    clauses.push({ 'address.cityNormalized': buildLooseRegex(normalized) });
  }
  if (original) {
    clauses.push({ 'address.city': buildLooseRegex(original) });
  }
  if (!clauses.length) return null;
  return clauses.length === 1 ? clauses[0] : { $or: clauses };
};

const buildFilters = (body = {}, options = {}) => {
  const { bangladeshOnly = false } = options;
  const {
    location,
    minRent,
    maxRent,
    maxBudget,
    roomType,
    amenities,
    status,
    title,
    rentStartMonth,
  } = body;
  const filter = {};
  const andClauses = [];
  if (status) filter.status = status;
  if (title) filter.title = { $regex: title, $options: 'i' };
  if (roomType) filter.roomType = roomType;
  const amenityList = toArray(amenities);
  if (amenityList.length) filter.amenities = { $all: amenityList };
  const areaClause = buildAreaLocationClause(location);
  if (areaClause) andClauses.push(areaClause);
  if (bangladeshOnly) andClauses.push(buildBangladeshCountryClause());
  const resolvedMaxRent = hasValue(maxRent) ? maxRent : maxBudget;
  if (hasValue(minRent) || hasValue(resolvedMaxRent)) {
    filter.rent = {};
    if (hasValue(minRent)) filter.rent.$gte = Number(minRent);
    if (hasValue(resolvedMaxRent)) filter.rent.$lte = Number(resolvedMaxRent);
  }
  if (rentStartMonth) filter.rentStartMonth = { $lte: rentStartMonth };
  if (andClauses.length) filter.$and = andClauses;
  return filter;
};

const parseAddressPayload = (body = {}) => {
  const rawAddress = body.address;
  let parsed = null;
  if (rawAddress && typeof rawAddress === 'object' && !Array.isArray(rawAddress)) {
    parsed = rawAddress;
  } else if (typeof rawAddress === 'string') {
    try {
      const candidate = JSON.parse(rawAddress);
      if (candidate && typeof candidate === 'object' && !Array.isArray(candidate)) {
        parsed = candidate;
      }
    } catch (err) {
      parsed = null;
    }
  }
  if (!parsed) {
    const { addressCountry, addressCity, addressLine1, addressFormatted } = body;
    if (addressCountry || addressCity || addressLine1 || addressFormatted) {
      parsed = {
        country: addressCountry,
        city: addressCity,
        line1: addressLine1,
        formatted: addressFormatted,
      };
    }
  }
  const legacyAddress =
    typeof rawAddress === 'string' && !parsed ? rawAddress.trim() : body.legacyAddress?.trim();
  return { address: parsed, legacyAddress };
};

const parseCoordinates = (payload = {}) => {
  const lat = toNumber(payload.lat ?? payload.latitude);
  const lng = toNumber(payload.lng ?? payload.longitude);
  if (lat === null || lng === null) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return [lng, lat];
};

const hashSeed = (value) => {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
};

const seededRandom = (seed) => {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
};

const metersToDegreesLat = (meters) => meters / 111320;

const metersToDegreesLng = (meters, lat) => meters / (111320 * Math.cos((lat * Math.PI) / 180));

// Privacy helper: offset coordinates ~100-300m for public search results.
const obfuscateCoordinates = (coordinates, seedValue) => {
  if (!coordinates || coordinates.length !== 2) return null;
  const [lng, lat] = coordinates;
  const seed = hashSeed(seedValue || `${lng},${lat}`);
  const distance = 100 + seededRandom(seed) * 200;
  const angle = seededRandom(seed + 1) * Math.PI * 2;
  const offsetLat = metersToDegreesLat(distance * Math.cos(angle));
  const offsetLng = metersToDegreesLng(distance * Math.sin(angle), lat);
  return [lng + offsetLng, lat + offsetLat];
};

const centerFromListings = (listings = []) => {
  const coords = listings
    .map((listing) => listing.location?.coordinates)
    .filter(
      (coord) =>
        Array.isArray(coord) &&
        coord.length === 2 &&
        isBangladeshCoordinates(Number(coord[1]), Number(coord[0]))
    );
  if (!coords.length) return DEFAULT_MAP_CENTER;
  const sums = coords.reduce(
    (acc, [lng, lat]) => ({ lng: acc.lng + lng, lat: acc.lat + lat }),
    { lng: 0, lat: 0 }
  );
  return { lng: sums.lng / coords.length, lat: sums.lat / coords.length };
};

const boundsFromCenter = (center, radiusKm = DEFAULT_SEARCH_RADIUS_KM) => {
  const radiusMeters = radiusKm * 1000;
  const latOffset = metersToDegreesLat(radiusMeters);
  const lngOffset = metersToDegreesLng(radiusMeters, center.lat);
  return clampBoundsToBangladesh({
    ne: { lat: center.lat + latOffset, lng: center.lng + lngOffset },
    sw: { lat: center.lat - latOffset, lng: center.lng - lngOffset },
  });
};

const toPublicListing = (listing) => {
  const coords = listing.location?.coordinates;
  const inBangladesh =
    Array.isArray(coords) &&
    coords.length === 2 &&
    isBangladeshCoordinates(Number(coords[1]), Number(coords[0]));
  const obfuscated = inBangladesh ? obfuscateCoordinates(coords, listing._id?.toString() || '') : null;
  const images = resolveListingImages(listing);
  return {
    _id: listing._id,
    title: listing.title,
    address: listing.address,
    rent: listing.rent,
    rentStartMonth: listing.rentStartMonth,
    roomType: listing.roomType,
    beds: listing.beds,
    baths: listing.baths,
    photos: images,
    images,
    status: listing.status,
    ratingAverage: Number(listing.ratingAverage || 0),
    ratingCount: Number(listing.ratingCount || 0),
    recommendCount: Number(listing.recommendCount || 0),
    mapLocation: obfuscated
      ? {
          type: 'Point',
          coordinates: obfuscated,
        }
      : null,
  };
};

exports.getFeaturedListings = async (_req, res) => {
  try {
    const listings = await Listing.find({ status: 'active', $and: [buildBangladeshCountryClause()] })
      .sort({ createdAt: -1 })
      .limit(6)
      .lean();
    return res.json({ listings: listings.map(toPublicListing) });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Failed to load listings' });
  }
};

exports.searchListings = async (req, res) => {
  try {
    if (req.body.rentStartMonth && !RENT_START_MONTH_REGEX.test(req.body.rentStartMonth)) {
      return res.status(400).json({ message: 'Rent start month must be in YYYY-MM format.' });
    }
    const minRating = parseMinRating(req.body.minRating);
    if (minRating.error) {
      return res.status(400).json({ message: minRating.error });
    }
    const filter = buildFilters({ ...req.body, status: req.body.status || 'active' }, { bangladeshOnly: true });
    applyMinRatingFilter(filter, minRating.value);
    const sort = resolveListingSort(req.body.sortBy);
    const listings = await Listing.find(filter)
      .select(
        'title address rent rentStartMonth roomType beds baths photos status location ratingAverage ratingCount recommendCount'
      )
      .sort(sort)
      .lean();
    const mapped = listings.map((l) => ({
      ...toPublicListing(l),
      explanation: `Matches ${req.body.location ? 'location,' : ''} within your budget.`,
    }));
    return res.json({ listings: mapped });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Search failed' });
  }
};

exports.searchListingsByLocation = async (req, res) => {
  try {
    const {
      locationText,
      location,
      minRent,
      maxRent,
      maxBudget,
      roomType,
      title,
      keywords,
      lat,
      lng,
      radiusKm,
      rentStartMonth,
      neLat,
      neLng,
      swLat,
      swLng,
      minRating,
      sortBy,
    } = req.query;

    const filter = {
      status: 'active',
    };
    const andClauses = [buildBangladeshCountryClause()];
    const keywordQuery = keywords || title;
    if (keywordQuery) {
      const regex = { $regex: keywordQuery, $options: 'i' };
      andClauses.push({ $or: [{ title: regex }, { description: regex }] });
    }
    if (roomType) filter.roomType = roomType;
    const resolvedMaxRent = hasValue(maxRent) ? maxRent : maxBudget;
    if (hasValue(minRent) || hasValue(resolvedMaxRent)) {
      filter.rent = {};
      if (hasValue(minRent)) filter.rent.$gte = Number(minRent);
      if (hasValue(resolvedMaxRent)) filter.rent.$lte = Number(resolvedMaxRent);
    }
    const rentStartMonthError = applyRentStartMonthFilter(filter, rentStartMonth);
    if (rentStartMonthError) {
      return res.status(400).json({ message: rentStartMonthError });
    }
    const parsedMinRating = parseMinRating(minRating);
    if (parsedMinRating.error) {
      return res.status(400).json({ message: parsedMinRating.error });
    }
    applyMinRatingFilter(filter, parsedMinRating.value);

    const locationQuery = String(locationText || location || '').trim();
    const areaClause = buildAreaLocationClause(locationQuery);
    if (areaClause) andClauses.push(areaClause);

    const neLatNum = toNumber(neLat);
    const neLngNum = toNumber(neLng);
    const swLatNum = toNumber(swLat);
    const swLngNum = toNumber(swLng);
    const hasBounds = [neLatNum, neLngNum, swLatNum, swLngNum].every((val) => val !== null);

    const explicitCoords = parseCoordinates({ lat, lng });
    let searchCenter = explicitCoords ? { lat: explicitCoords[1], lng: explicitCoords[0] } : null;
    let bounds = null;

    if (hasBounds) {
      const clampedBounds = clampBoundsToBangladesh({
        ne: { lat: neLatNum, lng: neLngNum },
        sw: { lat: swLatNum, lng: swLngNum },
      });
      if (!clampedBounds) {
        return res.status(400).json({ message: 'Invalid bounds coordinates.' });
      }
      filter.location = {
        $geoWithin: {
          $box: [
            [clampedBounds.sw.lng, clampedBounds.sw.lat],
            [clampedBounds.ne.lng, clampedBounds.ne.lat],
          ],
        },
      };
      bounds = clampedBounds;
    } else {
      if (searchCenter && !isBangladeshCoordinates(searchCenter.lat, searchCenter.lng)) {
        searchCenter = null;
      }
      if (!searchCenter && locationQuery) {
        try {
          const geo = await geocodeLocationText(`${locationQuery}, ${BANGLADESH_COUNTRY_NAME}`);
          if (geo) {
            searchCenter = { lat: geo.lat, lng: geo.lng };
            bounds = geo.bounds || null;
          }
        } catch (geoError) {
          console.warn('Geocoding failed, falling back to text search', geoError.message);
        }
      }

      const radius = toNumber(radiusKm) || DEFAULT_SEARCH_RADIUS_KM;
      if (searchCenter && !areaClause) {
        filter.location = {
          $geoWithin: {
            $centerSphere: [[searchCenter.lng, searchCenter.lat], radius / 6378.1],
          },
        };
      }
    }

    if (andClauses.length) {
      filter.$and = andClauses;
    }

    const listings = await Listing.find(filter)
      .select(
        'title address rent rentStartMonth roomType beds baths photos status location ratingAverage ratingCount recommendCount'
      )
      .sort(resolveListingSort(sortBy))
      .lean();

    let mapCenter = DEFAULT_MAP_CENTER;
    let defaultBounds = null;
    if (hasBounds) {
      mapCenter = {
        lat: (bounds.ne.lat + bounds.sw.lat) / 2,
        lng: (bounds.ne.lng + bounds.sw.lng) / 2,
      };
      defaultBounds = bounds;
    } else {
      const radius = toNumber(radiusKm) || DEFAULT_SEARCH_RADIUS_KM;
      mapCenter = searchCenter || centerFromListings(listings);
      defaultBounds = clampBoundsToBangladesh(bounds || boundsFromCenter(mapCenter, radius));
    }

    return res.json({
      listings: listings.map(toPublicListing),
      mapCenter,
      defaultBounds,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Location search failed' });
  }
};

exports.getListingsInBounds = async (req, res) => {
  try {
    const neLat = toNumber(req.query.neLat);
    const neLng = toNumber(req.query.neLng);
    const swLat = toNumber(req.query.swLat);
    const swLng = toNumber(req.query.swLng);
    if ([neLat, neLng, swLat, swLng].some((val) => val === null)) {
      return res.status(400).json({ message: 'Invalid bounds coordinates.' });
    }

    const filter = { status: 'active', $and: [buildBangladeshCountryClause()] };
    if (req.query.title) filter.title = { $regex: req.query.title, $options: 'i' };
    const resolvedMaxRent = hasValue(req.query.maxRent) ? req.query.maxRent : req.query.maxBudget;
    if (hasValue(req.query.minRent) || hasValue(resolvedMaxRent)) {
      filter.rent = {};
      if (hasValue(req.query.minRent)) filter.rent.$gte = Number(req.query.minRent);
      if (hasValue(resolvedMaxRent)) filter.rent.$lte = Number(resolvedMaxRent);
    }
    if (req.query.roomType) filter.roomType = req.query.roomType;
    const rentStartMonthError = applyRentStartMonthFilter(filter, req.query.rentStartMonth);
    if (rentStartMonthError) {
      return res.status(400).json({ message: rentStartMonthError });
    }
    const parsedMinRating = parseMinRating(req.query.minRating);
    if (parsedMinRating.error) {
      return res.status(400).json({ message: parsedMinRating.error });
    }
    applyMinRatingFilter(filter, parsedMinRating.value);

    const clampedBounds = clampBoundsToBangladesh({
      ne: { lat: neLat, lng: neLng },
      sw: { lat: swLat, lng: swLng },
    });
    if (!clampedBounds) {
      return res.status(400).json({ message: 'Invalid bounds coordinates.' });
    }
    filter.location = {
      $geoWithin: {
        $box: [
          [clampedBounds.sw.lng, clampedBounds.sw.lat],
          [clampedBounds.ne.lng, clampedBounds.ne.lat],
        ],
      },
    };

    const listings = await Listing.find(filter)
      .select(
        'title address rent rentStartMonth roomType beds baths photos status location ratingAverage ratingCount recommendCount'
      )
      .sort(resolveListingSort(req.query.sortBy))
      .lean();

    return res.json({ listings: listings.map(toPublicListing) });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Bounds search failed' });
  }
};

exports.getListingById = async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id).populate('owner', 'name verificationStatus').lean();
    if (!listing) return res.status(404).json({ message: 'Listing not found' });
    const images = resolveListingImages(listing);
    const publicListing = {
      ...listing,
      photos: images,
      images,
      mapLocation: toPublicListing(listing).mapLocation,
    };
    return res.json({ listing: publicListing });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Failed to load listing' });
  }
};

exports.getListingByIdForOwner = async (req, res) => {
  try {
    const listing = await Listing.findOne({ _id: req.params.id, owner: req.user.id }).populate(
      'owner',
      'name verificationStatus'
    );
    if (!listing) return res.status(404).json({ message: 'Listing not found' });
    const images = resolveListingImages(listing);
    return res.json({ listing: { ...listing.toObject(), photos: images, images } });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Failed to load listing' });
  }
};

exports.getMyListings = async (req, res) => {
  try {
    if (req.query.rentStartMonth && !RENT_START_MONTH_REGEX.test(req.query.rentStartMonth)) {
      return res.status(400).json({ message: 'Rent start month must be in YYYY-MM format.' });
    }
    const filter = buildFilters(req.query);
    filter.owner = req.user.id;
    const listings = await Listing.find(filter).sort({ updatedAt: -1 }).lean();
    const listingIds = listings.map((listing) => listing._id);
    const activeRentals = listingIds.length
      ? await Rental.find({ listingId: { $in: listingIds }, status: 'active' })
          .select('listingId moveOutNoticeMonth')
          .lean()
      : [];
    const activeMap = new Map(
      activeRentals.map((rental) => [String(rental.listingId), rental])
    );
    const enriched = listings.map((listing) => {
      const images = resolveListingImages(listing);
      return {
        ...listing,
        photos: images,
        images,
        activeRental: activeMap.has(String(listing._id)),
        activeRentalMoveOutNoticeMonth: activeMap.get(String(listing._id))?.moveOutNoticeMonth || null,
      };
    });
    return res.json({ listings: enriched });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Failed to fetch listings' });
  }
};

exports.createListing = async (req, res) => {
  try {
    const {
      title,
      description,
      rent,
      serviceCharge,
      rentStartMonth,
      roomType,
      beds,
      baths,
      status = 'active',
    } = req.body;
    const { address: addressPayload } = parseAddressPayload(req.body);
    const normalizedRentStartMonth = rentStartMonth?.trim();
    const amenities = toArray(req.body.amenities);
    const existingPhotos = toArray(req.body.existingPhotos);
    const coordinates = parseCoordinates(req.body);

    if (!normalizedRentStartMonth || !RENT_START_MONTH_REGEX.test(normalizedRentStartMonth)) {
      return res.status(400).json({ message: 'Rent start month is required in YYYY-MM format.' });
    }
    const normalizedAddress = normalizeAddress(addressPayload || {});
    if (!normalizedAddress.country || !normalizedAddress.city || !normalizedAddress.line1) {
      return res.status(400).json({ message: 'Country, city/area, and street are required.' });
    }
    if (!isBangladeshCountry(normalizedAddress.country)) {
      return res.status(400).json({ message: 'Only Bangladesh listings are allowed.' });
    }
    normalizedAddress.country = BANGLADESH_COUNTRY_NAME;
    normalizedAddress.countryNormalized = 'bangladesh';
    if (!coordinates || !isBangladeshCoordinates(Number(coordinates[1]), Number(coordinates[0]))) {
      return res.status(400).json({ message: 'Please select a valid map location inside Bangladesh.' });
    }

    const uploadedPhotos = [];
    if (req.files?.length) {
      for (const file of req.files) {
        const result = await cloudinary.uploader.upload(file.path, {
          folder: 'rentapp/listings',
        });
        uploadedPhotos.push(result.secure_url);
      }
    }

    const photos = [...existingPhotos, ...uploadedPhotos];
    if (photos.length > 5) {
      return res.status(400).json({ message: 'You can upload up to 5 photos.' });
    }

    if (typeof serviceCharge === 'undefined' || serviceCharge === '') {
      return res.status(400).json({ message: 'Service charge is required.' });
    }
    const parsedServiceCharge = Number(serviceCharge);
    if (!Number.isFinite(parsedServiceCharge) || parsedServiceCharge < 0) {
      return res.status(400).json({ message: 'Service charge must be a non-negative number.' });
    }

    const listing = await Listing.create({
      owner: req.user.id,
      title,
      description,
      rent: Number(rent),
      serviceCharge: parsedServiceCharge,
      rentStartMonth: normalizedRentStartMonth,
      address: normalizedAddress,
      roomType,
      beds: Number(beds),
      baths: Number(baths),
      amenities,
      photos,
      status,
      location: {
        type: 'Point',
        coordinates,
      },
    });
    try {
      await notifyTenantsForListing(listing);
    } catch (notifyErr) {
      console.error('Failed to notify tenants for new listing', notifyErr);
    }
    return res.status(201).json({ listing });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Failed to create listing', error: err.message });
  }
};

exports.updateListing = async (req, res) => {
  try {
    const listing = await Listing.findOne({ _id: req.params.id, owner: req.user.id });
    if (!listing) return res.status(404).json({ message: 'Listing not found' });

    const { title, description, rent, serviceCharge, rentStartMonth, roomType, beds, baths, status } = req.body;
    const { address: addressPayload, legacyAddress } = parseAddressPayload(req.body);
    const normalizedAddress = addressPayload ? normalizeAddress(addressPayload) : null;
    const hasAddressUpdate =
      normalizedAddress && (normalizedAddress.country || normalizedAddress.city || normalizedAddress.line1);
    const amenities = toArray(req.body.amenities);
    const existingPhotos = toArray(req.body.existingPhotos);
    const coordinates = parseCoordinates(req.body);
    const uploadedPhotos = [];
    if (req.files?.length) {
      for (const file of req.files) {
        const result = await cloudinary.uploader.upload(file.path, {
          folder: 'rentapp/listings',
        });
        uploadedPhotos.push(result.secure_url);
      }
    }
    const photos = [...existingPhotos, ...uploadedPhotos];
    if (photos.length > 5) {
      return res.status(400).json({ message: 'You can upload up to 5 photos.' });
    }

    if (title) listing.title = title;
    if (typeof description !== 'undefined') listing.description = description;
    if (rent) listing.rent = Number(rent);
    if (typeof serviceCharge !== 'undefined') {
      const parsedServiceCharge = Number(serviceCharge);
      if (!Number.isFinite(parsedServiceCharge) || parsedServiceCharge < 0) {
        return res.status(400).json({ message: 'Service charge must be a non-negative number.' });
      }
      listing.serviceCharge = parsedServiceCharge;
    }
    if (hasAddressUpdate) {
      if (!normalizedAddress.country || !normalizedAddress.city || !normalizedAddress.line1) {
        return res.status(400).json({ message: 'Country, city/area, and street are required.' });
      }
      if (!isBangladeshCountry(normalizedAddress.country)) {
        return res.status(400).json({ message: 'Only Bangladesh listings are allowed.' });
      }
      normalizedAddress.country = BANGLADESH_COUNTRY_NAME;
      normalizedAddress.countryNormalized = 'bangladesh';
      if (typeof listing.address === 'string' && !listing.legacyAddress) {
        listing.legacyAddress = listing.address;
      }
      listing.address = normalizedAddress;
    } else if (legacyAddress) {
      listing.legacyAddress = legacyAddress;
      if (typeof listing.address === 'string') {
        listing.address = legacyAddress;
      }
    }
    if (roomType) listing.roomType = roomType;
    if (beds) listing.beds = Number(beds);
    if (baths) listing.baths = Number(baths);
    if (status) {
      if (status === 'active' && listing.status === 'archived') {
        const activeRental = await Rental.findOne({ listingId: listing._id, status: 'active' }).select('_id');
        if (activeRental) {
          return res.status(400).json({ message: 'Listing can be activated after the tenant leaves.' });
        }
      }
      listing.status = status;
    }
    if (typeof rentStartMonth !== 'undefined') {
      const normalizedRentStartMonth = String(rentStartMonth).trim();
      if (!RENT_START_MONTH_REGEX.test(normalizedRentStartMonth)) {
        return res.status(400).json({ message: 'Rent start month must be in YYYY-MM format.' });
      }
      listing.rentStartMonth = normalizedRentStartMonth;
    } else if (!listing.rentStartMonth) {
      return res.status(400).json({ message: 'Rent start month is required in YYYY-MM format.' });
    }
    if (coordinates) {
      if (!isBangladeshCoordinates(Number(coordinates[1]), Number(coordinates[0]))) {
        return res.status(400).json({ message: 'Please select a valid map location inside Bangladesh.' });
      }
      listing.location = { type: 'Point', coordinates };
    } else {
      const existingCoords = listing.location?.coordinates;
      if (
        !Array.isArray(existingCoords) ||
        existingCoords.length !== 2 ||
        !isBangladeshCoordinates(Number(existingCoords[1]), Number(existingCoords[0]))
      ) {
        return res.status(400).json({ message: 'Please select a valid map location inside Bangladesh.' });
      }
    }
    listing.amenities = amenities.length ? amenities : [];
    listing.photos = photos;

    await listing.save();
    return res.json({ listing });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Failed to update listing', error: err.message });
  }
};

exports.deleteListing = async (req, res) => {
  try {
    const listing = await Listing.findOne({ _id: req.params.id, owner: req.user.id });
    if (!listing) return res.status(404).json({ message: 'Listing not found' });

    const activeRental = await Rental.findOne({ listingId: listing._id, status: 'active' }).select('_id');
    if (activeRental) {
      return res.status(400).json({ message: 'Rented property can not be deleted' });
    }

    const images = resolveListingImages(listing);
    if (images.length) {
      await destroyCloudinaryAssets(images);
    }

    await listing.deleteOne();
    return res.json({ message: 'Listing deleted' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Failed to delete listing' });
  }
};
