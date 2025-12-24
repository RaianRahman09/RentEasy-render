const Listing = require('../models/Listing');
const SavedFilter = require('../models/SavedFilter');
const Appointment = require('../models/Appointment');
const { formatAppointmentWindow } = require('../utils/appointmentEmail');

exports.getTenantDashboard = async (req, res) => {
  try {
    const savedFilters = await SavedFilter.find({ tenant: req.user.id }).sort({ updatedAt: -1 });
    const now = new Date();
    const upcomingCount = await Appointment.countDocuments({
      tenantId: req.user.id,
      status: { $in: ['REQUESTED', 'ACCEPTED'] },
      startTime: { $gte: now },
    });
    const upcomingAppointments = await Appointment.find({
      tenantId: req.user.id,
      status: { $in: ['REQUESTED', 'ACCEPTED'] },
      startTime: { $gte: now },
    })
      .populate('listingId', 'title')
      .sort({ startTime: 1 })
      .limit(3)
      .lean();
    return res.json({
      upcomingViewings: upcomingCount,
      savedFilters,
      savedSearches: savedFilters,
      messages: 0,
      tickets: 0,
      appointments: upcomingAppointments.map((appointment) => ({
        listing: appointment.listingId?.title || 'Listing',
        date: formatAppointmentWindow(appointment.startTime, appointment.endTime),
        status: appointment.status,
      })),
      recentMessages: [],
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Failed to load dashboard' });
  }
};

exports.getLandlordDashboard = async (req, res) => {
  try {
    const listings = await Listing.find({ owner: req.user.id });
    const activeCount = listings.filter((l) => l.status === 'active').length;
    const now = new Date();
    const upcomingViewings = await Appointment.countDocuments({
      landlordId: req.user.id,
      status: { $in: ['REQUESTED', 'ACCEPTED'] },
      startTime: { $gte: now },
    });
    const upcomingAppointments = await Appointment.find({
      landlordId: req.user.id,
      status: { $in: ['REQUESTED', 'ACCEPTED'] },
      startTime: { $gte: now },
    })
      .populate('listingId', 'title')
      .populate('tenantId', 'name')
      .sort({ startTime: 1 })
      .limit(3)
      .lean();
    const pendingTickets = 1;
    const earnings = { thisMonth: 1500, allTime: 4500 };
    const snapshot = listings.slice(0, 3).map((l) => ({
      title: l.title,
      rent: l.rent,
      location: l.address,
      status: l.status,
      views: 100,
      bookings: 2,
    }));
    const appointments = upcomingAppointments.map((appointment) => ({
      tenant: appointment.tenantId?.name || 'Tenant',
      listing: appointment.listingId?.title || 'Listing',
      when: formatAppointmentWindow(appointment.startTime, appointment.endTime),
      status: appointment.status,
    }));
    const tickets = [{ subject: 'Listing question', status: 'open' }];
    const messages = [{ with: 'Tenant A', snippet: 'Can I schedule a viewing?' }];
    return res.json({
      activeCount,
      upcomingViewings,
      pendingTickets,
      earnings,
      snapshot,
      appointments,
      tickets,
      messages,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Failed to load dashboard' });
  }
};

exports.getAdminDashboard = async (_req, res) => {
  return res.json({
    verificationRequests: [
      { id: 'T-12345', name: 'John Doe', submitted: 'today' },
      { id: 'L-67890', name: 'Jane Smith', submitted: 'yesterday' },
    ],
    supportTickets: [
      { id: 987, subject: 'Payment issue', status: 'open' },
      { id: 986, subject: 'Listing bug', status: 'in progress' },
    ],
    stats: { totalUsers: 1250, activeListings: 450, activeBookings: 75 },
  });
};
