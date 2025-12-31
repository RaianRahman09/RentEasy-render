const Listing = require('../models/Listing');
const Rental = require('../models/Rental');
const cloudinary = require('../utils/cloudinary');
const { destroyCloudinaryAssets } = require('../utils/cloudinaryAssets');
const { notifyTenantsForListing } = require('../services/notificationService');
const { normalizeAddress } = require('../utils/address');
const { geocodeLocationText } = require('../utils/geocode');

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
const DEFAULT_MAP_CENTER = { lat: 23.8103, lng: 90.4125 };

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

const buildFilters = (body = {}) => {
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
  if (status) filter.status = status;
  if (title) filter.title = { $regex: title, $options: 'i' };
  if (roomType) filter.roomType = roomType;
  const amenityList = toArray(amenities);
  if (amenityList.length) filter.amenities = { $all: amenityList };
  if (location) {
    const regex = { $regex: location, $options: 'i' };
    filter.$or = [
      { 'address.formatted': regex },
      { 'address.line1': regex },
      { 'address.city': regex },
      { 'address.country': regex },
      { legacyAddress: regex },
      { address: regex },
    ];
  }
  const resolvedMaxRent = hasValue(maxRent) ? maxRent : maxBudget;
  if (hasValue(minRent) || hasValue(resolvedMaxRent)) {
    filter.rent = {};
    if (hasValue(minRent)) filter.rent.$gte = Number(minRent);
    if (hasValue(resolvedMaxRent)) filter.rent.$lte = Number(resolvedMaxRent);
  }
  if (rentStartMonth) filter.rentStartMonth = { $lte: rentStartMonth };
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
    .filter((coord) => Array.isArray(coord) && coord.length === 2);
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
  return {
    ne: { lat: center.lat + latOffset, lng: center.lng + lngOffset },
    sw: { lat: center.lat - latOffset, lng: center.lng - lngOffset },
  };
};

const toPublicListing = (listing) => {
  const obfuscated = obfuscateCoordinates(listing.location?.coordinates, listing._id?.toString() || '');
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
    const listings = await Listing.find({ status: 'active' })
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
    const filter = buildFilters(req.body);
    const listings = await Listing.find(filter)
      .select('title address rent rentStartMonth roomType beds baths photos status location')
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
    } = req.query;

    const filter = {
      status: 'active',
    };
    const andClauses = [];
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

    const locationQuery = locationText || location;
    if (locationQuery) {
      const regex = { $regex: locationQuery, $options: 'i' };
      andClauses.push({
        $or: [
          { 'address.formatted': regex },
          { 'address.line1': regex },
          { 'address.city': regex },
          { 'address.country': regex },
          { legacyAddress: regex },
          { address: regex },
        ],
      });
    }

    const neLatNum = toNumber(neLat);
    const neLngNum = toNumber(neLng);
    const swLatNum = toNumber(swLat);
    const swLngNum = toNumber(swLng);
    const hasBounds = [neLatNum, neLngNum, swLatNum, swLngNum].every((val) => val !== null);

    const explicitCoords = parseCoordinates({ lat, lng });
    let searchCenter = explicitCoords ? { lat: explicitCoords[1], lng: explicitCoords[0] } : null;
    let bounds = null;

    if (hasBounds) {
      filter.location = {
        $geoWithin: {
          $box: [
            [swLngNum, swLatNum],
            [neLngNum, neLatNum],
          ],
        },
      };
      bounds = {
        ne: { lat: neLatNum, lng: neLngNum },
        sw: { lat: swLatNum, lng: swLngNum },
      };
    } else {
      if (!searchCenter && locationQuery) {
        try {
          const geo = await geocodeLocationText(locationQuery);
          if (geo) {
            searchCenter = { lat: geo.lat, lng: geo.lng };
            bounds = geo.bounds || null;
          }
        } catch (geoError) {
          console.warn('Geocoding failed, falling back to text search', geoError.message);
        }
      }

      const radius = toNumber(radiusKm) || DEFAULT_SEARCH_RADIUS_KM;
      if (searchCenter) {
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
      .select('title address rent rentStartMonth roomType beds baths photos status location')
      .lean();

    let mapCenter = DEFAULT_MAP_CENTER;
    let defaultBounds = null;
    if (hasBounds) {
      mapCenter = {
        lat: (neLatNum + swLatNum) / 2,
        lng: (neLngNum + swLngNum) / 2,
      };
      defaultBounds = bounds;
    } else {
      const radius = toNumber(radiusKm) || DEFAULT_SEARCH_RADIUS_KM;
      mapCenter = searchCenter || centerFromListings(listings);
      defaultBounds = bounds || boundsFromCenter(mapCenter, radius);
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

    const filter = { status: 'active' };
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

    filter.location = {
      $geoWithin: {
        $box: [
          [swLng, swLat],
          [neLng, neLat],
        ],
      },
    };

    const listings = await Listing.find(filter)
      .select('title address rent rentStartMonth roomType beds baths photos status location')
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
    if (!coordinates) {
      return res.status(400).json({ message: 'Please select a valid map location for this listing.' });
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
      listing.location = { type: 'Point', coordinates };
    } else if (!listing.location?.coordinates?.length) {
      return res.status(400).json({ message: 'Please select a valid map location for this listing.' });
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
