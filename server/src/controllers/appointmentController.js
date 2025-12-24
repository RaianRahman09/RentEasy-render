const mongoose = require('mongoose');
const Appointment = require('../models/Appointment');
const AvailabilitySlot = require('../models/AvailabilitySlot');
const Listing = require('../models/Listing');
const User = require('../models/User');
const { createNotification } = require('../services/notificationService');
const { sendMail } = require('../utils/mailer');
const { formatAppointmentWindow, buildAppointmentEmail } = require('../utils/appointmentEmail');

const isValidId = (value) => mongoose.Types.ObjectId.isValid(value);
const ACTIVE_STATUSES = ['REQUESTED', 'ACCEPTED'];

const sortByStatusThenTime = (appointments) => {
  const order = { REQUESTED: 0, ACCEPTED: 1, REJECTED: 2, CANCELLED: 3 };
  return appointments.sort((a, b) => {
    const statusDiff = (order[a.status] ?? 99) - (order[b.status] ?? 99);
    if (statusDiff !== 0) return statusDiff;
    return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
  });
};

const getUserSafe = async (id) => {
  if (!id) return null;
  return User.findById(id).select('name email');
};

exports.requestAppointment = async (req, res) => {
  try {
    const { listingId, slotId } = req.body || {};
    if (!isValidId(listingId) || !isValidId(slotId)) {
      return res.status(400).json({ message: 'listingId and slotId are required.' });
    }

    const slot = await AvailabilitySlot.findById(slotId);
    if (!slot || String(slot.listingId) !== String(listingId)) {
      return res.status(404).json({ message: 'Availability slot not found.' });
    }

    if (slot.isBooked) {
      return res.status(409).json({ message: 'Slot is already booked.' });
    }

    const now = new Date();
    if (slot.startTime < now) {
      return res.status(400).json({ message: 'Slot is no longer available.' });
    }

    const existing = await Appointment.findOne({ slotId, status: { $in: ACTIVE_STATUSES } });
    if (existing) {
      return res.status(409).json({ message: 'Slot already has an active request.' });
    }

    const listing = await Listing.findById(listingId).populate('owner', 'name email');
    if (!listing) {
      return res.status(404).json({ message: 'Listing not found.' });
    }
    if (String(listing.owner?._id || listing.owner) !== String(slot.landlordId)) {
      return res.status(400).json({ message: 'Slot does not match listing landlord.' });
    }

    const appointment = await Appointment.create({
      listingId,
      landlordId: slot.landlordId,
      tenantId: req.user.id,
      slotId,
      startTime: slot.startTime,
      endTime: slot.endTime,
      status: 'REQUESTED',
    });

    const tenant = await getUserSafe(req.user.id);
    const landlord = listing.owner;
    const windowText = formatAppointmentWindow(appointment.startTime, appointment.endTime);

    await createNotification({
      userId: slot.landlordId,
      actorId: req.user.id,
      type: 'APPOINTMENT_REQUESTED',
      title: 'New viewing request',
      body: `${tenant?.name || 'A tenant'} requested ${listing.title} on ${windowText}.`,
      link: '/landlord/appointments',
      metadata: { appointmentId: appointment._id, listingId },
    });

    if (landlord?.email) {
      await sendMail({
        to: landlord.email,
        subject: `Viewing request: ${listing.title}`,
        html: buildAppointmentEmail({
          recipientName: landlord.name,
          heading: `${tenant?.name || 'A tenant'} requested a viewing.`,
          listingTitle: listing.title,
          windowText,
          otherPartyLabel: 'Tenant',
          otherPartyName: tenant?.name || 'Tenant',
          linkPath: '/landlord/appointments',
          note: 'Please accept or reject the request from your dashboard.',
        }),
      });
    }

    return res.status(201).json({ appointment });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: 'Slot already has an active request.' });
    }
    console.error(err);
    return res.status(500).json({ message: 'Failed to request appointment.' });
  }
};

exports.rescheduleAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    const { newSlotId } = req.body || {};
    if (!isValidId(id) || !isValidId(newSlotId)) {
      return res.status(400).json({ message: 'Valid appointment id and newSlotId are required.' });
    }

    const appointment = await Appointment.findOne({ _id: id, tenantId: req.user.id })
      .populate('listingId', 'title')
      .populate('landlordId', 'name email');
    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found.' });
    }
    if (appointment.status === 'CANCELLED') {
      return res.status(400).json({ message: 'Cancelled appointments cannot be rescheduled.' });
    }
    if (String(appointment.slotId) === String(newSlotId)) {
      return res.status(400).json({ message: 'Please choose a different slot.' });
    }

    const newSlot = await AvailabilitySlot.findById(newSlotId);
    if (!newSlot || String(newSlot.listingId) !== String(appointment.listingId?._id || appointment.listingId)) {
      return res.status(404).json({ message: 'Availability slot not found.' });
    }

    if (String(newSlot.landlordId) !== String(appointment.landlordId?._id || appointment.landlordId)) {
      return res.status(400).json({ message: 'Slot does not match landlord.' });
    }

    const now = new Date();
    if (newSlot.startTime < now) {
      return res.status(400).json({ message: 'Slot is no longer available.' });
    }

    if (newSlot.isBooked) {
      return res.status(409).json({ message: 'Slot is already booked.' });
    }

    const existing = await Appointment.findOne({ slotId: newSlotId, status: { $in: ACTIVE_STATUSES } });
    if (existing) {
      return res.status(409).json({ message: 'Slot already has an active request.' });
    }

    const previousStatus = appointment.status;
    const previousSlotId = appointment.slotId;

    appointment.slotId = newSlot._id;
    appointment.startTime = newSlot.startTime;
    appointment.endTime = newSlot.endTime;
    appointment.status = 'REQUESTED';
    appointment.rescheduleCount += 1;

    await appointment.save();

    if (previousStatus === 'ACCEPTED' && previousSlotId) {
      await AvailabilitySlot.findByIdAndUpdate(previousSlotId, { $set: { isBooked: false } });
    }

    const tenant = await getUserSafe(req.user.id);
    const windowText = formatAppointmentWindow(appointment.startTime, appointment.endTime);

    await createNotification({
      userId: appointment.landlordId?._id || appointment.landlordId,
      actorId: req.user.id,
      type: 'APPOINTMENT_RESCHEDULED',
      title: 'Viewing reschedule requested',
      body: `${tenant?.name || 'A tenant'} requested a new time for ${
        appointment.listingId?.title || 'a listing'
      } on ${windowText}.`,
      link: '/landlord/appointments',
      metadata: { appointmentId: appointment._id },
    });

    if (appointment.landlordId?.email) {
      await sendMail({
        to: appointment.landlordId.email,
        subject: `Reschedule request: ${appointment.listingId?.title || 'Listing'}`,
        html: buildAppointmentEmail({
          recipientName: appointment.landlordId.name,
          heading: `${tenant?.name || 'A tenant'} requested a new viewing time.`,
          listingTitle: appointment.listingId?.title || 'Listing',
          windowText,
          otherPartyLabel: 'Tenant',
          otherPartyName: tenant?.name || 'Tenant',
          linkPath: '/landlord/appointments',
        }),
      });
    }

    return res.json({ appointment });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: 'Slot already has an active request.' });
    }
    console.error(err);
    return res.status(500).json({ message: 'Failed to reschedule appointment.' });
  }
};

exports.acceptAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) {
      return res.status(400).json({ message: 'Invalid appointment id.' });
    }

    const appointment = await Appointment.findOne({ _id: id, landlordId: req.user.id })
      .populate('listingId', 'title')
      .populate('tenantId', 'name email');
    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found.' });
    }

    if (appointment.status === 'ACCEPTED') {
      const slot = await AvailabilitySlot.findById(appointment.slotId);
      if (slot && !slot.isBooked) {
        slot.isBooked = true;
        await slot.save();
      }
      return res.json({ appointment });
    }
    if (appointment.status !== 'REQUESTED') {
      return res.status(400).json({ message: 'Only requested appointments can be accepted.' });
    }

    appointment.status = 'ACCEPTED';
    await appointment.save();

    const slot = await AvailabilitySlot.findById(appointment.slotId);
    if (slot && !slot.isBooked) {
      slot.isBooked = true;
      await slot.save();
    }

    const windowText = formatAppointmentWindow(appointment.startTime, appointment.endTime);

    await createNotification({
      userId: appointment.tenantId?._id || appointment.tenantId,
      actorId: req.user.id,
      type: 'APPOINTMENT_ACCEPTED',
      title: 'Viewing confirmed',
      body: `Your viewing for ${appointment.listingId?.title || 'a listing'} is confirmed on ${windowText}.`,
      link: '/tenant/appointments',
      metadata: { appointmentId: appointment._id },
    });

    const landlord = await getUserSafe(req.user.id);
    if (appointment.tenantId?.email) {
      await sendMail({
        to: appointment.tenantId.email,
        subject: `Viewing confirmed: ${appointment.listingId?.title || 'Listing'}`,
        html: buildAppointmentEmail({
          recipientName: appointment.tenantId.name,
          heading: 'Your viewing request has been accepted.',
          listingTitle: appointment.listingId?.title || 'Listing',
          windowText,
          otherPartyLabel: 'Landlord',
          otherPartyName: landlord?.name || 'Landlord',
          linkPath: '/tenant/appointments',
        }),
      });
    }

    return res.json({ appointment });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Failed to accept appointment.' });
  }
};

exports.rejectAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) {
      return res.status(400).json({ message: 'Invalid appointment id.' });
    }

    const appointment = await Appointment.findOne({ _id: id, landlordId: req.user.id })
      .populate('listingId', 'title')
      .populate('tenantId', 'name email');
    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found.' });
    }

    if (appointment.status === 'REJECTED') {
      const slot = await AvailabilitySlot.findById(appointment.slotId);
      if (slot && slot.isBooked) {
        slot.isBooked = false;
        await slot.save();
      }
      return res.json({ appointment });
    }
    if (appointment.status !== 'REQUESTED') {
      return res.status(400).json({ message: 'Only requested appointments can be rejected.' });
    }

    appointment.status = 'REJECTED';
    await appointment.save();

    const slot = await AvailabilitySlot.findById(appointment.slotId);
    if (slot && slot.isBooked) {
      slot.isBooked = false;
      await slot.save();
    }

    const windowText = formatAppointmentWindow(appointment.startTime, appointment.endTime);

    await createNotification({
      userId: appointment.tenantId?._id || appointment.tenantId,
      actorId: req.user.id,
      type: 'APPOINTMENT_REJECTED',
      title: 'Viewing request rejected',
      body: `Your request for ${appointment.listingId?.title || 'a listing'} on ${windowText} was rejected.`,
      link: '/tenant/appointments',
      metadata: { appointmentId: appointment._id },
    });

    const landlord = await getUserSafe(req.user.id);
    if (appointment.tenantId?.email) {
      await sendMail({
        to: appointment.tenantId.email,
        subject: `Viewing request update: ${appointment.listingId?.title || 'Listing'}`,
        html: buildAppointmentEmail({
          recipientName: appointment.tenantId.name,
          heading: 'Your viewing request was rejected.',
          listingTitle: appointment.listingId?.title || 'Listing',
          windowText,
          otherPartyLabel: 'Landlord',
          otherPartyName: landlord?.name || 'Landlord',
          linkPath: '/tenant/appointments',
          note: 'You can request a new slot when one becomes available.',
        }),
      });
    }

    return res.json({ appointment });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Failed to reject appointment.' });
  }
};

exports.getLandlordAppointments = async (req, res) => {
  try {
    const appointments = await Appointment.find({ landlordId: req.user.id })
      .populate('listingId', 'title photos')
      .populate('tenantId', 'name email avatarUrl')
      .sort({ startTime: 1 })
      .lean();

    const sorted = sortByStatusThenTime(appointments);
    return res.json({ appointments: sorted });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Failed to load appointments.' });
  }
};

exports.getTenantAppointments = async (req, res) => {
  try {
    const appointments = await Appointment.find({ tenantId: req.user.id })
      .populate('listingId', 'title photos')
      .populate('landlordId', 'name email avatarUrl')
      .sort({ startTime: 1 })
      .lean();

    const sorted = sortByStatusThenTime(appointments);
    return res.json({ appointments: sorted });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Failed to load appointments.' });
  }
};

exports.getLandlordUpcomingCount = async (req, res) => {
  try {
    const now = new Date();
    const count = await Appointment.countDocuments({
      landlordId: req.user.id,
      status: { $in: ['REQUESTED', 'ACCEPTED'] },
      startTime: { $gte: now },
    });
    return res.json({ count });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Failed to load upcoming count.' });
  }
};
