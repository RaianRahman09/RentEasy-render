const SavedFilter = require('../models/SavedFilter');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { sendMail } = require('../utils/mailer');

const clientBaseUrl = process.env.CLIENT_URL || 'http://localhost:5173';

const textMatches = (value, query) => {
  if (!query) return true;
  if (!value) return false;
  const regex = new RegExp(query, 'i');
  return regex.test(value);
};

const matchesFilter = (listing, filter) => {
  if (filter.status && listing.status !== filter.status) return false;
  if (!textMatches(listing.title, filter.title)) return false;
  if (!textMatches(listing.address, filter.location)) return false;
  if (filter.roomType && listing.roomType !== filter.roomType) return false;
  if (typeof filter.minRent === 'number' && listing.rent < filter.minRent) return false;
  if (typeof filter.maxRent === 'number' && listing.rent > filter.maxRent) return false;
  if (filter.amenities?.length) {
    const hasAll = filter.amenities.every((a) => listing.amenities?.includes(a));
    if (!hasAll) return false;
  }
  return true;
};

const buildEmailBody = (listing, matchedFilters = []) => {
  const listingUrl = `${clientBaseUrl}/listing/${listing._id}`;
  const filterList = matchedFilters.length ? `<p>Matched filters: ${matchedFilters.join(', ')}</p>` : '';
  return `
    <div>
      <p>Hello,</p>
      <p>A new listing that matches your saved filters is now available:</p>
      <p><strong>${listing.title}</strong></p>
      <ul>
        <li>Rent: $${listing.rent}/mo</li>
        <li>Location: ${listing.address}</li>
        <li>Room type: ${listing.roomType}</li>
        <li>Status: ${listing.status}</li>
      </ul>
      ${filterList}
      <p><a href="${listingUrl}">View listing</a></p>
      <p>— RentEasy</p>
    </div>
  `;
};

const notifyTenantsForListing = async (listing) => {
  if (listing.status === 'archived') return;
  const filters = await SavedFilter.find({});
  if (!filters.length) return;

  const matchedByTenant = {};
  filters.forEach((filter) => {
    if (matchesFilter(listing, filter)) {
      const tenantId = String(filter.tenant);
      if (!matchedByTenant[tenantId]) matchedByTenant[tenantId] = [];
      matchedByTenant[tenantId].push(filter.name || 'Saved Filter');
    }
  });

  const tenantIds = Object.keys(matchedByTenant);
  if (!tenantIds.length) return;

  const tenants = await User.find({ _id: { $in: tenantIds } });
  await Promise.all(
    tenants.map((tenant) =>
      sendMail({
        to: tenant.email,
        subject: `New listing matches your saved filters`,
        html: buildEmailBody(listing, matchedByTenant[String(tenant._id)]),
      }).catch((err) => console.error('Failed to send email', err))
    )
  );
};

const createNotification = async ({
  userId,
  receiverId,
  actorId,
  role,
  type,
  eventType,
  eventId,
  title,
  body,
  link,
  metadata,
} = {}) => {
  const missing = [];
  const resolvedReceiverId = receiverId || userId;
  if (!resolvedReceiverId) missing.push('userId');
  if (!type) missing.push('type');
  if (!title) missing.push('title');
  if (!link) missing.push('link');
  if (missing.length) {
    const err = new Error(`Missing required fields: ${missing.join(', ')}`);
    err.status = 400;
    throw err;
  }

  const normalizedEventType = eventType || type;
  const normalizedEventId = eventId === null || typeof eventId === 'undefined' ? null : String(eventId);
  const dedupeKey =
    normalizedEventType && normalizedEventId && resolvedReceiverId
      ? `${normalizedEventType}:${resolvedReceiverId}:${normalizedEventId}`
      : null;

  const payload = {
    userId: resolvedReceiverId,
    receiverId: resolvedReceiverId,
    actorId,
    role,
    type,
    eventType: normalizedEventType,
    eventId: normalizedEventId,
    dedupeKey,
    title,
    body,
    link,
    metadata,
  };

  if (!dedupeKey) {
    const notification = await Notification.create(payload);
    return { notification, created: true };
  }

  try {
    const result = await Notification.findOneAndUpdate(
      { dedupeKey },
      { $setOnInsert: payload },
      { upsert: true, new: true, rawResult: true, setDefaultsOnInsert: true }
    );
    const notification = result?.value || null;
    const created = !result?.lastErrorObject?.updatedExisting;
    return { notification, created };
  } catch (err) {
    if (err.code === 11000) {
      const existing = await Notification.findOne({ dedupeKey });
      return { notification: existing, created: false };
    }
    throw err;
  }
};

module.exports = { notifyTenantsForListing, createNotification };
