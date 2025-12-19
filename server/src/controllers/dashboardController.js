const Listing = require('../models/Listing');
const SavedFilter = require('../models/SavedFilter');

exports.getTenantDashboard = async (req, res) => {
  try {
    const savedFilters = await SavedFilter.find({ tenant: req.user.id }).sort({ updatedAt: -1 });
    return res.json({
      upcomingViewings: 0,
      savedFilters,
      savedSearches: savedFilters,
      messages: 0,
      tickets: 0,
      appointments: [],
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
    const upcomingViewings = 2;
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
    const appointments = [
      { tenant: 'Alice', listing: 'Downtown Apt', when: 'Oct 27, 11:00 AM', status: 'Confirmed' },
      { tenant: 'Bob', listing: 'Suburban House', when: 'Oct 29, 3:00 PM', status: 'Requested' },
    ];
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
