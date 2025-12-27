const mongoose = require('mongoose');
const Ticket = require('../models/Ticket');
const TicketMessage = require('../models/TicketMessage');
const Listing = require('../models/Listing');
const Rental = require('../models/Rental');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { createNotification } = require('../services/notificationService');
const { getLabelForType } = require('../utils/ticketLabels');
const { getIO } = require('../socket');
const {
  buildAccessQuery,
  getUnreadField,
  hasTicketAccess,
  ensureTicketAccess,
  getUnreadCounts,
  createError,
} = require('../services/ticketService');

const resolvePriority = (value) => {
  if (!value) return 'medium';
  const normalized = String(value).toLowerCase();
  return ['low', 'medium', 'high'].includes(normalized) ? normalized : 'medium';
};

const resolveLabel = (type, labelKey) => {
  const label = getLabelForType(type, labelKey);
  if (!label) {
    throw createError(400, 'Invalid label for ticket type');
  }
  return label;
};

const toTicketSummary = (ticket, role) => {
  const listing = ticket.listingId || {};
  const tenant = ticket.createdBy || {};
  const unreadField = getUnreadField(role);
  return {
    _id: ticket._id,
    subject: ticket.subject,
    type: ticket.type,
    labelKey: ticket.labelKey,
    labelName: ticket.labelName,
    labelColor: ticket.labelColor,
    status: ticket.status,
    priority: ticket.priority,
    lastMessageAt: ticket.lastMessageAt,
    createdAt: ticket.createdAt,
    listingId: listing._id || ticket.listingId,
    listingTitle: listing.title,
    tenantName: tenant.name,
    unreadCount: unreadField ? ticket?.unreadFor?.[unreadField] || 0 : 0,
  };
};

const emitUnreadUpdate = async ({ userId, role }) => {
  const io = getIO();
  if (!io) return;
  try {
    const totals = await getUnreadCounts({ userId, role });
    io.to(`user:${userId}`).emit('ticket:unread:update', totals);
  } catch (err) {
    console.error('Failed to emit unread update', err);
  }
};

exports.createTicket = async (req, res) => {
  try {
    if (req.user.role !== 'tenant') {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const { type, subject, description, labelKey, listingId, priority } = req.body || {};
    const normalizedType = String(type || '').toLowerCase();
    if (!['technical', 'property'].includes(normalizedType)) {
      return res.status(400).json({ message: 'Invalid ticket type' });
    }
    const trimmedSubject = String(subject || '').trim();
    const trimmedDescription = String(description || '').trim();
    if (!trimmedSubject || !trimmedDescription) {
      return res.status(400).json({ message: 'Subject and description are required' });
    }

    const label = resolveLabel(normalizedType, labelKey);
    const resolvedPriority = resolvePriority(priority);

    let assignedToRole = 'admin';
    let assignedToUserId = null;
    let resolvedListingId = null;
    let resolvedRentalId = null;

    if (normalizedType === 'technical') {
      const adminUser = await User.findOne({ role: 'admin' }).sort({ createdAt: 1 });
      if (!adminUser) {
        return res.status(400).json({ message: 'No admin available to receive ticket' });
      }
      assignedToRole = 'admin';
      assignedToUserId = adminUser._id;
    } else {
      if (!mongoose.Types.ObjectId.isValid(listingId)) {
        return res.status(400).json({ message: 'Listing is required for property tickets' });
      }
      const listing = await Listing.findById(listingId).select('owner title');
      if (!listing) {
        return res.status(404).json({ message: 'Listing not found' });
      }

      const rental = await Rental.findOne({
        tenantId: req.user.id,
        listingId,
        status: 'active',
      });
      if (!rental) {
        return res.status(403).json({ message: 'You must be an active renter to open this ticket' });
      }

      assignedToRole = 'landlord';
      assignedToUserId = listing.owner || rental.landlordId;
      resolvedListingId = listing._id;
      resolvedRentalId = rental._id;
    }

    const unreadFor = { tenant: 0, admin: 0, landlord: 0 };
    if (assignedToRole === 'admin') unreadFor.admin = 1;
    if (assignedToRole === 'landlord') unreadFor.landlord = 1;

    const now = new Date();
    const ticket = await Ticket.create({
      createdBy: req.user.id,
      assignedToRole,
      assignedToUserId,
      listingId: resolvedListingId,
      rentalId: resolvedRentalId,
      subject: trimmedSubject,
      description: trimmedDescription,
      type: normalizedType,
      labelKey: label.key,
      labelName: label.name,
      labelColor: label.color,
      priority: resolvedPriority,
      status: 'open',
      lastMessageAt: now,
      unreadFor,
    });

    await TicketMessage.create({
      ticketId: ticket._id,
      senderRole: 'tenant',
      senderId: req.user.id,
      text: trimmedDescription,
    });

    const { notification, created } = await createNotification({
      userId: assignedToUserId,
      actorId: req.user.id,
      role: assignedToRole,
      type: 'ticket_created',
      eventType: 'TICKET_CREATED',
      eventId: ticket._id,
      title: 'New support ticket',
      body: trimmedSubject,
      link: `/support/tickets/${ticket._id}`,
      metadata: { ticketId: ticket._id, ticketType: normalizedType },
    });

    const io = getIO();
    if (io) {
      io.to(`user:${assignedToUserId}`).emit('ticket:new', {
        ticket: toTicketSummary(ticket, assignedToRole),
      });
      if (created && notification) {
        io.to(`user:${assignedToUserId}`).emit('notification:new', notification);
      }
      await emitUnreadUpdate({ userId: assignedToUserId, role: assignedToRole });
    }

    return res.status(201).json({ ticket });
  } catch (err) {
    console.error(err);
    return res.status(err.status || 500).json({ message: err.message || 'Failed to create ticket' });
  }
};

exports.listMyTickets = async (req, res) => {
  try {
    const query = { createdBy: req.user.id };
    if (req.query.status) query.status = req.query.status;
    if (req.query.type) query.type = req.query.type;
    if (req.query.label) query.labelKey = req.query.label;

    const tickets = await Ticket.find(query)
      .populate('listingId', 'title')
      .sort({ lastMessageAt: -1, updatedAt: -1 })
      .lean();

    return res.json({ tickets: tickets.map((ticket) => toTicketSummary(ticket, 'tenant')) });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Failed to load tickets' });
  }
};

exports.getTicket = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid ticket id' });
    }

    const ticket = await Ticket.findById(id)
      .populate('listingId', 'title address')
      .populate('createdBy', 'name role')
      .lean();
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }
    if (!hasTicketAccess(ticket, { userId: req.user.id, role: req.user.role })) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const messages = await TicketMessage.find({ ticketId: id }).sort({ createdAt: 1 }).lean();
    return res.json({ ticket, messages });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Failed to load ticket' });
  }
};

exports.addMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const { text } = req.body || {};
    const trimmedText = String(text || '').trim();
    if (!trimmedText) {
      return res.status(400).json({ message: 'Message text is required' });
    }

    const ticket = await ensureTicketAccess(id, { userId: req.user.id, role: req.user.role });
    if (req.user.role !== 'tenant' && req.user.role !== ticket.assignedToRole) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const senderRole = req.user.role;
    const recipientRole = senderRole === 'tenant' ? ticket.assignedToRole : 'tenant';
    const recipientId = recipientRole === 'tenant' ? ticket.createdBy : ticket.assignedToUserId;

    const message = await TicketMessage.create({
      ticketId: ticket._id,
      senderRole,
      senderId: req.user.id,
      text: trimmedText,
    });

    const unreadField = getUnreadField(recipientRole);
    await Ticket.findByIdAndUpdate(
      ticket._id,
      {
        $set: { lastMessageAt: new Date() },
        $inc: unreadField ? { [`unreadFor.${unreadField}`]: 1 } : {},
      },
      { new: true }
    );

    const { notification, created } = await createNotification({
      userId: recipientId,
      actorId: req.user.id,
      role: recipientRole,
      type: 'ticket_reply',
      eventType: 'TICKET_REPLY',
      eventId: message._id,
      title: `New reply on ${ticket.subject}`,
      body: trimmedText.slice(0, 120),
      link: `/support/tickets/${ticket._id}`,
      metadata: { ticketId: ticket._id, ticketType: ticket.type },
    });

    const io = getIO();
    if (io) {
      io.to(`user:${recipientId}`).emit('ticket:message:new', { ticketId: ticket._id, message });
      if (created && notification) {
        io.to(`user:${recipientId}`).emit('notification:new', notification);
      }
      await emitUnreadUpdate({ userId: recipientId, role: recipientRole });
    }

    return res.status(201).json({ message });
  } catch (err) {
    console.error(err);
    return res.status(err.status || 500).json({ message: err.message || 'Failed to send message' });
  }
};

exports.markRead = async (req, res) => {
  try {
    const { id } = req.params;
    const ticket = await ensureTicketAccess(id, { userId: req.user.id, role: req.user.role });
    const unreadField = getUnreadField(req.user.role);
    if (unreadField) {
      await Ticket.findByIdAndUpdate(ticket._id, { $set: { [`unreadFor.${unreadField}`]: 0 } });
    }

    await Notification.updateMany(
      { userId: req.user.id, isRead: false, 'metadata.ticketId': ticket._id },
      { $set: { isRead: true } }
    );

    const totals = await getUnreadCounts({ userId: req.user.id, role: req.user.role });
    return res.json({ success: true, ...totals });
  } catch (err) {
    console.error(err);
    return res.status(err.status || 500).json({ message: err.message || 'Failed to mark ticket as read' });
  }
};

exports.updateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body || {};
    const nextStatus = String(status || '').toLowerCase();
    if (!['open', 'in_progress', 'resolved', 'closed'].includes(nextStatus)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const ticket = await ensureTicketAccess(id, { userId: req.user.id, role: req.user.role });
    if (req.user.role === 'tenant') {
      return res.status(403).json({ message: 'Forbidden' });
    }
    if (ticket.type === 'technical' && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden' });
    }
    if (ticket.type === 'property' && req.user.role !== 'landlord') {
      return res.status(403).json({ message: 'Forbidden' });
    }
    if (String(ticket.assignedToUserId) !== String(req.user.id)) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    if (ticket.status === nextStatus) {
      return res.json({ ticket });
    }

    const updated = await Ticket.findByIdAndUpdate(
      ticket._id,
      {
        $set: { status: nextStatus, lastMessageAt: new Date(), updatedAt: new Date() },
        $inc: { 'unreadFor.tenant': 1 },
      },
      { new: true }
    );

    const { notification, created } = await createNotification({
      userId: updated.createdBy,
      actorId: req.user.id,
      role: 'tenant',
      type: 'ticket_status',
      eventType: 'TICKET_STATUS_CHANGED',
      eventId: `${updated._id}:${nextStatus}`,
      title: `Your ticket status changed to ${nextStatus.replace('_', ' ')}`,
      body: updated.subject,
      link: `/support/tickets/${updated._id}`,
      metadata: { ticketId: updated._id, ticketType: updated.type, status: nextStatus },
    });

    const io = getIO();
    if (io) {
      if (created && notification) {
        io.to(`user:${updated.createdBy}`).emit('notification:new', notification);
      }
      await emitUnreadUpdate({ userId: updated.createdBy, role: 'tenant' });
    }

    return res.json({ ticket: updated });
  } catch (err) {
    console.error(err);
    return res.status(err.status || 500).json({ message: err.message || 'Failed to update status' });
  }
};

exports.listAdminTickets = async (req, res) => {
  try {
    const baseQuery = buildAccessQuery({ userId: req.user.id, role: 'admin' });
    const query = { ...baseQuery, type: 'technical' };
    if (req.query.label) query.labelKey = req.query.label;
    if (req.query.status) query.status = req.query.status;
    if (req.query.priority) query.priority = req.query.priority;
    if (req.query.from || req.query.to) {
      query.createdAt = {};
      if (req.query.from) {
        const fromDate = new Date(req.query.from);
        if (Number.isNaN(fromDate.getTime())) {
          return res.status(400).json({ message: 'Invalid from date' });
        }
        query.createdAt.$gte = fromDate;
      }
      if (req.query.to) {
        const toDate = new Date(req.query.to);
        if (Number.isNaN(toDate.getTime())) {
          return res.status(400).json({ message: 'Invalid to date' });
        }
        query.createdAt.$lte = toDate;
      }
    }

    const tickets = await Ticket.find(query)
      .populate('listingId', 'title')
      .populate('createdBy', 'name')
      .sort({ lastMessageAt: -1, updatedAt: -1 })
      .lean();

    return res.json({ tickets: tickets.map((ticket) => toTicketSummary(ticket, 'admin')) });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Failed to load tickets' });
  }
};

exports.listLandlordTickets = async (req, res) => {
  try {
    const baseQuery = buildAccessQuery({ userId: req.user.id, role: 'landlord' });
    const query = { ...baseQuery, type: 'property' };
    if (req.query.label) query.labelKey = req.query.label;
    if (req.query.status) query.status = req.query.status;
    if (req.query.priority) query.priority = req.query.priority;
    if (req.query.listingId) {
      if (!mongoose.Types.ObjectId.isValid(req.query.listingId)) {
        return res.status(400).json({ message: 'Invalid listing filter' });
      }
      query.listingId = req.query.listingId;
    }

    const tickets = await Ticket.find(query)
      .populate('listingId', 'title')
      .populate('createdBy', 'name')
      .sort({ lastMessageAt: -1, updatedAt: -1 })
      .lean();

    return res.json({ tickets: tickets.map((ticket) => toTicketSummary(ticket, 'landlord')) });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Failed to load tickets' });
  }
};

exports.getUnreadCount = async (req, res) => {
  try {
    const totals = await getUnreadCounts({ userId: req.user.id, role: req.user.role });
    return res.json(totals);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Failed to load unread count' });
  }
};
