const mongoose = require('mongoose');
const Ticket = require('../models/Ticket');

const createError = (status, message) => {
  const err = new Error(message);
  err.status = status;
  return err;
};

const buildAccessQuery = ({ userId, role }) => {
  if (role === 'tenant') return { createdBy: userId };
  if (role === 'admin') return { assignedToRole: 'admin', assignedToUserId: userId };
  if (role === 'landlord') return { assignedToRole: 'landlord', assignedToUserId: userId };
  return null;
};

const getUnreadField = (role) => {
  if (role === 'tenant') return 'tenant';
  if (role === 'admin') return 'admin';
  if (role === 'landlord') return 'landlord';
  return null;
};

const resolveId = (value) => (value && typeof value === 'object' && value._id ? value._id : value);

const hasTicketAccess = (ticket, { userId, role }) => {
  const userKey = String(userId);
  const createdBy = resolveId(ticket.createdBy);
  const assignedTo = resolveId(ticket.assignedToUserId);
  if (role === 'tenant') return String(createdBy) === userKey;
  if (role === 'admin') {
    return ticket.assignedToRole === 'admin' && String(assignedTo) === userKey;
  }
  if (role === 'landlord') {
    return ticket.assignedToRole === 'landlord' && String(assignedTo) === userKey;
  }
  return false;
};

const ensureTicketAccess = async (ticketId, user) => {
  if (!mongoose.Types.ObjectId.isValid(ticketId)) {
    throw createError(400, 'Invalid ticket id');
  }
  const ticket = await Ticket.findById(ticketId);
  if (!ticket) {
    throw createError(404, 'Ticket not found');
  }
  if (!hasTicketAccess(ticket, user)) {
    throw createError(403, 'Forbidden');
  }
  return ticket;
};

const getUnreadCounts = async ({ userId, role }) => {
  const query = buildAccessQuery({ userId, role });
  if (!query) return { totalUnreadTickets: 0, totalUnreadMessages: 0 };
  const unreadField = getUnreadField(role);
  if (!unreadField) return { totalUnreadTickets: 0, totalUnreadMessages: 0 };

  const tickets = await Ticket.find({ ...query, [`unreadFor.${unreadField}`]: { $gt: 0 } })
    .select('unreadFor')
    .lean();

  const totalUnreadTickets = tickets.length;
  const totalUnreadMessages = tickets.reduce((sum, ticket) => {
    const unread = ticket?.unreadFor?.[unreadField] || 0;
    return sum + unread;
  }, 0);

  return { totalUnreadTickets, totalUnreadMessages };
};

module.exports = {
  createError,
  buildAccessQuery,
  getUnreadField,
  hasTicketAccess,
  ensureTicketAccess,
  getUnreadCounts,
};
