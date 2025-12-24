const mongoose = require('mongoose');
const AvailabilitySlot = require('../models/AvailabilitySlot');
const Listing = require('../models/Listing');
const Appointment = require('../models/Appointment');

const isValidId = (value) => mongoose.Types.ObjectId.isValid(value);

const parseDateTime = (date, time) => {
  if (!date || !time) return null;
  const parsed = new Date(`${date}T${time}:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

exports.createAvailability = async (req, res) => {
  try {
    const { listingId, date, startTime, endTime, slotCount } = req.body || {};
    if (!listingId || !isValidId(listingId)) {
      return res.status(400).json({ message: 'Valid listingId is required.' });
    }
    if (!date) {
      return res.status(400).json({ message: 'Date is required.' });
    }
    const start = parseDateTime(date, startTime);
    const end = parseDateTime(date, endTime);
    if (!start || !end) {
      return res.status(400).json({ message: 'Start and end time must be valid.' });
    }
    if (end <= start) {
      return res.status(400).json({ message: 'End time must be after start time.' });
    }

    const count = Number.parseInt(slotCount, 10);
    if (!Number.isFinite(count) || count <= 0) {
      return res.status(400).json({ message: 'slotCount must be a positive number.' });
    }

    const listing = await Listing.findById(listingId);
    if (!listing) {
      return res.status(404).json({ message: 'Listing not found.' });
    }
    if (String(listing.owner) !== req.user.id) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const overlap = await AvailabilitySlot.findOne({
      listingId,
      date,
      startTime: { $lt: end },
      endTime: { $gt: start },
    });
    if (overlap) {
      return res.status(409).json({ message: 'Availability already exists in this time window.' });
    }

    const totalDuration = end.getTime() - start.getTime();
    const slotDuration = totalDuration / count;
    if (!Number.isFinite(slotDuration) || slotDuration <= 0) {
      return res.status(400).json({ message: 'Invalid slot duration.' });
    }

    const slots = Array.from({ length: count }, (_value, index) => {
      const slotStart = new Date(start.getTime() + slotDuration * index);
      const slotEnd = new Date(start.getTime() + slotDuration * (index + 1));
      return {
        listingId,
        landlordId: listing.owner,
        date,
        startTime: slotStart,
        endTime: slotEnd,
      };
    });

    const created = await AvailabilitySlot.insertMany(slots);
    return res.status(201).json({ slots: created });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Failed to create availability slots.' });
  }
};

exports.getAvailability = async (req, res) => {
  try {
    const { listingId } = req.params;
    const { date } = req.query;

    if (!listingId || !isValidId(listingId)) {
      return res.status(400).json({ message: 'Valid listingId is required.' });
    }
    if (!date) {
      return res.status(400).json({ message: 'date query parameter is required.' });
    }

    const slots = await AvailabilitySlot.find({ listingId, date }).sort({ startTime: 1 });
    if (!slots.length) {
      return res.json({ slots: [] });
    }

    const now = new Date();
    const slotIds = slots.map((slot) => slot._id);
    const activeAppointments = await Appointment.find({
      slotId: { $in: slotIds },
      status: { $in: ['REQUESTED', 'ACCEPTED'] },
    }).select('slotId');
    const reserved = new Set(activeAppointments.map((appt) => String(appt.slotId)));

    const available = slots.filter(
      (slot) => slot.startTime >= now && !slot.isBooked && !reserved.has(String(slot._id))
    );

    return res.json({ slots: available });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Failed to load availability.' });
  }
};
